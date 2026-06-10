import { createClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { computeBadges } from '@/lib/badges';

async function fetchYouTubeAnalytics(accessToken: string): Promise<Array<{ date: string; views: number }>> {
  const endDate = new Date().toISOString().slice(0, 10);
  const start = new Date(); start.setDate(start.getDate() - 29);
  const startDate = start.toISOString().slice(0, 10);
  const res = await fetch(
    `https://youtubeanalytics.googleapis.com/v2/reports?ids=channel==MINE&startDate=${startDate}&endDate=${endDate}&metrics=views&dimensions=day&sort=day`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) return [];
  const data = await res.json();
  return (data.rows ?? []).map(([date, views]: [string, number]) => ({ date, views }));
}

async function fetchYouTubeChannel(accessToken: string) {
  const res = await fetch(
    'https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&mine=true',
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) return null;
  const data = await res.json();
  const ch = data.items?.[0];
  if (!ch) return null;
  return {
    channel_id: ch.id as string,
    channel_name: (ch.snippet?.title ?? null) as string | null,
    channel_url: `https://www.youtube.com/channel/${ch.id}`,
    handle: (ch.snippet?.customUrl ?? null) as string | null,
    profile_image_url: (ch.snippet?.thumbnails?.default?.url ?? null) as string | null,
    subscriber_count: parseInt(ch.statistics?.subscriberCount ?? '0', 10) || 0,
    view_count: parseInt(ch.statistics?.viewCount ?? '0', 10) || 0,
    video_count: parseInt(ch.statistics?.videoCount ?? '0', 10) || 0,
  };
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/creator/dashboard';

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.session) {
      const { user, session } = data;

      await supabase.from('profiles').upsert({
        id: user.id,
        role: (user.user_metadata?.role as string) ?? 'creator',
        full_name: (user.user_metadata?.full_name as string)
          ?? (user.user_metadata?.name as string)
          ?? user.email?.split('@')[0]
          ?? null,
      }, { onConflict: 'id' });

      // 미디어킷이 없으면 기본 슬러그로 생성 (모바일 MediaKitSlugScreen에서 변경 가능)
      const { data: existingKit } = await supabase
        .from('media_kits')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!existingKit) {
        const slug = (user.email?.split('@')[0] ?? user.id.slice(0, 8))
          .toLowerCase().replace(/[^a-z0-9]/g, '');
        const { error: kitErr } = await supabase.from('media_kits').insert({
          user_id: user.id,
          slug,
        });
        if (kitErr) {
          // 슬러그 충돌 시 사용자 ID 일부를 붙여 재시도
          await supabase.from('media_kits').insert({
            user_id: user.id,
            slug: `${slug}-${user.id.slice(0, 4)}`,
          });
        }
      }

      if (session.provider_token) {
        const ytData = await fetchYouTubeChannel(session.provider_token);
        if (ytData) {
          const { data: existing } = await supabase
            .from('social_channels')
            .select('subscriber_history, subscriber_count, avg_views, views_history')
            .eq('user_id', user.id)
            .eq('platform', 'youtube')
            .single();

          const today = new Date().toISOString().slice(0, 10);
          const history: Array<{ date: string; count: number }> =
            (existing?.subscriber_history as Array<{ date: string; count: number }>) ?? [];

          const alreadyToday = history.some(h => h.date === today);
          if (!alreadyToday && ytData.subscriber_count) {
            history.push({ date: today, count: ytData.subscriber_count });
            history.sort((a, b) => a.date.localeCompare(b.date));
            if (history.length > 180) history.splice(0, history.length - 180);
          }

          const analyticsRows = await fetchYouTubeAnalytics(session.provider_token);
          let viewsHistory: Array<{ date: string; views: number }> = [];
          if (analyticsRows.length > 0) {
            const existingViews =
              (existing?.views_history as Array<{ date: string; views: number }>) ?? [];
            const merged = new Map<string, number>();
            for (const r of existingViews) merged.set(r.date, r.views);
            for (const r of analyticsRows) merged.set(r.date, r.views);
            viewsHistory = [...merged.entries()]
              .map(([date, views]) => ({ date, views }))
              .sort((a, b) => a.date.localeCompare(b.date))
              .slice(-90);
          }

          const total30 = analyticsRows.reduce((s, r) => s + r.views, 0);
          const avgViews = total30 > 0 ? Math.round(total30 / 4) : null;

          const safeSubscriberCount =
            ytData.subscriber_count || (existing?.subscriber_count as number | null) || 0;
          const safeAvgViews =
            avgViews ?? (existing?.avg_views as number | null) ?? null;

          await supabase
            .from('social_channels')
            .upsert({
              user_id: user.id,
              platform: 'youtube',
              ...ytData,
              subscriber_count: safeSubscriberCount,
              avg_views: safeAvgViews,
              subscriber_history: history,
              views_history: viewsHistory.length > 0 ? viewsHistory : undefined,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'user_id,platform' });

          const { data: allChannels } = await supabase
            .from('social_channels')
            .select('platform, subscriber_count, avg_views, engagement_rate, subscriber_history')
            .eq('user_id', user.id);

          if (allChannels) {
            const badges = computeBadges(allChannels.map(ch => ({
              platform: ch.platform,
              subscriber_count: ch.subscriber_count,
              avg_views: ch.avg_views,
              engagement_rate: ch.engagement_rate ? Number(ch.engagement_rate) : null,
              subscriber_history: ch.subscriber_history as Array<{ date: string; count: number }> | null,
            })));

            await supabase
              .from('media_kits')
              .update({ badge_data: badges })
              .eq('user_id', user.id);
          }
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/creator/login?error=auth`);
}
