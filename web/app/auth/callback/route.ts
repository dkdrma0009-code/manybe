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
    platform_channel_id: ch.id as string,
    channel_name: (ch.snippet?.title ?? null) as string | null,
    profile_image_url: (ch.snippet?.thumbnails?.default?.url ?? null) as string | null,
    subscriber_count: parseInt(ch.statistics?.subscriberCount ?? '0', 10) || null,
    avg_views: null as null,
    engagement_rate: null as null,
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
        display_name: (user.user_metadata?.full_name as string)
          ?? (user.user_metadata?.name as string)
          ?? user.email?.split('@')[0]
          ?? null,
        avatar_url: (user.user_metadata?.avatar_url as string) ?? null,
      }, { onConflict: 'id' });

      const { data: existingProfile } = await supabase
        .from('creator_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!existingProfile) {
        const handle = (user.email?.split('@')[0] ?? user.id.slice(0, 8))
          .toLowerCase().replace(/[^a-z0-9]/g, '');
        await supabase.from('creator_profiles').insert({
          user_id: user.id,
          handle,
          media_kit_enabled: false,
        });
      }

      if (session.provider_token) {
        const ytData = await fetchYouTubeChannel(session.provider_token);
        if (ytData) {
          const { data: profile } = await supabase
            .from('creator_profiles')
            .select('id')
            .eq('user_id', user.id)
            .single();

          if (profile) {
            const { data: existing } = await supabase
              .from('creator_channels')
              .select('subscriber_history, subscriber_count, avg_views, views_history')
              .eq('creator_id', profile.id)
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
            const avgViews = total30 > 0 ? Math.round(total30 / 4) : ytData.avg_views;

            const safeSubscriberCount =
              ytData.subscriber_count ?? (existing?.subscriber_count as number | null) ?? null;
            const safeAvgViews =
              avgViews ?? (existing as any)?.avg_views ?? null;

            await supabase
              .from('creator_channels')
              .upsert({
                creator_id: profile.id,
                platform: 'youtube',
                ...ytData,
                subscriber_count: safeSubscriberCount,
                avg_views: safeAvgViews,
                subscriber_history: history,
                views_history: viewsHistory.length > 0 ? viewsHistory : undefined,
                last_synced_at: new Date().toISOString(),
              }, { onConflict: 'creator_id,platform' });

            const { data: allChannels } = await supabase
              .from('creator_channels')
              .select('platform, subscriber_count, avg_views, engagement_rate, subscriber_history')
              .eq('creator_id', profile.id);

            if (allChannels) {
              const badges = computeBadges(allChannels.map(ch => ({
                platform: ch.platform,
                subscriber_count: ch.subscriber_count,
                avg_views: ch.avg_views,
                engagement_rate: ch.engagement_rate ? Number(ch.engagement_rate) : null,
                subscriber_history: ch.subscriber_history as Array<{ date: string; count: number }> | null,
              })));

              await supabase
                .from('creator_profiles')
                .update({ badge_data: badges })
                .eq('id', profile.id);
            }
          }
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/creator/login?error=auth`);
}
