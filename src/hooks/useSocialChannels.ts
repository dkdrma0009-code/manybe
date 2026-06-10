import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../api/supabase';
import { ENV } from '../config/env';
import { makeLogger } from '../utils/logger';
import { formatCount } from '../utils/formatters';

const log = makeLogger('useSocialChannels');

export interface SocialChannel {
  id: string;
  platform: 'youtube' | 'instagram';
  channel_id: string;
  channel_name: string;
  channel_url: string;
  handle: string | null;
  subscriber_count: number;
  view_count: number;
  video_count: number;
  updated_at: string;
}

const YOUTUBE_API_KEY = ENV.YOUTUBE_API_KEY;

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
  handle: string | null;
  subscriber_count: number;
  view_count: number;
  video_count: number;
} | null> {
  const extracted = extractChannelId(input);

  let apiUrl: string;
  if (extracted.startsWith('@')) {
    const handle = encodeURIComponent(extracted.slice(1));
    apiUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&forHandle=${handle}&key=${YOUTUBE_API_KEY}`;
  } else if (extracted.startsWith('UC')) {
    apiUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${extracted}&key=${YOUTUBE_API_KEY}`;
  } else {
    // 채널명으로 검색
    apiUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(extracted)}&maxResults=1&key=${YOUTUBE_API_KEY}`;
  }

  const res = await fetch(apiUrl);
  const json = await res.json();

  log.debug('fetchYouTubeChannel raw response:', JSON.stringify(json, null, 2));

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

  log.debug('fetchYouTubeChannel raw item:', JSON.stringify(item, null, 2));
  log.debug('fetchYouTubeChannel statistics:', item.statistics);

  const result = {
    channel_id: item.id,
    channel_name: item.snippet.title,
    channel_url: `https://www.youtube.com/channel/${item.id}`,
    handle: item.snippet.customUrl ?? null,
    subscriber_count: parseInt(item.statistics?.subscriberCount ?? '0'),
    view_count: parseInt(item.statistics?.viewCount ?? '0'),
    video_count: parseInt(item.statistics?.videoCount ?? '0'),
  };

  log.debug('fetchYouTubeChannel mapped result:', result);
  return result;
}

export function useSocialChannels(userId: string | undefined) {
  const [channels, setChannels] = useState<SocialChannel[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('social_channels')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    log.debug('fetch result:', { userId, count: data?.length });
    if (error) log.error('fetch error:', error);
    setChannels((data as SocialChannel[]) ?? []);
    setLoading(false);
  }, [userId]);

  useEffect(() => { fetch(); }, [fetch]);

  async function syncChannel(input: string): Promise<string | null> {
    if (!userId) return '로그인이 필요합니다';
    try {
      const info = await fetchYouTubeChannel(input);
      if (!info) return '채널을 찾을 수 없습니다';

      const payload = {
        user_id: userId,
        platform: 'youtube',
        ...info,
        updated_at: new Date().toISOString(),
      };
      log.debug('syncChannel upsert payload:', payload);

      const { error } = await supabase
        .from('social_channels')
        .upsert(payload, { onConflict: 'user_id,platform' });

      if (error) throw error;
      await fetch();
      return null;
    } catch (e: any) {
      return e.message ?? '연동에 실패했습니다';
    }
  }

  async function saveInstagramChannel(handle: string): Promise<string | null> {
    if (!userId) return '로그인이 필요합니다';
    const cleanHandle = handle.replace(/^@/, '').trim();
    if (!cleanHandle) return '핸들을 입력해주세요';
    try {
      const payload = {
        user_id: userId,
        platform: 'instagram',
        channel_id: cleanHandle,
        channel_name: cleanHandle,
        channel_url: `https://instagram.com/${cleanHandle}`,
        handle: cleanHandle,
        subscriber_count: 0,
        view_count: 0,
        video_count: 0,
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase
        .from('social_channels')
        .upsert(payload, { onConflict: 'user_id,platform' });
      if (error) throw error;
      await fetch();
      return null;
    } catch (e: any) {
      return e.message ?? '연동에 실패했습니다';
    }
  }

  return { channels, loading, refetch: fetch, syncChannel, saveInstagramChannel, formatCount };
}
