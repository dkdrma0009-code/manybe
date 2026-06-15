import { Text } from '@/components/Text';
import React, { useEffect, useState } from 'react';
import {
  View, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, TextInput, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AdvertiserRootStackParamList } from '../../navigation/AdvertiserNavigator';
import { supabase } from '../../api/supabase';
import { colors } from '../../constants/colors';
import { tokens } from '../../constants/tokens';
import { formatCountKo as formatCount } from '../../utils/formatters';

type Nav = NativeStackNavigationProp<AdvertiserRootStackParamList>;

interface Channel {
  platform: string;
  subscriber_count: number | null;
  channel_name: string | null;
  handle: string | null;
}

interface CreatorProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  media_kit_slug: string | null;
  social_channels: Channel[];
}

const PLATFORMS = ['전체', 'YouTube', 'Instagram', 'TikTok'] as const;
type PlatformFilter = (typeof PLATFORMS)[number];

const SUB_RANGES = [
  { label: '전체', min: 0, max: Infinity },
  { label: '~1만', min: 0, max: 10000 },
  { label: '1만~10만', min: 10000, max: 100000 },
  { label: '10만+', min: 100000, max: Infinity },
] as const;
type SubRange = (typeof SUB_RANGES)[number];

const PLATFORM_KEY: Record<PlatformFilter, string | null> = {
  '전체': null,
  'YouTube': 'youtube',
  'Instagram': 'instagram',
  'TikTok': 'tiktok',
};

export default function DiscoverCreatorsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const [creators, setCreators] = useState<CreatorProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [platform, setPlatform] = useState<PlatformFilter>('전체');
  const [subRange, setSubRange] = useState<SubRange>(SUB_RANGES[0]);

  useEffect(() => {
    supabase
      .from('profiles')
      .select('id, full_name, avatar_url, media_kits(slug), social_channels(platform, subscriber_count, channel_name, handle)')
      .eq('role', 'creator')
      .order('created_at', { ascending: false })
      .limit(100)
      .then(({ data }) => {
        const mapped = (data ?? []).map((c: Record<string, unknown>) => ({
          ...c,
          media_kit_slug: (c.media_kits as { slug: string }[] | null)?.[0]?.slug ?? null,
        }));
        setCreators(mapped as unknown as CreatorProfile[]);
        setLoading(false);
      }, () => setLoading(false));
  }, []);

  const filtered = creators.filter((c) => {
    if (query.trim() && !(c.full_name ?? '').toLowerCase().includes(query.toLowerCase())) return false;

    const platformKey = PLATFORM_KEY[platform];
    const channels = c.social_channels ?? [];

    if (platformKey) {
      const ch = channels.find((ch) => ch.platform === platformKey);
      if (!ch) return false;
      if (subRange.max !== Infinity || subRange.min > 0) {
        const sub = ch.subscriber_count ?? 0;
        if (sub < subRange.min || sub >= subRange.max) return false;
      }
    } else if (subRange.min > 0 || subRange.max !== Infinity) {
      const maxSub = Math.max(...channels.map((ch) => ch.subscriber_count ?? 0), 0);
      if (maxSub < subRange.min || maxSub >= subRange.max) return false;
    }

    return true;
  });

  function getPrimaryChannel(c: CreatorProfile): Channel | null {
    const chs = c.social_channels ?? [];
    const platformKey = PLATFORM_KEY[platform];
    if (platformKey) return chs.find((ch) => ch.platform === platformKey) ?? null;
    return chs.sort((a, b) => (b.subscriber_count ?? 0) - (a.subscriber_count ?? 0))[0] ?? null;
  }

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={s.title}>크리에이터 탐색</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={s.searchWrap}>
        <TextInput
          style={s.search}
          placeholder="이름으로 검색..."
          placeholderTextColor={colors.textTertiary}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
        />
      </View>

      {/* 플랫폼 필터 */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.filterRow}
      >
        {PLATFORMS.map((p) => (
          <TouchableOpacity
            key={p}
            style={[s.chip, platform === p && s.chipActive]}
            onPress={() => setPlatform(p)}
            activeOpacity={0.75}
          >
            <Text style={[s.chipText, platform === p && s.chipTextActive]}>{p}</Text>
          </TouchableOpacity>
        ))}
        <View style={s.filterDivider} />
        {SUB_RANGES.map((r) => (
          <TouchableOpacity
            key={r.label}
            style={[s.chip, subRange.label === r.label && s.chipActive]}
            onPress={() => setSubRange(r)}
            activeOpacity={0.75}
          >
            <Text style={[s.chipText, subRange.label === r.label && s.chipTextActive]}>{r.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={s.list}
          ListEmptyComponent={
            <View style={s.empty}>
              <Text style={s.emptyText}>조건에 맞는 크리에이터가 없습니다</Text>
            </View>
          }
          renderItem={({ item }) => {
            const ch = getPrimaryChannel(item);
            return (
              <TouchableOpacity
                style={s.card}
                activeOpacity={0.85}
                onPress={() => navigation.navigate('CreatorProfile', { creatorId: item.id })}
              >
                <View style={s.avatar}>
                  <Text style={s.avatarText}>
                    {(item.full_name ?? '?').charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={s.cardInfo}>
                  <Text style={s.cardName}>{item.full_name ?? '이름 없음'}</Text>
                  {ch ? (
                    <Text style={s.cardSub}>
                      {ch.platform === 'youtube' ? 'YouTube' : ch.platform === 'instagram' ? 'Instagram' : 'TikTok'}
                      {ch.subscriber_count != null ? ` · ${formatCount(ch.subscriber_count)}명` : ''}
                    </Text>
                  ) : (
                    <Text style={s.cardSub}>채널 미연결</Text>
                  )}
                </View>
                <Text style={s.arrow}>›</Text>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backBtn:  { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: 28, color: colors.text, lineHeight: 32 },
  title:    { fontSize: 18, fontWeight: '700', color: colors.text },
  searchWrap: { paddingHorizontal: 20, marginBottom: 10 },
  search: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    height: 44,
    paddingHorizontal: 14,
    fontSize: 15,
    color: colors.text,
  },
  filterRow: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 8,
    alignItems: 'center',
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: tokens.action,
    borderColor: tokens.action,
  },
  chipText:       { fontSize: 13, color: colors.textSecondary, fontWeight: '500' },
  chipTextActive: { color: '#fff' },
  filterDivider: {
    width: 1,
    height: 20,
    backgroundColor: colors.border,
    marginHorizontal: 4,
  },
  list: { paddingHorizontal: 20, paddingBottom: 32, gap: 10 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    gap: 12,
  },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: tokens.actionSoft,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 18, fontWeight: '700', color: tokens.action },
  cardInfo:   { flex: 1 },
  cardName:   { fontSize: 15, fontWeight: '600', color: colors.text, marginBottom: 2 },
  cardSub:    { fontSize: 12, color: colors.textSecondary },
  arrow:      { fontSize: 20, color: colors.textTertiary },
  empty:      { alignItems: 'center', paddingTop: 60 },
  emptyText:  { fontSize: 15, color: colors.textSecondary },
});
