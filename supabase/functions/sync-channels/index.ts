// Supabase Edge Function: sync-channels (batch)
// 주기 배치(pg_cron이 매일 호출). 두 가지를 수행한다:
//   1) 만료 임박 토큰 갱신 (YouTube: refresh_token, Instagram: ig_refresh_token)
//   2) 유효 토큰/공개 API로 채널 지표(팔로워·조회수·영상수) 재동기화
// 실패한 채널은 social_channels.needs_reauth = true 로 표시.
//
// Secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY(auto), WEBHOOK_SECRET,
//          GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, YOUTUBE_API_KEY

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);
const WEBHOOK_SECRET = Deno.env.get('WEBHOOK_SECRET') ?? '';
const GOOGLE_CLIENT_ID     = Deno.env.get('GOOGLE_CLIENT_ID') ?? '';
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET') ?? '';
const YOUTUBE_KEY          = Deno.env.get('YOUTUBE_API_KEY') ?? '';

const REFRESH_WINDOW_MS = 7 * 86400 * 1000; // 만료 7일 이내면 갱신

// ── 토큰 갱신 ──────────────────────────────────────────────────────────────
async function refreshYouTube(refreshToken: string): Promise<string | null> {
  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.access_token ?? null;
  } catch { return null; }
}

async function refreshInstagram(token: string): Promise<{ token: string; expiresIn: number } | null> {
  try {
    const res = await fetch(
      `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${token}`,
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.access_token) return null;
    return { token: data.access_token, expiresIn: data.expires_in ?? 60 * 86400 };
  } catch { return null; }
}

// ── 지표 재동기화 ──────────────────────────────────────────────────────────
async function fetchYouTubeStats(channelId: string) {
  if (!YOUTUBE_KEY) return null;
  try {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${channelId}&key=${YOUTUBE_KEY}`,
    );
    if (!res.ok) return null;
    const data = await res.json();
    const s = data.items?.[0]?.statistics;
    if (!s) return null;
    return {
      subscriber_count: parseInt(s.subscriberCount ?? '0', 10) || 0,
      view_count: parseInt(s.viewCount ?? '0', 10) || 0,
      video_count: parseInt(s.videoCount ?? '0', 10) || 0,
    };
  } catch { return null; }
}

async function fetchInstagramStats(token: string) {
  try {
    const res = await fetch(
      `https://graph.instagram.com/me?fields=followers_count,media_count&access_token=${token}`,
    );
    if (!res.ok) return { authError: res.status === 400 || res.status === 401, stats: null };
    const data = await res.json();
    if (data.error) return { authError: true, stats: null };
    return {
      authError: false,
      stats: {
        subscriber_count: data.followers_count ?? 0,
        video_count: data.media_count ?? 0,
      },
    };
  } catch { return { authError: false, stats: null }; }
}

Deno.serve(async (req: Request) => {
  if (WEBHOOK_SECRET) {
    if (req.headers.get('x-webhook-secret') !== WEBHOOK_SECRET) {
      return new Response('unauthorized', { status: 401 });
    }
  } else {
    console.warn('WEBHOOK_SECRET not set — skipping auth');
  }

  const now = Date.now();
  const result = { youtube: 0, instagram: 0, refreshed: 0, needsReauth: 0, errors: 0 };

  try {
    const [{ data: channels }, { data: tokens }] = await Promise.all([
      supabase.from('social_channels').select('user_id, platform, channel_id'),
      supabase.from('social_channel_tokens').select('*'),
    ]);

    const tokenMap = new Map<string, Record<string, unknown>>();
    for (const t of tokens ?? []) tokenMap.set(`${t.user_id}:${t.platform}`, t);

    for (const ch of channels ?? []) {
      const tok = tokenMap.get(`${ch.user_id}:${ch.platform}`);

      try {
        if (ch.platform === 'youtube') {
          // 토큰 갱신 (analyze-channel이 쓰는 저장 토큰을 신선하게 유지)
          if (tok?.youtube_refresh_token) {
            const exp = tok.youtube_token_expires_at ? new Date(tok.youtube_token_expires_at as string).getTime() : 0;
            if (exp < now + REFRESH_WINDOW_MS) {
              const newToken = await refreshYouTube(tok.youtube_refresh_token as string);
              if (newToken) {
                await supabase.from('social_channel_tokens').update({
                  youtube_access_token: newToken,
                  youtube_token_expires_at: new Date(now + 3600 * 1000).toISOString(),
                  updated_at: new Date().toISOString(),
                }).eq('user_id', ch.user_id).eq('platform', 'youtube');
                result.refreshed++;
              }
            }
          }
          // 지표 재동기화 (공개 Data API — 토큰 불필요)
          const stats = await fetchYouTubeStats(ch.channel_id);
          if (stats) {
            await supabase.from('social_channels').update({
              ...stats, needs_reauth: false, updated_at: new Date().toISOString(),
            }).eq('user_id', ch.user_id).eq('platform', 'youtube');
            result.youtube++;
          }
        } else if (ch.platform === 'instagram') {
          let igToken = tok?.instagram_access_token as string | undefined;
          if (!igToken) {
            await supabase.from('social_channels').update({ needs_reauth: true })
              .eq('user_id', ch.user_id).eq('platform', 'instagram');
            result.needsReauth++;
            continue;
          }
          // 만료 임박 시 60일 연장
          const exp = tok?.instagram_token_expires_at ? new Date(tok.instagram_token_expires_at as string).getTime() : 0;
          if (exp < now + REFRESH_WINDOW_MS) {
            const refreshed = await refreshInstagram(igToken);
            if (refreshed) {
              igToken = refreshed.token;
              await supabase.from('social_channel_tokens').update({
                instagram_access_token: refreshed.token,
                instagram_token_expires_at: new Date(now + refreshed.expiresIn * 1000).toISOString(),
                updated_at: new Date().toISOString(),
              }).eq('user_id', ch.user_id).eq('platform', 'instagram');
              result.refreshed++;
            }
          }
          // 지표 재동기화
          const { authError, stats } = await fetchInstagramStats(igToken);
          if (stats) {
            await supabase.from('social_channels').update({
              ...stats, needs_reauth: false, updated_at: new Date().toISOString(),
            }).eq('user_id', ch.user_id).eq('platform', 'instagram');
            result.instagram++;
          } else if (authError) {
            await supabase.from('social_channels').update({ needs_reauth: true })
              .eq('user_id', ch.user_id).eq('platform', 'instagram');
            result.needsReauth++;
          }
        }
      } catch (e) {
        console.error(`sync ${ch.platform}/${ch.user_id} failed:`, e);
        result.errors++;
      }
    }

    console.log('sync-channels done:', JSON.stringify(result));
    return new Response(JSON.stringify({ ok: true, ...result }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('sync-channels fatal:', err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
