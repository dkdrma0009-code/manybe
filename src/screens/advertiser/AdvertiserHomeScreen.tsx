import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, TextInput, ScrollView, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AdvertiserRootStackParamList } from '../../navigation/AdvertiserNavigator';
import { supabase } from '../../api/supabase';
import { useAuth } from '../../hooks/useAuth';
import { tokens } from '../../constants/tokens';

type Nav = NativeStackNavigationProp<AdvertiserRootStackParamList>;

interface Channel {
  platform: string;
  subscriber_count: number | null;
  channel_name: string | null;
}

interface Creator {
  id: string;
  full_name: string | null;
  niche: string | null;
  social_channels: Channel[];
  min_price: number | null;
}

const PLATFORM_TABS = ['전체', 'YouTube', 'Instagram', 'TikTok'] as const;
type PlatformTab = (typeof PLATFORM_TABS)[number];
const PLATFORM_KEY: Record<PlatformTab, string | null> = {
  '전체': null, 'YouTube': 'youtube', 'Instagram': 'instagram', 'TikTok': 'tiktok',
};

const PLATFORM_COLOR: Record<string, string> = {
  youtube: '#FF0000', instagram: '#E1306C', tiktok: '#010101',
};
const PLATFORM_LABEL: Record<string, string> = {
  youtube: 'YouTube', instagram: 'Instagram', tiktok: 'TikTok',
};

function formatCount(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}만`;
  if (n >= 1000)  return `${(n / 1000).toFixed(1)}천`;
  return String(n);
}

function getPrimaryChannel(c: Creator, platformKey: string | null): Channel | null {
  const chs = c.social_channels ?? [];
  if (platformKey) return chs.find((ch) => ch.platform === platformKey) ?? null;
  return [...chs].sort((a, b) => (b.subscriber_count ?? 0) - (a.subscriber_count ?? 0))[0] ?? null;
}

export default function AdvertiserHomeScreen() {
  const insets = useSafeAreaInsets();
  const nav = useNavigation<Nav>();
  const { user } = useAuth();

  const [creators, setCreators]     = useState<Creator[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery]           = useState('');
  const [platform, setPlatform]     = useState<PlatformTab>('전체');

  const userName = user?.user_metadata?.full_name ?? '광고주';

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, niche, social_channels(platform, subscriber_count, channel_name)')
      .eq('role', 'creator')
      .order('created_at', { ascending: false })
      .limit(100);

    // fetch min pricing per creator
    const ids = (data ?? []).map((c: any) => c.id);
    const { data: kits } = ids.length
      ? await supabase.from('media_kits').select('user_id, pricing').in('user_id', ids)
      : { data: [] };

    const priceMap: Record<string, number> = {};
    for (const kit of kits ?? []) {
      if (!kit.pricing) continue;
      const prices = Object.values(kit.pricing as Record<string, number>).filter((v) => v > 0);
      if (prices.length) priceMap[kit.user_id] = Math.min(...prices);
    }

    setCreators((data ?? []).map((c: any) => ({ ...c, min_price: priceMap[c.id] ?? null })));
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const platformKey = PLATFORM_KEY[platform];

  const filtered = creators.filter((c) => {
    if (query.trim() && !(c.full_name ?? '').toLowerCase().includes(query.toLowerCase())) return false;
    if (platformKey && !(c.social_channels ?? []).some((ch) => ch.platform === platformKey)) return false;
    return true;
  });

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>

      {/* 헤더 */}
      <View style={s.header}>
        <View>
          <Text style={s.greeting}>안녕하세요, {userName}님 👋</Text>
          <Text style={s.subtitle}>오늘 딱 맞는 크리에이터를 찾아보세요</Text>
        </View>
      </View>

      {/* 검색바 */}
      <View style={s.searchWrap}>
        <Text style={s.searchIcon}>🔍</Text>
        <TextInput
          style={s.searchInput}
          placeholder="크리에이터 이름 검색..."
          placeholderTextColor={tokens.ink4}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          returnKeyType="search"
        />
      </View>

      {/* 플랫폼 탭 */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.tabRow}
      >
        {PLATFORM_TABS.map((p) => (
          <TouchableOpacity
            key={p}
            style={[s.tab, platform === p && s.tabActive]}
            onPress={() => setPlatform(p)}
            activeOpacity={0.75}
          >
            <Text style={[s.tabText, platform === p && s.tabTextActive]}>{p}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* 결과 수 */}
      {!loading && (
        <Text style={s.resultCount}>크리에이터 {filtered.length}명</Text>
      )}

      {loading ? (
        <ActivityIndicator style={{ marginTop: 60 }} color={tokens.action} size="large" />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={s.grid}
          columnWrapperStyle={s.columnWrap}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); load(); }}
              tintColor={tokens.action}
            />
          }
          ListEmptyComponent={
            <View style={s.empty}>
              <Text style={s.emptyIcon}>🔍</Text>
              <Text style={s.emptyTitle}>크리에이터가 없습니다</Text>
              <Text style={s.emptyDesc}>다른 조건으로 검색해보세요</Text>
            </View>
          }
          renderItem={({ item }) => {
            const ch = getPrimaryChannel(item, platformKey);
            const initial = (item.full_name ?? '?').charAt(0).toUpperCase();
            const colorIdx = initial.charCodeAt(0) % 5;
            const avatarColors = ['#E8472A', '#3D5AFE', '#1D8348', '#C48A40', '#8B5CF6'];

            return (
              <TouchableOpacity
                style={s.card}
                activeOpacity={0.88}
                onPress={() => nav.navigate('CreatorProfile', { creatorId: item.id })}
              >
                {/* 아바타 영역 (배민의 가게 사진 역할) */}
                <View style={[s.cardAvatar, { backgroundColor: avatarColors[colorIdx] + '18' }]}>
                  <Text style={[s.cardAvatarText, { color: avatarColors[colorIdx] }]}>{initial}</Text>
                </View>

                <View style={s.cardBody}>
                  <Text style={s.cardName} numberOfLines={1}>{item.full_name ?? '이름 없음'}</Text>

                  {ch ? (
                    <View style={s.cardPlatformRow}>
                      <View style={[s.platformBadge, { backgroundColor: (PLATFORM_COLOR[ch.platform] ?? tokens.action) + '15' }]}>
                        <Text style={[s.platformBadgeText, { color: PLATFORM_COLOR[ch.platform] ?? tokens.action }]}>
                          {PLATFORM_LABEL[ch.platform] ?? ch.platform}
                        </Text>
                      </View>
                    </View>
                  ) : null}

                  {ch?.subscriber_count != null && (
                    <Text style={s.cardSub}>구독자 {formatCount(ch.subscriber_count)}명</Text>
                  )}

                  {item.min_price != null ? (
                    <Text style={s.cardPrice}>최저 {(item.min_price / 10000).toFixed(0)}만원~</Text>
                  ) : (
                    <Text style={[s.cardPrice, { color: tokens.ink4 }]}>단가 문의</Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FAFAFA' },

  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: tokens.borderFaint,
  },
  greeting: { fontSize: 18, fontWeight: '800', color: tokens.ink, letterSpacing: -0.3 },
  subtitle: { fontSize: 13, color: tokens.ink3, marginTop: 2 },

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: tokens.borderFaint,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
  },
  searchIcon:  { fontSize: 16 },
  searchInput: { flex: 1, fontSize: 15, color: tokens.ink, height: 36 },

  tabRow: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: tokens.borderFaint,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: tokens.neutral100,
  },
  tabActive:     { backgroundColor: tokens.action },
  tabText:       { fontSize: 13, fontWeight: '600', color: tokens.ink3 },
  tabTextActive: { color: '#FFFFFF' },

  resultCount: {
    fontSize: 12,
    color: tokens.ink4,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
  },

  grid:       { paddingHorizontal: 12, paddingBottom: 100, paddingTop: 4 },
  columnWrap: { justifyContent: 'space-between', marginBottom: 10 },

  card: {
    width: '48.5%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardAvatar: {
    height: 90,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardAvatarText: { fontSize: 36, fontWeight: '800' },
  cardBody: { padding: 12, gap: 3 },
  cardName: { fontSize: 14, fontWeight: '700', color: tokens.ink },
  cardPlatformRow: { flexDirection: 'row', marginTop: 2 },
  platformBadge: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  platformBadgeText: { fontSize: 10, fontWeight: '700' },
  cardSub:   { fontSize: 12, color: tokens.ink3, marginTop: 2 },
  cardPrice: { fontSize: 12, fontWeight: '700', color: tokens.action, marginTop: 4 },

  empty: { alignItems: 'center', paddingTop: 80, gap: 8 },
  emptyIcon:  { fontSize: 36 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: tokens.ink2 },
  emptyDesc:  { fontSize: 13, color: tokens.ink4 },
});
