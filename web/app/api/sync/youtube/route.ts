import { createClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { computeBadges } from '@/lib/badges';

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: channels } = await supabase
    .from('social_channels')
    .select('platform, subscriber_count, avg_views, engagement_rate, subscriber_history')
    .eq('user_id', user.id);

  if (!channels?.length) return NextResponse.json({ error: 'No channels' }, { status: 404 });

  const badges = computeBadges(channels.map(ch => ({
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

  return NextResponse.json({ badges });
}
