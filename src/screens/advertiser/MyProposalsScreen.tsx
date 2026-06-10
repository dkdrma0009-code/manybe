import { Text } from '@/components/Text';
import React, { useCallback, useEffect, useState } from 'react';
import {
  View, StyleSheet, FlatList, ActivityIndicator,
  TouchableOpacity, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AdvertiserRootStackParamList } from '../../navigation/AdvertiserNavigator';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../api/supabase';
import { tokens } from '../../constants/tokens';
import { daysAgo as timeAgo } from '../../utils/formatters';

type Nav = NativeStackNavigationProp<AdvertiserRootStackParamList>;

interface Proposal {
  id: string;
  creator_id: string;
  brand_name: string;
  message: string;
  amount: number;
  status: 'pending' | 'accepted' | 'rejected';
  rejection_reason: string | null;
  created_at: string;
  creator_name: string | null;
}

const STATUS_CFG = {
  pending:  { label: '검토중',  color: tokens.amber,   bg: tokens.amberSoft,    icon: '⏳' },
  accepted: { label: '수락됨',  color: tokens.success, bg: tokens.successBg,    icon: '✅' },
  rejected: { label: '거절됨',  color: tokens.error,   bg: tokens.errorBg,      icon: '✗'  },
} as const;

const STATUS_TABS = ['전체', '검토중', '수락됨', '거절됨'] as const;
type StatusTab = (typeof STATUS_TABS)[number];
const STATUS_TAB_KEY: Record<StatusTab, string | null> = {
  '전체': null, '검토중': 'pending', '수락됨': 'accepted', '거절됨': 'rejected',
};

export default function MyProposalsScreen() {
  const insets    = useSafeAreaInsets();
  const nav       = useNavigation<Nav>();
  const { user }  = useAuth();

  const [proposals, setProposals]   = useState<Proposal[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab]   = useState<StatusTab>('전체');

  const fetchProposals = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('advertiser_proposals')
        .select('id, creator_id, brand_name, message, amount, status, rejection_reason, created_at')
        .eq('advertiser_id', user.id)
        .order('created_at', { ascending: false });

      if (!data) return;

      const creatorIds = [...new Set(data.map((p) => p.creator_id))];
      const { data: profiles } = await supabase
        .from('profiles').select('id, full_name').in('id', creatorIds);

      const nameMap: Record<string, string> = {};
      for (const p of profiles ?? []) nameMap[p.id] = p.full_name ?? '';

      setProposals(data.map((p) => ({ ...p, creator_name: nameMap[p.creator_id] ?? null })));
    } catch { /* 기존 데이터 유지 */ }
    finally { setLoading(false); setRefreshing(false); }
  }, [user]);

  useEffect(() => { fetchProposals(); }, [fetchProposals]);

  const tabKey = STATUS_TAB_KEY[activeTab];
  const filtered = tabKey ? proposals.filter((p) => p.status === tabKey) : proposals;

  // 상태별 카운트
  const counts = { pending: 0, accepted: 0, rejected: 0 };
  for (const p of proposals) counts[p.status]++;

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>

      {/* 헤더 */}
      <View style={s.header}>
        <Text style={s.title}>제안 내역</Text>
        <Text style={s.subtitle}>총 {proposals.length}건</Text>
      </View>

      {/* 상태 요약 카드 */}
      {proposals.length > 0 && (
        <View style={s.summaryRow}>
          {(['pending', 'accepted', 'rejected'] as const).map((k) => {
            const cfg = STATUS_CFG[k];
            return (
              <TouchableOpacity
                key={k}
                style={[s.summaryCard, { backgroundColor: cfg.bg }]}
                onPress={() => setActiveTab(cfg.label as StatusTab)}
                activeOpacity={0.75}
              >
                <Text style={s.summaryIcon}>{cfg.icon}</Text>
                <Text style={[s.summaryCount, { color: cfg.color }]}>{counts[k]}</Text>
                <Text style={[s.summaryLabel, { color: cfg.color }]}>{cfg.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* 탭 필터 */}
      <View style={s.tabBar}>
        {STATUS_TABS.map((t) => (
          <TouchableOpacity
            key={t}
            style={[s.tabItem, activeTab === t && s.tabItemActive]}
            onPress={() => setActiveTab(t)}
            activeOpacity={0.75}
          >
            <Text style={[s.tabItemText, activeTab === t && s.tabItemTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={tokens.action} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={s.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchProposals(); }}
              tintColor={tokens.action}
            />
          }
          ListEmptyComponent={
            <View style={s.empty}>
              <Text style={s.emptyIcon}>📭</Text>
              <Text style={s.emptyTitle}>제안 내역이 없습니다</Text>
              <TouchableOpacity
                style={s.emptyBtn}
                onPress={() => nav.navigate('DiscoverCreators')}
                activeOpacity={0.85}
              >
                <Text style={s.emptyBtnText}>크리에이터 찾아보기</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }) => {
            const cfg = STATUS_CFG[item.status];
            return (
              <View style={s.card}>
                {/* 상단: 상태 + 날짜 */}
                <View style={s.cardTop}>
                  <View style={[s.statusBadge, { backgroundColor: cfg.bg }]}>
                    <Text style={s.statusBadgeIcon}>{cfg.icon}</Text>
                    <Text style={[s.statusBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
                  </View>
                  <Text style={s.date}>{timeAgo(item.created_at)}</Text>
                </View>

                {/* 크리에이터 이름 */}
                <Text style={s.creatorName}>
                  {item.creator_name ? `@ ${item.creator_name}` : '크리에이터'}
                </Text>

                {/* 브랜드명 + 금액 */}
                <View style={s.cardMid}>
                  <Text style={s.brandName}>{item.brand_name}</Text>
                  {item.amount > 0 && (
                    <Text style={s.amount}>{item.amount.toLocaleString('ko-KR')}원</Text>
                  )}
                </View>

                {/* 메시지 미리보기 */}
                <Text style={s.message} numberOfLines={2}>{item.message}</Text>

                {/* 거절 사유 */}
                {item.status === 'rejected' && item.rejection_reason && (
                  <View style={s.rejectionBox}>
                    <Text style={s.rejectionLabel}>거절 사유</Text>
                    <Text style={s.rejectionText}>{item.rejection_reason}</Text>
                  </View>
                )}
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root:     { flex: 1, backgroundColor: '#FAFAFA' },
  header:   { paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#FFFFFF', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: tokens.borderFaint },
  title:    { fontSize: 20, fontWeight: '800', color: tokens.ink },
  subtitle: { fontSize: 12, color: tokens.ink4, marginTop: 2 },

  summaryRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: tokens.borderFaint,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    gap: 2,
  },
  summaryIcon:  { fontSize: 16 },
  summaryCount: { fontSize: 18, fontWeight: '800' },
  summaryLabel: { fontSize: 11, fontWeight: '600' },

  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: tokens.borderFaint,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 11,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive:     { borderBottomColor: tokens.action },
  tabItemText:       { fontSize: 13, fontWeight: '600', color: tokens.ink4 },
  tabItemTextActive: { color: tokens.action },

  list: { paddingHorizontal: 16, paddingBottom: 60, paddingTop: 12, gap: 10 },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusBadgeIcon: { fontSize: 11 },
  statusBadgeText: { fontSize: 12, fontWeight: '700' },
  date:            { fontSize: 12, color: tokens.ink4 },
  creatorName:     { fontSize: 12, color: tokens.ink3, fontWeight: '500' },
  cardMid:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brandName:       { fontSize: 16, fontWeight: '700', color: tokens.ink },
  amount:          { fontSize: 14, fontWeight: '700', color: tokens.action },
  message:         { fontSize: 13, color: tokens.ink3, lineHeight: 19 },

  rejectionBox: {
    backgroundColor: tokens.errorBg,
    borderRadius: 8,
    padding: 10,
    marginTop: 4,
  },
  rejectionLabel: { fontSize: 11, fontWeight: '600', color: tokens.error, marginBottom: 3 },
  rejectionText:  { fontSize: 13, color: tokens.error, lineHeight: 18 },

  empty:      { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyIcon:  { fontSize: 40 },
  emptyTitle: { fontSize: 15, color: tokens.ink3 },
  emptyBtn: {
    backgroundColor: tokens.action,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginTop: 4,
  },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
