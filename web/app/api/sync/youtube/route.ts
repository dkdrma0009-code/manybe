import { createClient } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
import { computeBadges } from '@/lib/badges';

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('creator_profiles')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

  const { data: channels } = await supabase
    .from('creator_channels')
    .select('*')
    .eq('creator_id', profile.id);

  if (!channels?.length) return NextResponse.json({ error: 'No channels' }, { status: 404 });

  const badges = computeBadges(channels.map(ch => ({
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

  return NextResponse.json({ badges });
}
