import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth';
import { useDealsData, DisplayStatus, DealItem } from '../../hooks/useDealsData';
import { computeAutoSuggestions, AutoSuggestion } from '../../services/WorkflowAutomation';
import { colors } from '../../constants/colors';
import { tokens } from '../../constants/tokens';
import { typography } from '../../constants/typography';
import { shadows } from '../../constants/shadows';
import AddDealModal from './AddDealModal';
import DealDetailModal, { DealDetailData } from './DealDetailModal';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/AppNavigator';
import { useRealtime } from '../../context/RealtimeContext';

const PIPELINE_ORDER: DisplayStatus[] = ['문의', '검토중', '진행중', '업로드됨', '정산완료'];

function formatWon(n: number): string {
  if (n >= 100000000) return `${Math.floor(n / 100000000)}억원`;
  if (n >= 10000) return `${Math.floor(n / 10000)}만원`;
  return n.toLocaleString('ko-KR') + '원';
}

const FILTER_EMPTY: Record<DisplayStatus, { icon: string; title: string; desc: string }> = {
  '문의':    { icon: '📬', title: '답변 대기 중인 문의가 없어요',    desc: '미디어 키트로 인바운드 문의를 받아보세요' },
  '검토중':  { icon: '🔍', title: '검토 중인 협찬이 없어요',         desc: '문의에서 협찬을 수락하면 여기서 검토해요' },
  '진행중':  { icon: '⚡', title: '진행 중인 협찬이 없어요',         desc: '검토 완료 후 작업을 시작하면 이 단계로 이동해요' },
  '업로드됨':{ icon: '📤', title: '업로드 대기 중인 협찬이 없어요',  desc: '컨텐츠 업로드 완료 후 이 단계로 이동하세요' },
  '정산완료':{ icon: '✅', title: '완료된 협찬이 없어요',             desc: '정산 완료 후 수익 탭에서 금액을 기록해두세요' },
};

const STATUS_CONFIG: Record<DisplayStatus, { bg: string; text: string; border: string; dot: string }> = {
  '문의':    { bg: '#EAE3FF', text: '#6E56F0', border: '#C4B0F8', dot: '#6E56F0' },
  '검토중':  { bg: '#FBF1DC', text: '#C68318', border: '#E8C060', dot: '#C68318' },
  '진행중':  { bg: '#E3ECFB', text: '#3B6FD9', border: '#93B8F5', dot: '#3B6FD9' },
  '업로드됨':{ bg: '#DEEFE5', text: '#2E8C5D', border: '#88D5A8', dot: '#2E8C5D' },
  '정산완료':{ bg: '#ECEAE4', text: '#6B6878', border: '#DEDAD5', dot: '#9A97A6' },
};

type FilterTab = DisplayStatus | '전체';

// ─── Pipeline strip ──────────────────────────────────────────────────────────

function PipelineStrip({
  deals,
  activeFilter,
  onSelect,
}: {
  deals: DealItem[];
  activeFilter: FilterTab;
  onSelect: (f: FilterTab) => void;
}) {
  const counts = PIPELINE_ORDER.reduce<Record<DisplayStatus, number>>(
    (acc, s) => { acc[s] = deals.filter((d) => d.status === s).length; return acc; },
    {} as Record<DisplayStatus, number>
  );

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={strip.row}
      style={strip.scroll}
    >
      <TouchableOpacity
        style={[strip.pill, activeFilter === '전체' && strip.pillActive]}
        onPress={() => onSelect('전체')}
        activeOpacity={0.75}
      >
        <Text style={[strip.pillText, activeFilter === '전체' && strip.pillTextActive]}>
          전체 {deals.length}
        </Text>
      </TouchableOpacity>

      {PIPELINE_ORDER.map((status, idx) => {
        const cfg = STATUS_CONFIG[status];
        const isActive = activeFilter === status;
        const count = counts[status];
        return (
          <React.Fragment key={status}>
            {idx > 0 && <Text style={strip.arrow}>›</Text>}
            <TouchableOpacity
              style={[strip.pill, { backgroundColor: cfg.bg, borderColor: cfg.border }, isActive && strip.pillActive]}
              onPress={() => onSelect(isActive ? '전체' : status)}
              activeOpacity={0.75}
            >
              <Text style={[strip.pillText, { color: cfg.text }, isActive && strip.pillTextActive]}>
                {status} {count}
              </Text>
            </TouchableOpacity>
          </React.Fragment>
        );
      })}
    </ScrollView>
  );
}

const strip = StyleSheet.create({
  scroll:        { marginBottom: 16, marginHorizontal: -20 },
  row:           { paddingHorizontal: 20, gap: 6, alignItems: 'center' },
  arrow:         { fontSize: 14, color: '#D1D5DB', marginHorizontal: -2 },
  pill:          { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1.5, borderColor: tokens.border, backgroundColor: '#fff' },
  pillActive:    { borderColor: colors.primary, backgroundColor: colors.primary },
  pillText:      { ...typography.label, color: tokens.ink3 },
  pillTextActive:{ color: '#fff', fontWeight: '800' },
});

// ─── Summary card ─────────────────────────────────────────────────────────────

function SummaryCard({ deals }: { deals: DealItem[] }) {
  const activeCount = deals.filter((d) => d.status !== '정산완료').length;
  const inquiryCount = deals.filter((d) => d.status === '문의').length;
  const uploadedCount = deals.filter((d) => d.status === '업로드됨').length;
  const pipelineTotal = deals
    .filter((d) => d.status !== '정산완료')
    .reduce((sum, d) => sum + d.amount, 0);

  return (
    <View style={summary.card}>
      <View style={summary.row}>
        <View style={summary.item}>
          <Text style={summary.value}>{activeCount}건</Text>
          <Text style={summary.label}>파이프라인</Text>
        </View>
        <View style={summary.divider} />
        <View style={summary.item}>
          <Text style={[summary.value, inquiryCount > 0 && summary.inquiry, inquiryCount === 0 && summary.calm]}>
            {inquiryCount > 0 ? `${inquiryCount}건` : '없음'}
          </Text>
          <Text style={summary.label}>답변 대기</Text>
        </View>
        <View style={summary.divider} />
        <View style={summary.item}>
          <Text style={[summary.value, uploadedCount > 0 && summary.pending, uploadedCount === 0 && summary.calm]}>
            {uploadedCount > 0 ? `${uploadedCount}건` : '없음'}
          </Text>
          <Text style={summary.label}>정산 대기</Text>
        </View>
      </View>
      {pipelineTotal > 0 && (
        <View style={summary.totalRow}>
          <Text style={summary.totalLabel}>활성 파이프라인 총액</Text>
          <Text style={summary.totalValue}>{formatWon(pipelineTotal)}</Text>
        </View>
      )}
    </View>
  );
}

const summary = StyleSheet.create({
  card:    { backgroundColor: tokens.primarySoft, borderRadius: 16, padding: 18, marginBottom: 16 },
  row:     { flexDirection: 'row', alignItems: 'center' },
  item:    { flex: 1, alignItems: 'center' },
  divider: { width: 1, height: 36, backgroundColor: 'rgba(110,86,240,0.2)', marginHorizontal: 4 },
  value:   { fontSize: 20, fontWeight: '800', color: tokens.ink, marginBottom: 2 },
  pending: { color: tokens.uploaded },
  inquiry: { color: tokens.primary },
  calm:    { fontSize: 16, color: tokens.ink4 },
  label:   { ...typography.caption, color: tokens.primaryDeep },
  totalRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(110,86,240,0.12)' },
  totalLabel: { ...typography.label, color: tokens.primaryDeep },
  totalValue: { ...typography.cardTitle, color: tokens.ink },
});

// ─── Deal card ────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: DisplayStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <View style={[badge.wrapper, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
      <Text style={[badge.text, { color: cfg.text }]}>{status}</Text>
    </View>
  );
}

const badge = StyleSheet.create({
  wrapper: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1, alignSelf: 'flex-start' },
  text:    { fontSize: 11, fontWeight: '700' },
});

function dealDaysLeft(endDate: string): number | null {
  if (!endDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((new Date(endDate).getTime() - today.getTime()) / 86400000);
}

function DealCard({ deal, onPress }: { deal: DealItem; onPress: () => void }) {
  const daysLeft = deal.endDate && deal.status !== '정산완료' ? dealDaysLeft(deal.endDate) : null;
  const urgent = daysLeft !== null && daysLeft <= 3 && daysLeft >= 0;

  return (
    <TouchableOpacity
      style={[card.wrapper, urgent && card.wrapperUrgent]}
      onPress={onPress}
      activeOpacity={0.82}
    >
      {urgent && <View style={card.urgentBar} />}
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
              <Text style={[card.deadline, urgent && card.deadlineUrgent]}>
                마감 {daysLeft === 0 ? 'D-0 오늘!' : `D-${daysLeft} ${deal.deadline}`}
              </Text>
            </>
          ) : null}
        </View>
        {STATUS_HINT[deal.status] && (
          <View style={[card.nextAction, { backgroundColor: STATUS_CONFIG[deal.status].bg }]}>
            <Text style={[card.nextActionText, { color: STATUS_CONFIG[deal.status].text }]}>
              {STATUS_HINT[deal.status]}
            </Text>
          </View>
        )}
      </View>
      <StatusBadge status={deal.status} />
    </TouchableOpacity>
  );
}

const card = StyleSheet.create({
  wrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 10,
    ...shadows.card, gap: 12,
    overflow: 'hidden',
  },
  wrapperUrgent: { borderWidth: 1.5, borderColor: '#FCA5A5' },
  urgentBar:  { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, backgroundColor: tokens.urgent, borderTopLeftRadius: 16, borderBottomLeftRadius: 16 },
  avatar:     { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18, fontWeight: '800', color: '#fff' },
  info:       { flex: 1, gap: 3 },
  brand:      { ...typography.cardTitle, color: tokens.ink },
  title:      { ...typography.metadata, color: tokens.ink3 },
  meta:       { flexDirection: 'row', alignItems: 'center', gap: 4 },
  amount:     { ...typography.cardSubtitle, fontWeight: '700', color: tokens.primary },
  dot:        { fontSize: 12, color: '#D1D5DB' },
  deadline:        { ...typography.metadata, color: tokens.ink4 },
  deadlineUrgent:  { color: tokens.urgent, fontWeight: '700' },
  nextAction:      { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginTop: 4 },
  nextActionText:  { ...typography.status },
});

// ─── Section header ───────────────────────────────────────────────────────────

const STATUS_HINT: Partial<Record<DisplayStatus, string>> = {
  '문의':     '답변이 필요해요',
  '검토중':   '조건을 확정하세요',
  '업로드됨': '정산을 요청하세요',
};

function SectionHeader({ status, count }: { status: DisplayStatus; count: number }) {
  const cfg = STATUS_CONFIG[status];
  const hint = STATUS_HINT[status];
  return (
    <View style={sectionHdr.wrap}>
      <View style={sectionHdr.row}>
        <View style={[sectionHdr.dot, { backgroundColor: cfg.dot }]} />
        <Text style={[sectionHdr.label, { color: cfg.text }]}>{status}</Text>
        <View style={[sectionHdr.badge, { backgroundColor: cfg.bg }]}>
          <Text style={[sectionHdr.badgeText, { color: cfg.text }]}>{count}</Text>
        </View>
        <View style={sectionHdr.line} />
        {hint && (
          <View style={[sectionHdr.hintPill, { backgroundColor: cfg.bg }]}>
            <Text style={[sectionHdr.hintText, { color: cfg.text }]}>{hint}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const sectionHdr = StyleSheet.create({
  wrap:      { marginBottom: 8, marginTop: 4 },
  row:       { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot:       { width: 7, height: 7, borderRadius: 4 },
  label:     { ...typography.label, fontWeight: '800', letterSpacing: 0.4 },
  badge:     { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10 },
  badgeText: { ...typography.status },
  line:      { flex: 1, height: 1, backgroundColor: tokens.bgDeeper },
  hintPill:  { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  hintText:  { ...typography.caption, fontWeight: '600' },
});

// ─── Auto-suggestion banner ───────────────────────────────────────────────────

function AutoSuggestBanner({
  suggestions,
  onPress,
  onDismiss,
}: {
  suggestions: AutoSuggestion[];
  onPress: (s: AutoSuggestion) => void;
  onDismiss: (dealId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  if (suggestions.length === 0) return null;

  return (
    <View style={asbStyle.wrapper}>
      <TouchableOpacity style={asbStyle.header} onPress={() => setExpanded((v) => !v)} activeOpacity={0.8}>
        <View style={asbStyle.headerLeft}>
          <View style={asbStyle.badge}>
            <Text style={asbStyle.badgeText}>{suggestions.length}</Text>
          </View>
          <Text style={asbStyle.title}>상태 업데이트 제안</Text>
        </View>
        <Text style={asbStyle.chevron}>{expanded ? '▲' : '▼'}</Text>
      </TouchableOpacity>
      {expanded && suggestions.map((s) => (
        <View key={s.dealId} style={asbStyle.row}>
          <View style={asbStyle.rowContent}>
            <Text style={asbStyle.brand} numberOfLines={1}>{s.brand}</Text>
            <Text style={asbStyle.reason} numberOfLines={2}>{s.reason}</Text>
            <View style={asbStyle.statusRow}>
              <Text style={asbStyle.statusFrom}>{s.currentStatus}</Text>
              <Text style={asbStyle.arrow}>→</Text>
              <Text style={asbStyle.statusTo}>{s.suggestedStatus}</Text>
              {s.confidence === 'high' && (
                <View style={asbStyle.confidencePill}>
                  <Text style={asbStyle.confidenceText}>확실</Text>
                </View>
              )}
            </View>
          </View>
          <View style={asbStyle.actions}>
            <TouchableOpacity style={asbStyle.applyBtn} onPress={() => onPress(s)} activeOpacity={0.8}>
              <Text style={asbStyle.applyText}>업데이트</Text>
            </TouchableOpacity>
            <TouchableOpacity style={asbStyle.dismissBtn} onPress={() => onDismiss(s.dealId)} activeOpacity={0.8}>
              <Text style={asbStyle.dismissText}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </View>
  );
}

const asbStyle = StyleSheet.create({
  wrapper:       { backgroundColor: '#FFFBEB', borderRadius: 14, marginBottom: 16, borderWidth: 1, borderColor: '#FDE68A', overflow: 'hidden' },
  header:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12 },
  headerLeft:    { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge:         { backgroundColor: '#F59E0B', borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  badgeText:     { fontSize: 11, fontWeight: '800', color: '#fff' },
  title:         { fontSize: 13, fontWeight: '700', color: '#92400E' },
  chevron:       { fontSize: 11, color: '#B45309' },
  row:           { paddingHorizontal: 14, paddingBottom: 12, flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderTopWidth: 1, borderTopColor: '#FDE68A', paddingTop: 12 },
  rowContent:    { flex: 1, gap: 4 },
  brand:         { fontSize: 13, fontWeight: '700', color: '#1A1A2E' },
  reason:        { fontSize: 12, color: '#6B7280', lineHeight: 18 },
  statusRow:     { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  statusFrom:    { fontSize: 11, color: '#6B7280', backgroundColor: '#F3F4F6', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  arrow:         { fontSize: 11, color: '#9CA3AF' },
  statusTo:      { fontSize: 11, fontWeight: '700', color: '#2E8C5D', backgroundColor: '#DEEFE5', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  confidencePill:{ backgroundColor: '#FDE68A', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  confidenceText:{ fontSize: 10, fontWeight: '700', color: '#92400E' },
  actions:       { flexDirection: 'column', gap: 6 },
  applyBtn:      { backgroundColor: '#F59E0B', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, alignItems: 'center' },
  applyText:     { fontSize: 11, fontWeight: '700', color: '#fff' },
  dismissBtn:    { paddingHorizontal: 10, paddingVertical: 6, alignItems: 'center' },
  dismissText:   { fontSize: 13, color: '#9CA3AF' },
});

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function DealsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user } = useAuth();
  const { data, loading, refetch } = useDealsData(user?.id);
  const { dealsVersion } = useRealtime();
  React.useEffect(() => { refetch(); }, [dealsVersion]); // eslint-disable-line react-hooks/exhaustive-deps
  const [activeFilter, setActiveFilter] = useState<FilterTab>('전체');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<DealDetailData | null>(null);
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(new Set());

  const autoSuggestions = useMemo(() => {
    if (loading || data.deals.length === 0) return [];
    const asDeals = data.deals.map((d) => ({
      id: d.id, brand: d.brand, title: d.title,
      status: d.dbStatus, end_date: d.endDate || null,
      amount: d.amount, created_at: d.createdAt,
    }));
    return computeAutoSuggestions(asDeals).filter((s) => !dismissedSuggestions.has(s.dealId));
  }, [data.deals, loading, dismissedSuggestions]);

  function handleSuggestionPress(s: AutoSuggestion) {
    const deal = data.deals.find((d) => d.id === s.dealId);
    if (deal) setSelectedDeal(deal);
  }

  function handleSuggestionDismiss(dealId: string) {
    setDismissedSuggestions((prev) => new Set([...prev, dealId]));
  }

  const filtered =
    activeFilter === '전체'
      ? data.deals
      : data.deals.filter((d) => d.status === activeFilter);

  function renderDeals() {
    if (loading) {
      return <ActivityIndicator color={colors.primary} style={{ paddingVertical: 40 }} />;
    }

    if (data.deals.length === 0) {
      return (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🤝</Text>
          <Text style={styles.emptyTitle}>아직 협찬이 없어요</Text>
          <Text style={styles.emptyDesc}>
            {'+ 추가 버튼으로 첫 협찬을 등록하거나\n미디어 키트에서 인바운드 문의를 받아보세요.'}
          </Text>
        </View>
      );
    }

    if (activeFilter !== '전체') {
      if (filtered.length === 0) {
        const ef = FILTER_EMPTY[activeFilter];
        return (
          <View style={styles.filterEmpty}>
            <Text style={styles.filterEmptyIcon}>{ef.icon}</Text>
            <Text style={styles.filterEmptyTitle}>{ef.title}</Text>
            <Text style={styles.filterEmptyDesc}>{ef.desc}</Text>
            <TouchableOpacity style={styles.filterEmptyClear} onPress={() => setActiveFilter('전체')} activeOpacity={0.8}>
              <Text style={styles.filterEmptyClearText}>전체 협찬 보기</Text>
            </TouchableOpacity>
          </View>
        );
      }
      return filtered.map((deal) => (
        <DealCard key={deal.id} deal={deal} onPress={() => setSelectedDeal(deal)} />
      ));
    }

    // 전체: grouped by pipeline order
    return PIPELINE_ORDER.map((status) => {
      const group = data.deals.filter((d) => d.status === status);
      if (group.length === 0) return null;
      return (
        <View key={status}>
          <SectionHeader status={status} count={group.length} />
          {group.map((deal) => (
            <DealCard key={deal.id} deal={deal} onPress={() => setSelectedDeal(deal)} />
          ))}
        </View>
      );
    });
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>협찬 관리</Text>
        <View style={styles.headerBtns}>
          <TouchableOpacity style={styles.inboxBtn} onPress={() => navigation.navigate('Inquiries')} activeOpacity={0.85}>
            <Text style={styles.inboxBtnText}>📬 문의함</Text>
          </TouchableOpacity>
          {/* PLAN_GATE: unlimited sponsorship workflows — show upgrade nudge instead of add button when free limit reached */}
          <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddModal(true)} activeOpacity={0.85}>
            <Text style={styles.addBtnText}>＋ 추가</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} />}
      >
        <SummaryCard deals={data.deals} />

        <PipelineStrip
          deals={data.deals}
          activeFilter={activeFilter}
          onSelect={setActiveFilter}
        />

        <AutoSuggestBanner
          suggestions={autoSuggestions}
          onPress={handleSuggestionPress}
          onDismiss={handleSuggestionDismiss}
        />

        <View style={styles.list}>
          {renderDeals()}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + 88 }]}
        onPress={() => setShowAddModal(true)}
        activeOpacity={0.85}
      >
        <Text style={styles.fabText}>＋</Text>
      </TouchableOpacity>

      {selectedDeal && (
        <DealDetailModal
          visible={!!selectedDeal}
          deal={selectedDeal}
          onClose={() => setSelectedDeal(null)}
          onSuccess={() => { setSelectedDeal(null); refetch(); }}
          onNavigateRevenue={() => {
            setSelectedDeal(null);
            navigation.navigate('Main', { screen: '수익' } as any);
          }}
          userId={user?.id}
          onNavigateBrand={(brand) => {
            setSelectedDeal(null);
            navigation.navigate('BrandDetail', { brand });
          }}
        />
      )}

      {user && (
        <AddDealModal
          visible={showAddModal}
          userId={user.id}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => { setShowAddModal(false); refetch(); }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F3EF' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 20,
  },
  title:      { ...typography.screenTitle, color: tokens.ink },
  headerBtns: { flexDirection: 'row', gap: 8 },
  inboxBtn: {
    backgroundColor: '#FFF7ED', paddingHorizontal: 10, paddingVertical: 8,
    borderRadius: 10, borderWidth: 1, borderColor: '#FED7AA',
  },
  inboxBtnText: { ...typography.buttonSm, color: '#EA580C' },
  addBtn: {
    backgroundColor: colors.primary, paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 10, shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 3,
  },
  addBtnText: { ...typography.buttonSm, color: '#fff' },
  scroll:     { paddingHorizontal: 20 },
  list:       {},
  empty: { alignItems: 'center', paddingVertical: 48, gap: 10 },
  emptyIcon:  { fontSize: 48 },
  emptyTitle: { ...typography.sectionTitle, color: tokens.ink2 },
  emptyDesc:  { ...typography.metadata, color: tokens.ink4, textAlign: 'center', lineHeight: 20 },
  filterEmpty: {
    alignItems: 'center', paddingVertical: 40, gap: 8,
    backgroundColor: '#fff', borderRadius: 18, marginBottom: 10,
    ...shadows.subtle,
  },
  filterEmptyIcon:  { fontSize: 36, marginBottom: 4 },
  filterEmptyTitle: { ...typography.cardTitle, color: tokens.ink },
  filterEmptyDesc:  { ...typography.metadata, color: tokens.ink4, textAlign: 'center', lineHeight: 20, paddingHorizontal: 24 },
  filterEmptyClear: { marginTop: 8, backgroundColor: tokens.primarySoft, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
  filterEmptyClearText: { ...typography.buttonSm, color: tokens.primary },
  fab: {
    position: 'absolute', right: 20, width: 52, height: 52, borderRadius: 26,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4, shadowRadius: 8, elevation: 6,
  },
  fabText: { fontSize: 24, color: '#fff', fontWeight: '300', lineHeight: 28 },
});
