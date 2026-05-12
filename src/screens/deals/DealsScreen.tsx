import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth';
import { useDealsData, DisplayStatus, DealItem } from '../../hooks/useDealsData';
import { colors } from '../../constants/colors';
import { parseClipboardText, ParsedDeal } from '../../utils/parseClipboard';
import ClipboardParserModal from './ClipboardParserModal';
import AddDealModal from './AddDealModal';
import { usePlan } from '../../hooks/usePlan';
import FomoBanner from '../../components/FomoBanner';
import DealDetailModal, { DealDetailData } from './DealDetailModal';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/AppNavigator';

// ─── 상태 설정 ──────────────────────────────────────────────

const STATUS_CONFIG: Record<DisplayStatus | '전체', { bg: string; text: string }> = {
  전체:    { bg: colors.primary, text: '#fff' },
  검토중:  { bg: '#F3F4F6',  text: '#4B5563' },
  협상중:  { bg: '#FEF3C7',  text: '#D97706' },
  계약완료:{ bg: '#D1FAE5',  text: '#059669' },
  취소됨:  { bg: '#F3F4F6',  text: '#9CA3AF' },
};

const FILTER_TABS = ['전체', '검토중', '협상중', '계약완료', '취소됨'] as const;
type FilterTab = typeof FILTER_TABS[number];

// ─── 서브 컴포넌트 ──────────────────────────────────────────

function SummaryCard({
  totalAmount,
  inProgressCount,
  pendingSettlementCount,
}: {
  totalAmount: number;
  inProgressCount: number;
  pendingSettlementCount: number;
}) {
  return (
    <View style={summary.card}>
      <View style={summary.row}>
        <View style={summary.item}>
          <Text style={summary.itemValue}>{inProgressCount}건</Text>
          <Text style={summary.itemLabel}>진행 중</Text>
        </View>
        <View style={summary.divider} />
        <View style={summary.item}>
          <Text style={summary.itemValue}>{pendingSettlementCount}건</Text>
          <Text style={summary.itemLabel}>검토 중</Text>
        </View>
        <View style={summary.divider} />
        <View style={[summary.item, { flex: 2 }]}>
          <Text style={[summary.itemValue, summary.amountValue]}>
            {totalAmount.toLocaleString('ko-KR')}원
          </Text>
          <Text style={summary.itemLabel}>총 협찬 금액</Text>
        </View>
      </View>
    </View>
  );
}

const summary = StyleSheet.create({
  card: { backgroundColor: '#F0EFFE', borderRadius: 16, padding: 18, marginBottom: 16 },
  row:  { flexDirection: 'row', alignItems: 'center' },
  item: { flex: 1, alignItems: 'center' },
  divider: { width: 1, height: 36, backgroundColor: 'rgba(108,99,255,0.2)', marginHorizontal: 4 },
  itemValue:  { fontSize: 20, fontWeight: '800', color: '#1A1A2E', marginBottom: 2 },
  amountValue:{ fontSize: 16, color: colors.primary },
  itemLabel:  { fontSize: 11, color: '#7C6FCD' },
});

function StatusBadge({ status }: { status: DisplayStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <View style={[badge.wrapper, { backgroundColor: cfg.bg }]}>
      <Text style={[badge.text, { color: cfg.text }]}>{status}</Text>
    </View>
  );
}

const badge = StyleSheet.create({
  wrapper: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, alignSelf: 'flex-start' },
  text:    { fontSize: 11, fontWeight: '700' },
});

function DealCard({ deal, onPress }: { deal: DealItem; onPress: () => void }) {
  return (
    <TouchableOpacity style={card.wrapper} onPress={onPress} activeOpacity={0.82}>
      <View style={[card.avatar, { backgroundColor: deal.avatarColor }]}>
        <Text style={card.avatarText}>{deal.brand[0]}</Text>
      </View>
      <View style={card.info}>
        <Text style={card.brand}>{deal.brand}</Text>
        <Text style={card.title} numberOfLines={1}>{deal.title}</Text>
        <View style={card.meta}>
          <Text style={card.amount}>{deal.amount.toLocaleString('ko-KR')}원</Text>
          {deal.deadline ? (
            <>
              <Text style={card.dot}>·</Text>
              <Text style={card.deadline}>마감 {deal.deadline}</Text>
            </>
          ) : null}
        </View>
      </View>
      <StatusBadge status={deal.status} />
    </TouchableOpacity>
  );
}

const card = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    gap: 12,
  },
  avatar:     { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18, fontWeight: '800', color: '#fff' },
  info:       { flex: 1, gap: 3 },
  brand:    { fontSize: 15, fontWeight: '700', color: '#1A1A2E' },
  title:    { fontSize: 12, color: '#6B7280' },
  meta:     { flexDirection: 'row', alignItems: 'center', gap: 4 },
  amount:   { fontSize: 13, fontWeight: '700', color: colors.primary },
  dot:      { fontSize: 12, color: '#D1D5DB' },
  deadline: { fontSize: 12, color: '#9CA3AF' },
});

// ─── 메인 화면 ──────────────────────────────────────────────

export default function DealsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user } = useAuth();
  const { data, loading, refetch } = useDealsData(user?.id);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('전체');
  const [parsedDeal, setParsedDeal] = useState<ParsedDeal | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<DealDetailData | null>(null);
  const { isPremium } = usePlan(user?.id);

  async function handleClipboard() {
    const text = await Clipboard.getStringAsync();
    const result = parseClipboardText(text);
    if (!result) {
      Alert.alert('협찬 문의를 찾지 못했습니다', '카카오톡에서 협찬 문의 내용을 복사한 뒤 다시 눌러주세요.');
      return;
    }
    setParsedDeal(result);
  }

  const filtered =
    activeFilter === '전체'
      ? data.deals
      : data.deals.filter((d) => d.status === activeFilter);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* 헤더 */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>협찬 관리</Text>
        </View>
        <View style={styles.headerBtns}>
          <TouchableOpacity style={styles.inboxBtn} onPress={() => navigation.navigate('Inquiries')} activeOpacity={0.85}>
            <Text style={styles.inboxBtnText}>📬 문의함</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.clipBtn} onPress={handleClipboard} activeOpacity={0.85}>
            <Text style={styles.clipBtnText}>📋 붙여넣기</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddModal(true)} activeOpacity={0.85}>
            <Text style={styles.addBtnText}>＋</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} />}
      >
        {/* 요약 카드 */}
        <SummaryCard
          totalAmount={data.totalAmount}
          inProgressCount={data.inProgressCount}
          pendingSettlementCount={data.pendingSettlementCount}
        />

        {/* 상태 필터 탭 */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
          style={styles.filterScroll}
        >
          {FILTER_TABS.map((tab) => {
            const isActive = activeFilter === tab;
            return (
              <TouchableOpacity
                key={tab}
                style={[styles.filterTab, isActive && styles.filterTabActive]}
                onPress={() => setActiveFilter(tab)}
                activeOpacity={0.75}
              >
                <Text style={[styles.filterTabText, isActive && styles.filterTabTextActive]}>
                  {tab}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* 협찬 카드 리스트 */}
        <View style={styles.list}>
          {loading ? (
            <ActivityIndicator color={colors.primary} style={{ paddingVertical: 40 }} />
          ) : filtered.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>📭</Text>
              <Text style={styles.emptyText}>해당 상태의 협찬이 없습니다</Text>
            </View>
          ) : (
            filtered.map((deal) => <DealCard key={deal.id} deal={deal} onPress={() => setSelectedDeal(deal)} />)
          )}
        </View>

        {/* FOMO 페이월 배너 - 무료 유저만 */}
        {!isPremium && <FomoBanner variant="deals" />}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* 플로팅 버튼 */}
      <TouchableOpacity style={[styles.fab, { bottom: insets.bottom + 88 }]} onPress={() => setShowAddModal(true)} activeOpacity={0.85}>
        <Text style={styles.fabText}>＋</Text>
      </TouchableOpacity>

      {/* 딜 상세/편집 모달 */}
      {selectedDeal && (
        <DealDetailModal
          visible={!!selectedDeal}
          deal={selectedDeal}
          onClose={() => setSelectedDeal(null)}
          onSuccess={() => { setSelectedDeal(null); refetch(); }}
        />
      )}

      {/* 새 협찬 추가 모달 */}
      {user && (
        <AddDealModal
          visible={showAddModal}
          userId={user.id}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            refetch();
          }}
        />
      )}

      {/* 클립보드 파서 모달 */}
      {parsedDeal && user && (
        <ClipboardParserModal
          visible={!!parsedDeal}
          parsed={parsedDeal}
          userId={user.id}
          onClose={() => setParsedDeal(null)}
          onSuccess={() => {
            setParsedDeal(null);
            refetch();
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F8FF' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  title:  { fontSize: 22, fontWeight: '800', color: '#1A1A2E', letterSpacing: -0.4 },
  headerBtns: { flexDirection: 'row', gap: 8 },
  inboxBtn: {
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  inboxBtnText: { color: '#EA580C', fontSize: 12, fontWeight: '700' },
  clipBtn: {
    backgroundColor: '#F0EFFE',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  clipBtnText: { color: colors.primary, fontSize: 13, fontWeight: '700' },
  addBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  addBtnText:  { color: '#fff', fontSize: 13, fontWeight: '700' },
  scroll:      { paddingHorizontal: 20 },
  filterScroll: { marginBottom: 16, marginHorizontal: -20 },
  filterRow:   { paddingHorizontal: 20, gap: 8 },
  filterTab:   { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#E5E7EB' },
  filterTabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterTabText:   { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  filterTabTextActive: { color: '#fff' },
  list:  {},
  empty: { alignItems: 'center', paddingVertical: 48, gap: 10 },
  emptyIcon: { fontSize: 40 },
  emptyText: { fontSize: 14, color: '#9CA3AF' },
  fab: {
    position: 'absolute',
    right: 20,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  fabText: { fontSize: 24, color: '#fff', fontWeight: '300', lineHeight: 28 },
});
