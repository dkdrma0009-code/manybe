export interface Badge {
  id: string;
  icon: string;
  label: string;
  color: string;
  platform: string;
}

interface ChannelData {
  platform: string;
  subscriber_count: number | null;
  avg_views: number | null;
  engagement_rate: number | null;
  subscriber_history: Array<{ date: string; count: number }> | null;
}

function subTierBadge(count: number): Badge | null {
  if (count >= 1_000_000) return { id: 'mega',  icon: '🌟', label: '메가 인플루언서',   color: '#F59E0B', platform: 'youtube' };
  if (count >= 100_000)   return { id: 'macro', icon: '💫', label: '매크로 인플루언서', color: '#6366F1', platform: 'youtube' };
  if (count >= 10_000)    return { id: 'micro', icon: '⭐', label: '마이크로 인플루언서', color: '#8B5CF6', platform: 'youtube' };
  if (count >= 1_000)     return { id: 'nano',  icon: '🌱', label: '신진 크리에이터',   color: '#10B981', platform: 'youtube' };
  return null;
}

function trendingBadge(current: number, history: Array<{ date: string; count: number }>): Badge | null {
  if (!history.length || current <= 0) return null;
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - 3);

  const old = history
    .filter(h => new Date(h.date) <= cutoff)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

  if (!old || old.count <= 0) return null;
  const growth = (current - old.count) / old.count;
  if (growth >= 0.2) {
    return { id: 'trending', icon: '📈', label: '떡상중', color: '#EF4444', platform: 'youtube' };
  }
  return null;
}

export function computeBadges(channels: ChannelData[]): Badge[] {
  const badges: Badge[] = [];

  for (const ch of channels) {
    if (ch.platform === 'youtube') {
      const sub = ch.subscriber_count ?? 0;
      const tier = subTierBadge(sub);
      if (tier) badges.push(tier);

      const history = ch.subscriber_history ?? [];
      const trend = trendingBadge(sub, history);
      if (trend) badges.push(trend);

      badges.push({ id: 'verified_yt', icon: '✅', label: 'YouTube 인증', color: '#FF0000', platform: 'youtube' });
    }

    if (ch.platform === 'instagram') {
      const sub = ch.subscriber_count ?? 0;
      if (sub >= 10_000)
        badges.push({ id: 'ig_micro', icon: '📸', label: 'Instagram 인증', color: '#E1306C', platform: 'instagram' });
    }

    if (ch.platform === 'tiktok') {
      badges.push({ id: 'tt_verified', icon: '🎵', label: 'TikTok 인증', color: '#010101', platform: 'tiktok' });
      if ((ch.subscriber_count ?? 0) > 0 && (ch.avg_views ?? 0) > 0) {
        const ratio = (ch.avg_views ?? 0) / (ch.subscriber_count ?? 1);
        if (ratio >= 0.5)
          badges.push({ id: 'viral', icon: '🔥', label: '바이럴 체질', color: '#F97316', platform: 'tiktok' });
      }
    }
  }

  return badges;
}
