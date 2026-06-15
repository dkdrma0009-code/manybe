// Supabase Edge Function: instagram-auth
// Instagram API with Instagram Login — OAuth code를 Instagram 액세스 토큰으로
// 교환하고 계정 정보를 social_channels에 저장한다.
// (Facebook 페이지 연결 불필요 — 크리에이터가 인스타 계정으로 바로 로그인)
//
// Required secrets (set via `supabase secrets set`):
//   INSTAGRAM_APP_ID
//   INSTAGRAM_APP_SECRET
//   SUPABASE_SERVICE_ROLE_KEY (auto-injected)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const APP_ID     = Deno.env.get('INSTAGRAM_APP_ID')!;
const APP_SECRET = Deno.env.get('INSTAGRAM_APP_SECRET')!;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, content-type',
      },
    });
  }

  try {
    const { code, redirectUri, userId } = await req.json();
    if (!code || !redirectUri || !userId) {
      return json({ error: 'code, redirectUri, userId required' }, 400);
    }

    // 1. code → short-lived token (POST form-encoded)
    const form = new URLSearchParams({
      client_id: APP_ID,
      client_secret: APP_SECRET,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri,
      code,
    });
    const tokenRes = await fetch('https://api.instagram.com/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
    });
    const tokenData = await tokenRes.json();
    if (tokenData.error_type || tokenData.error || !tokenData.access_token) {
      return json({ error: tokenData.error_message ?? tokenData.error ?? 'token_exchange_failed' }, 400);
    }
    const shortToken: string = tokenData.access_token;

    // 2. short → long-lived token (60일)
    const longRes = await fetch(
      `https://graph.instagram.com/access_token?grant_type=ig_exchange_token` +
      `&client_secret=${APP_SECRET}&access_token=${shortToken}`,
    );
    const longData = await longRes.json();
    const accessToken: string = longData.access_token ?? shortToken;

    // 3. 계정 정보 조회 (business/creator만 followers_count 노출)
    const detailRes = await fetch(
      `https://graph.instagram.com/me?fields=user_id,username,account_type,followers_count,media_count` +
      `&access_token=${accessToken}`,
    );
    const detail = await detailRes.json();
    if (detail.error) return json({ error: detail.error.message }, 400);

    if (!['BUSINESS', 'MEDIA_CREATOR'].includes(detail.account_type)) {
      return json({ error: 'instagram_personal_account' }, 400);
    }

    // 4. social_channels 저장
    const igId = String(detail.user_id ?? detail.id);
    const { error: dbErr } = await supabase.from('social_channels').upsert({
      user_id: userId,
      platform: 'instagram',
      channel_id: igId,
      channel_name: detail.username,
      channel_url: `https://instagram.com/${detail.username}`,
      handle: detail.username,
      subscriber_count: detail.followers_count ?? 0,
      view_count: 0,
      video_count: detail.media_count ?? 0,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,platform' });

    if (dbErr) return json({ error: dbErr.message }, 500);

    return json({
      username: detail.username,
      followers: detail.followers_count ?? 0,
      accountType: detail.account_type,
    });
  } catch (err) {
    console.error('instagram-auth error:', err);
    return json({ error: String(err) }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
