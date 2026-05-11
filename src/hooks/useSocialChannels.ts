import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../api/supabase';

export interface SocialChannel {
  id: string;
  platform: 'youtube';
  channel_id: string;
  channel_name: string;
  channel_url: string;
  subscriber_count: number;
  view_count: number;
  video_count: number;
  updated_at: string;
}

const YOUTUBE_API_KEY = process.env.EXPO_PUBLIC_YOUTUBE_API_KEY ?? '';

function formatCount(n: number): string {
  if (n >= 100000000) return `${(n / 100000000).toFixed(1)}억`;
  if (n >= 10000) return `${(n / 10000).toFixed(1)}만`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

// 채널 URL 또는 ID에서 채널 ID 추출
function extractChannelId(input: string): string {
  // 이미 채널 ID 형식 (UC로 시작)
  if (/^UC[\w-]{22}$/.test(input.trim())) return input.trim();

  // youtube.com/@handle or youtube.com/channel/UC...
  const channelMatch = input.match(/youtube\.com\/channel\/(UC[\w-]{22})/);
  if (channelMatch) return channelMatch[1];

  // @handle 형태 → 이름으로 검색 필요
  const handleMatch = input.match(/(?:youtube\.com\/)?@([\w.-]+)/);
  if (handleMatch) return `@${handleMatch[1]}`;

  return input.trim();
}

export async function fetchYouTubeChannel(input: string): Promise<{
  channel_id: string;
  channel_name: string;
  channel_url: string;
  subscriber_count: number;
  view_count: number;
  video_count: number;
} | null> {
  const extracted = extractChannelId(input);

  let apiUrl: string;
  if (extracted.startsWith('@')) {
    // handle 검색
    const handle = extracted.slice(1);
    apiUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&forHandle=${handle}&key=${YOUTUBE_API_KEY}`;
  } else if (extracted.startsWith('UC')) {
    apiUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${extracted}&key=${YOUTUBE_API_KEY}`;
  } else {
    // 채널명으로 검색
    apiUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(extracted)}&maxResults=1&key=${YOUTUBE_API_KEY}`;
  }

  const res = await fetch(apiUrl);
  const json = await res.json();

  if (json.error) throw new Error(json.error.message);

  // 검색 결과면 채널 ID로 다시 조회
  if (json.kind === 'youtube#searchListResponse') {
    const item = json.items?.[0];
    if (!item) return null;
    const channelId = item.id.channelId;
    return fetchYouTubeChannel(channelId);
  }

  const item = json.items?.[0];
  if (!item) return null;

  return {
    channel_id: item.id,
    channel_name: item.snippet.title,
    channel_url: `https://www.youtube.com/channel/${item.id}`,
    subscriber_count: parseInt(item.statistics.subscriberCount ?? '0'),
    view_count: parseInt(item.statistics.viewCount ?? '0'),
    video_count: parseInt(item.statistics.videoCount ?? '0'),
  };
}

export function useSocialChannels(userId: string | undefined) {
  const [channels, setChannels] = useState<SocialChannel[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const { data } = await supabase
      .from('social_channels')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    setChannels((data as SocialChannel[]) ?? []);
    setLoading(false);
  }, [userId]);

  useEffect(() => { fetch(); }, [fetch]);

  async function syncChannel(input: string): Promise<string | null> {
    if (!userId) return '로그인이 필요합니다';
    try {
      const info = await fetchYouTubeChannel(input);
      if (!info) return '채널을 찾을 수 없습니다';

      const { error } = await supabase
        .from('social_channels')
        .upsert({
          user_id: userId,
          platform: 'youtube',
          ...info,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id,platform' });

      if (error) throw error;
      await fetch();
      return null;
    } catch (e: any) {
      return e.message ?? '연동에 실패했습니다';
    }
  }

  return { channels, loading, refetch: fetch, syncChannel, formatCount };
}
