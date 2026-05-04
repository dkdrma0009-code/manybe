import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../constants/colors';

const { width } = Dimensions.get('window');

// ─── 데이터 ────────────────────────────────────────────────

type DealStatus = '검토중' | '협상중' | '계약완료' | '촬영중' | '정산대기' | '완료';

interface Deal {
  id: string;
  brand: string;
  title: string;
  amount: number;
  deadline: string;
  status: DealStatus;
  avatarColor: string;
}

const DEALS: Deal[] = [
  {
    id: '1',
    brand: '나이키',
    title: '러닝화 협찬 콘텐츠',
    amount: 3000000,
    deadline: '5월 15일',
    status: '협상중',
    avatarColor: '#1A1A2E',
  },
  {
    id: '2',
    brand: '올리브영',
    title: '스킨케어 리뷰',
    amount: 1500000,
    deadline: '5월 22일',
    status: '계약완료',
    avatarColor: '#059669',
  },
  {
    id: '3',
    brand: '삼성전자',
    title: '갤럭시 언박싱',
    amount: 5000000,
    deadline: '6월 1일',
    status: '정산대기',
    avatarColor: '#2563EB',
  },
  {
    id: '4',
    brand: '다이슨',
    title: '에어랩 리뷰',
    amount: 2000000,
    deadline: '6월 10일',
    status: '촬영중',
    avatarColor: '#6C63FF',
  },
];

const STATUS_CONFIG: Record<DealStatus | '전체', { bg: string; text: string }> = {
  전체:   { bg: colors.primary, text: '#fff' },
  검토중: { bg: '#F3F4F6', text: '#4B5563' },
  협상중: { bg: '#FEF3C7', text: '#D97706' },
  계약완료: { bg: '#D1FAE5', text: '#059669' },
  촬영중: { bg: '#FFF3E0', text: '#EA580C' },
  정산대기: { bg: '#DBEAFE', text: '#2563EB' },
  완료:   { bg: '#ECFDF5', text: '#047857' },
};

const FILTER_TABS = ['전체', '검토중', '협상중', '계약완료', '촬영중', '정산대기', '완료'] as const;

// ─── 서브 컴포넌트 ──────────────────────────────────────────

function SummaryCard() {
  const totalAmount = DEALS.reduce((s, d) => s + d.amount, 0);
  const inProgress = DEALS.filter(
    (d) => ['협상중', '계약완료', '촬영중'].includes(d.status)
  ).length;
  const pending = DEALS.filter((d) => d.status === '정산대기').length;

  return (
    <View style={summary.card}>
      <View style={summary.row}>
        <View style={summary.item}>
          <Text style={summary.itemValue}>{inProgress}건</Text>
          <Text style={summary.itemLabel}>진행 중</Text>
        </View>
        <View style={summary.divider} />
        <View style={summary.item}>
          <Text style={summary.itemValue}>{pending}건</Text>
          <Text style={summary.itemLabel}>정산 대기</Text>
        </View>
        <View style={summary.divider} />
        <View style={[summary.item, { flex: 2 }]}>
          <Text style={[summary.itemValue, summary.amountValue]}>
            {totalAmount.toLocaleString('ko-KR')}원
          </Text>
          <Text style={summary.itemLabel}>이번 달 협찬 수익</Text>
        </View>
      </View>
    </View>
  );
}

const summary = StyleSheet.create({
  card: {
    backgroundColor: '#F0EFFE',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  item: {
    flex: 1,
    alignItems: 'center',
  },
  divider: {
    width: 1,
    height: 36,
    backgroundColor: 'rgba(108,99,255,0.2)',
    marginHorizontal: 4,
  },
  itemValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1A1A2E',
    marginBottom: 2,
  },
  amountValue: {
    fontSize: 16,
    color: colors.primary,
  },
  itemLabel: {
    fontSize: 11,
    color: '#7C6FCD',
  },
});

function StatusBadge({ status }: { status: DealStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <View style={[badge.wrapper, { backgroundColor: cfg.bg }]}>
      <Text style={[badge.text, { color: cfg.text }]}>{status}</Text>
    </View>
  );
}

const badge = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
  },
});

function DealCard({ deal }: { deal: Deal }) {
  return (
    <TouchableOpacity style={card.wrapper} activeOpacity={0.82}>
      {/* 브랜드 아바타 */}
      <View style={[card.avatar, { backgroundColor: deal.avatarColor }]}>
        <Text style={card.avatarText}>{deal.brand[0]}</Text>
      </View>

      {/* 중앙 정보 */}
      <View style={card.info}>
        <Text style={card.brand}>{deal.brand}</Text>
        <Text style={card.title} numberOfLines={1}>{deal.title}</Text>
        <View style={card.meta}>
          <Text style={card.amount}>{deal.amount.toLocaleString('ko-KR')}원</Text>
          <Text style={card.dot}>·</Text>
          <Text style={card.deadline}>마감 {deal.deadline}</Text>
        </View>
      </View>

      {/* 상태 뱃지 */}
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
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
  },
  info: {
    flex: 1,
    gap: 3,
  },
  brand: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A2E',
  },
  title: {
    fontSize: 12,
    color: '#6B7280',
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  amount: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  dot: {
    fontSize: 12,
    color: '#D1D5DB',
  },
  deadline: {
    fontSize: 12,
    color: '#9CA3AF',
  },
});

// ─── 메인 화면 ──────────────────────────────────────────────

export default function DealsScreen() {
  const insets = useSafeAreaInsets();
  const [activeFilter, setActiveFilter] = useState<typeof FILTER_TABS[number]>('전체');

  const filtered =
    activeFilter === '전체' ? DEALS : DEALS.filter((d) => d.status === activeFilter);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.title}>협찬 관리</Text>
        <TouchableOpacity style={styles.addBtn} activeOpacity={0.85}>
          <Text style={styles.addBtnText}>＋ 새 협찬</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* 요약 카드 */}
        <SummaryCard />

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
          {filtered.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>📭</Text>
              <Text style={styles.emptyText}>해당 상태의 협찬이 없습니다</Text>
            </View>
          ) : (
            filtered.map((deal) => <DealCard key={deal.id} deal={deal} />)
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* 플로팅 버튼 */}
      <TouchableOpacity style={[styles.fab, { bottom: insets.bottom + 88 }]} activeOpacity={0.85}>
        <Text style={styles.fabText}>＋</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8FF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1A1A2E',
    letterSpacing: -0.4,
  },
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
  addBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  scroll: {
    paddingHorizontal: 20,
  },
  filterScroll: {
    marginBottom: 16,
    marginHorizontal: -20,
  },
  filterRow: {
    paddingHorizontal: 20,
    gap: 8,
  },
  filterTab: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  filterTabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  filterTabTextActive: {
    color: '#fff',
  },
  list: {
    gap: 0,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 10,
  },
  emptyIcon: {
    fontSize: 40,
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
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
  fabText: {
    fontSize: 24,
    color: '#fff',
    fontWeight: '300',
    lineHeight: 28,
  },
});
