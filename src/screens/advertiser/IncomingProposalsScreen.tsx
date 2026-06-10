import { Text } from '@/components/Text';
import React, { useCallback, useEffect, useState } from 'react';
import {
  View, StyleSheet, FlatList, ActivityIndicator,
  TouchableOpacity, RefreshControl, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../../hooks/useAuth';
import { useRealtime } from '../../context/RealtimeContext';
import { supabase } from '../../api/supabase';
import { colors } from '../../constants/colors';
import { tokens } from '../../constants/tokens';
import type { RootStackParamList } from '../../navigation/AppNavigator';

type Nav = NativeStackNavigationProp<RootStackParamList>;

interface IncomingProposal {
  id: string;
  advertiser_id: string;
  brand_name: string;
  message: string;
  amount: number;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  advertiser_name: string | null;
}

const STATUS_LABEL: Record<string, string> = {
  pending:  '검토 대기',
  accepted: '수락됨',
  rejected: '거절됨',
};
const STATUS_COLOR: Record<string, string> = {
  pending:  tokens.amber,
  accepted: tokens.success,
  rejected: tokens.urgent,
};
const STATUS_BG: Record<string, string> = {
  pending:  tokens.amberSoft,
  accepted: tokens.successBg,
  rejected: tokens.urgentBg,
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const d = Math.floor(diff / 86_400_000);
  if (d === 0) return '오늘';
  if (d === 1) return '어제';
  return `${d}일 전`;
}

export default function IncomingProposalsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const { user } = useAuth();
  const { proposalsVersion } = useRealtime();
  const [proposals, setProposals] = useState<IncomingProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchProposals = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from('advertiser_proposals')
        .select('id, advertiser_id, brand_name, message, amount, status, created_at')
        .eq('creator_id', user.id)
        .order('created_at', { ascending: false });

      if (!data) return;

      const advertiserIds = [...new Set(data.map((p) => p.advertiser_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, company_name')
        .in('id', advertiserIds);

      const nameMap: Record<string, string> = {};
      for (const p of profiles ?? []) {
        nameMap[p.id] = p.company_name ?? p.full_name ?? '';
      }

      setProposals(data.map((p) => ({ ...p, advertiser_name: nameMap[p.advertiser_id] ?? null })));
    } catch {
      // 네트워크 오류 시 기존 데이터 유지
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => { fetchProposals(); }, [fetchProposals, proposalsVersion]);

  function handleRespond(proposalId: string, status: 'accepted' | 'rejected') {
    const label = status === 'accepted' ? '수락' : '거절';
    Alert.alert(
      `제안 ${label}`,
      `이 협찬 제안을 ${label}하시겠어요?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: label,
          style: status === 'rejected' ? 'destructive' : 'default',
          onPress: async () => {
            setUpdating(proposalId);
            const { error } = await supabase
              .from('advertiser_proposals')
              .update({ status })
              .eq('id', proposalId);
            if (!error) {
              setProposals((prev) =>
                prev.map((p) => p.id === proposalId ? { ...p, status } : p),
              );
            }
            setUpdating(null);
          },
        },
      ],
    );
  }

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={s.title}>받은 제안</Text>
        <View style={{ width: 36 }} />
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
      ) : (
        <FlatList
          data={proposals}
          keyExtractor={(item) => item.id}
          contentContainerStyle={s.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchProposals(); }}
            />
          }
          ListEmptyComponent={
            <View style={s.empty}>
              <Text style={s.emptyIcon}>📭</Text>
              <Text style={s.emptyText}>아직 받은 제안이 없습니다</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={s.card}>
              <View style={s.cardTop}>
                <View style={[s.statusBadge, { backgroundColor: STATUS_BG[item.status] }]}>
                  <Text style={[s.statusText, { color: STATUS_COLOR[item.status] }]}>
                    {STATUS_LABEL[item.status]}
                  </Text>
                </View>
                <Text style={s.date}>{timeAgo(item.created_at)}</Text>
              </View>

              {item.advertiser_name ? (
                <Text style={s.advertiserName}>{item.advertiser_name}</Text>
              ) : null}
              <Text style={s.brandName}>{item.brand_name}</Text>
              {item.amount > 0 && (
                <Text style={s.amount}>{item.amount.toLocaleString('ko-KR')}원</Text>
              )}
              <Text style={s.message}>{item.message}</Text>

              {item.status === 'pending' && (
                <View style={s.actions}>
                  <TouchableOpacity
                    style={[s.actionBtn, s.rejectBtn]}
                    onPress={() => handleRespond(item.id, 'rejected')}
                    disabled={updating === item.id}
                    activeOpacity={0.8}
                  >
                    <Text style={s.rejectText}>거절</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.actionBtn, s.acceptBtn]}
                    onPress={() => handleRespond(item.id, 'accepted')}
                    disabled={updating === item.id}
                    activeOpacity={0.8}
                  >
                    {updating === item.id
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <Text style={s.acceptText}>수락하기</Text>
                    }
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: 28, color: colors.text, lineHeight: 32 },
  title: { fontSize: 18, fontWeight: '700', color: colors.text },
  list: { paddingHorizontal: 20, paddingBottom: 32, gap: 12, paddingTop: 4 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 6,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  statusBadge: { borderRadius: 6, paddingHorizontal: 10, paddingVertical: 3 },
  statusText: { fontSize: 12, fontWeight: '700' },
  date: { fontSize: 12, color: colors.textTertiary },
  advertiserName: { fontSize: 13, color: colors.textSecondary },
  brandName: { fontSize: 16, fontWeight: '700', color: colors.text },
  amount: { fontSize: 15, fontWeight: '700', color: tokens.action },
  message: { fontSize: 13, color: colors.textSecondary, lineHeight: 20, marginTop: 2 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  actionBtn: {
    flex: 1, height: 46, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  rejectBtn: { borderWidth: 1, borderColor: colors.border },
  acceptBtn: { backgroundColor: tokens.action },
  rejectText: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
  acceptText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  empty: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyIcon: { fontSize: 40 },
  emptyText: { fontSize: 15, color: colors.textSecondary },
});
