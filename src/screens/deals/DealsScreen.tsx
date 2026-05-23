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
import { AppCard, AppBadge } from '../../components/ui';
import { theme } from '../../constants/theme';
import AddDealModal from './AddDealModal';
import DealDetailModal, { DealDetailData } from './DealDetailModal';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/AppNavigator';
import { useRealtime } from '../../context/RealtimeContext';
import { useProposals, Proposal } from '../../hooks/useProposals';

const { colors, space, radius, shadows, typography } = theme;

const PIPELINE_ORDER: DisplayStatus[] = ['문의', '검토중', '진행중', '업로드됨', '정산완료'];

function formatWon(n: number): string {
  if (n >= 100_000_000) return `${Math.floor(n / 100_000_000)}억원`;
  if (n >= 10_000) return `${Math.floor(n / 10_000)}만원`;
  return n.toLocaleString('ko-KR') + '원';
}

const FILTER_EMPTY: Record<DisplayStatus, { icon: string; title: string; desc: string }> = {
  '문의':     { icon: '📬', title: '답변 대기 중인 문의가 없어요',   desc: '미디어 키트로 인바운드 문의를 받아보세요' },
  '검토중':   { icon: '🔍', title: '검토 중인 협찬이 없어요',        desc: '문의에서 협찬을 수락하면 여기서 검토해요' },
  '진행중':   { icon: '⚡', title: '진행 중인 협찬이 없어요',        desc: '검토 완료 후 작업을 시작하면 이 단계로 이동해요' },
  '업로드됨': { icon: '📤', title: '업로드 대기 중인 협찬이 없어요', desc: '컨텐츠 업로드 완료 후 이 단계로 이동하세요' },
  '정산완료': { icon: '✅', title: '완료된 협찬이 없어요',            desc: '정산 완료 후 수익 탭에서 금액을 기록해두세요' },
};

// Status token lookup — maps DisplayStatus to theme tokens
const STATUS_CFG: Record<DisplayStatus, { bg: string; text: string; dot: string }> = {
  '문의':    { bg: colors.status.inquiryBg,    text: colors.status.inquiry,    dot: colors.status.inquiry },
  '검토중':  { bg: colors.status.reviewingBg,  text: colors.status.reviewing,  dot: colors.status.reviewing },
  '진행중':  { bg: colors.status.inProgressBg, text: colors.status.inProgress, dot: colors.status.inProgress },
  '업로드됨':{ bg: colors.status.uploadedBg,   text: colors.status.uploaded,   dot: colors.status.uploaded },
  '정산완료':{ bg: colors.status.settledBg,    text: colors.status.settled,    dot: colors.status.settled },
};

const STATUS_HINT: Partial<Record<DisplayStatus, string>> = {
  '문의':     '답변이 필요해요',
  '검토중':   '조건을 확정하세요',
  '업로드됨': '정산을 요청하세요',
};

type FilterTab = DisplayStatus | '전체';

// ─── Pipeline filter strip ────────────────────────────────────────────────────

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
    {} as Record<DisplayStatus, number>,
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
        const cfg = STATUS_CFG[status];
        const isActive = activeFilter === status;
        return (
          <React.Fragment key={status}>
            {idx > 0 && <Text style={strip.separator}>›</Text>}
            <TouchableOpacity
              style={[
                strip.pill,
                { backgroundColor: cfg.bg },
                isActive && strip.pillActive,
              ]}
              onPress={() => onSelect(isActive ? '전체' : status)}
              activeOpacity={0.75}
            >
              <Text style={[strip.pillText, { color: cfg.text }, isActive && strip.pillTextActive]}>
                {status} {counts[status]}
              </Text>
            </TouchableOpacity>
          </React.Fragment>
        );
      })}
    </ScrollView>
  );
}

const strip = StyleSheet.create({
  scroll:         { marginBottom: space.md, marginHorizontal: -space.screen },
  row:            { paddingHorizontal: space.screen, gap: space.xs + 2, alignItems: 'center' },
  separator:      { fontSize: 13, color: colors.border.medium, marginHorizontal: -2 },
  pill:           { paddingHorizontal: space.md, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: colors.surface },
  pillActive:     { backgroundColor: colors.brand.default },
  pillText:       { ...typography.label, color: colors.text.tertiary },
  pillTextActive: { color: '#fff', fontWeight: '800' },
});

// ─── Summary card ─────────────────────────────────────────────────────────────

function SummaryCard({ deals }: { deals: DealItem[] }) {
  const activeCount    = deals.filter((d) => d.status !== '정산완료').length;
  const inquiryCount   = deals.filter((d) => d.status === '문의').length;
  const uploadedCount  = deals.filter((d) => d.status === '업로드됨').length;
  const pipelineTotal  = deals
    .filter((d) => d.status !== '정산완료')
    .reduce((sum, d) => sum + d.amount, 0);

  return (
    <AppCard variant="filled" style={sc.card}>
      <View style={sc.row}>
        <View style={sc.item}>
          <Text style={sc.value}>{activeCount}건</Text>
          <Text style={sc.label}>파이프라인</Text>
        </View>
        <View style={sc.divider} />
        <View style={sc.item}>
          <Text style={[sc.value, inquiryCount > 0 ? sc.valueInquiry : sc.valueCalm]}>
            {inquiryCount > 0 ? `${inquiryCount}건` : '없음'}
          </Text>
          <Text style={sc.label}>답변 대기</Text>
        </View>
        <View style={sc.divider} />
        <View style={sc.item}>
          <Text style={[sc.value, uploadedCount > 0 ? sc.valuePending : sc.valueCalm]}>
            {uploadedCount > 0 ? `${uploadedCount}건` : '없음'}
          </Text>
          <Text style={sc.label}>정산 대기</Text>
        </View>
      </View>
      {pipelineTotal > 0 && (
        <View style={sc.totalRow}>
          <Text style={sc.totalLabel}>활성 파이프라인 총액</Text>
          <Text style={sc.totalValue}>{formatWon(pipelineTotal)}</Text>
        </View>
      )}
    </AppCard>
  );
}

const sc = StyleSheet.create({
  card:    { marginBottom: space.md },
  row:     { flexDirection: 'row', alignItems: 'center' },
  item:    { flex: 1, alignItems: 'center' },
  divider: { width: 1, height: 36, backgroundColor: colors.brand.soft, marginHorizontal: space.xs },
  value:   { ...typography.title, color: colors.text.primary, marginBottom: 3 },
  valueInquiry: { color: colors.brand.default },
  valuePending: { color: colors.semantic.successMid },
  valueCalm:    { ...typography.heading, color: colors.text.muted },
  label:   { ...typography.caption, color: colors.brand.deep },
  totalRow:   {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: space.md, paddingTop: space.md,
    borderTopWidth: 1, borderTopColor: colors.brand.soft,
  },
  totalLabel: { ...typography.label, color: colors.brand.deep },
  totalValue: { ...typography.cardTitle, color: colors.text.primary },
});

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: DisplayStatus }) {
  const cfg = STATUS_CFG[status];
  return (
    <View style={[sb.wrap, { backgroundColor: cfg.bg }]}>
      <View style={[sb.dot, { backgroundColor: cfg.dot }]} />
      <Text style={[sb.text, { color: cfg.text }]}>{status}</Text>
    </View>
  );
}

const sb = StyleSheet.create({
  wrap: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: space.sm + 2, paddingVertical: 4,
    borderRadius: radius.pill, alignSelf: 'flex-start',
  },
  dot:  { width: 5, height: 5, borderRadius: 3 },
  text: { ...typography.status },
});

// ─── Deal card ────────────────────────────────────────────────────────────────

function dealDaysLeft(endDate: string): number | null {
  if (!endDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((new Date(endDate).getTime() - today.getTime()) / 86_400_000);
}

function DealCard({ deal, onPress }: { deal: DealItem; onPress: () => void }) {
  const daysLeft = deal.endDate && deal.status !== '정산완료' ? dealDaysLeft(deal.endDate) : null;
  const urgent   = daysLeft !== null && daysLeft <= 3 && daysLeft >= 0;

  return (
    <TouchableOpacity activeOpacity={0.82} onPress={onPress}>
      <AppCard
        style={[dc.card, urgent && dc.cardUrgent]}
        padding={0}
      >
        {urgent && <View style={dc.urgentBar} />}
        <View style={[dc.avatar, { backgroundColor: deal.avatarColor }]}>
          <Text style={dc.avatarText}>{deal.brand[0]}</Text>
        </View>
        <View style={dc.info}>
          <View style={dc.infoTop}>
            <Text style={dc.brand}>{deal.brand}</Text>
            <StatusBadge status={deal.status} />
          </View>
          <Text style={dc.title} numberOfLines={1}>{deal.title}</Text>
          <View style={dc.meta}>
            <Text style={dc.amount}>{formatWon(deal.amount)}</Text>
            {deal.deadline ? (
              <>
                <Text style={dc.metaDot}>·</Text>
                <Text style={[dc.deadline, urgent && dc.deadlineUrgent]}>
                  {daysLeft === 0 ? 'D-0 오늘!' : `D-${daysLeft} ${deal.deadline}`}
                </Text>
              </>
            ) : null}
          </View>
          {STATUS_HINT[deal.status] && (
            <View style={[dc.hint, { backgroundColor: STATUS_CFG[deal.status].bg }]}>
              <Text style={[dc.hintText, { color: STATUS_CFG[deal.status].text }]}>
                {STATUS_HINT[deal.status]}
              </Text>
            </View>
          )}
        </View>
      </AppCard>
    </TouchableOpacity>
  );
}

const dc = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'flex-start',
    padding: space.md, marginBottom: space.sm,
    gap: space.md, overflow: 'hidden',
  },
  cardUrgent:    { borderWidth: 1, borderColor: colors.semantic.errorBg },
  urgentBar:     { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, backgroundColor: colors.semantic.error, borderTopLeftRadius: radius.lg, borderBottomLeftRadius: radius.lg },
  avatar:        { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarText:    { ...typography.heading, color: '#fff' },
  info:          { flex: 1, gap: 3 },
  infoTop:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  brand:         { ...typography.cardTitle, color: colors.text.primary, flex: 1 },
  title:         { ...typography.caption, color: colors.text.tertiary },
  meta:          { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  amount:        { ...typography.label, color: colors.brand.default, fontWeight: '700' },
  metaDot:       { fontSize: 11, color: colors.border.medium },
  deadline:      { ...typography.caption, color: colors.text.muted },
  deadlineUrgent:{ color: colors.semantic.error, fontWeight: '700' },
  hint:          { alignSelf: 'flex-start', paddingHorizontal: space.sm, paddingVertical: 2, borderRadius: radius.sm, marginTop: 2 },
  hintText:      { ...typography.status },
});

// ─── Pipeline section header ──────────────────────────────────────────────────

function PipelineSectionHeader({ status, count }: { status: DisplayStatus; count: number }) {
  const cfg  = STATUS_CFG[status];
  const hint = STATUS_HINT[status];
  return (
    <View style={ph.wrap}>
      <View style={[ph.dot, { backgroundColor: cfg.dot }]} />
      <Text style={[ph.label, { color: cfg.text }]}>{status}</Text>
      <View style={[ph.countBadge, { backgroundColor: cfg.bg }]}>
        <Text style={[ph.countText, { color: cfg.text }]}>{count}</Text>
      </View>
      <View style={ph.line} />
      {hint && (
        <View style={[ph.hintChip, { backgroundColor: cfg.bg }]}>
          <Text style={[ph.hintText, { color: cfg.text }]}>{hint}</Text>
        </View>
      )}
    </View>
  );
}

const ph = StyleSheet.create({
  wrap:       { flexDirection: 'row', alignItems: 'center', gap: space.xs + 2, marginBottom: space.sm, marginTop: space.xs },
  dot:        { width: 6, height: 6, borderRadius: 3 },
  label:      { ...typography.label, fontWeight: '800', letterSpacing: 0.4 },
  countBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.sm },
  countText:  { ...typography.status },
  line:       { flex: 1, height: 1, backgroundColor: colors.border.faint },
  hintChip:   { paddingHorizontal: space.sm, paddingVertical: 2, borderRadius: radius.sm },
  hintText:   { ...typography.caption, fontWeight: '600' },
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
    <AppCard style={asb.card} padding={0}>
      <TouchableOpacity
        style={asb.header}
        onPress={() => setExpanded((v) => !v)}
        activeOpacity={0.8}
      >
        <View style={asb.headerLeft}>
          <AppBadge
            label={String(suggestions.length)}
            variant="warning"
            size="sm"
          />
          <Text style={asb.title}>상태 업데이트 제안</Text>
        </View>
        <Text style={asb.chevron}>{expanded ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      {expanded && suggestions.map((s) => (
        <View key={s.dealId} style={asb.row}>
          <View style={asb.rowContent}>
            <Text style={asb.brand} numberOfLines={1}>{s.brand}</Text>
            <Text style={asb.reason} numberOfLines={2}>{s.reason}</Text>
            <View style={asb.statusRow}>
              <View style={asb.fromChip}>
                <Text style={asb.fromText}>{s.currentStatus}</Text>
              </View>
              <Text style={asb.arrow}>→</Text>
              <View style={asb.toChip}>
                <Text style={asb.toText}>{s.suggestedStatus}</Text>
              </View>
              {s.confidence === 'high' && (
                <AppBadge label="확실" variant="warning" size="sm" />
              )}
            </View>
          </View>
          <View style={asb.actions}>
            <TouchableOpacity style={asb.applyBtn} onPress={() => onPress(s)} activeOpacity={0.8}>
              <Text style={asb.applyText}>업데이트</Text>
            </TouchableOpacity>
            <TouchableOpacity style={asb.dismissBtn} onPress={() => onDismiss(s.dealId)} activeOpacity={0.8}>
              <Text style={asb.dismissText}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </AppCard>
  );
}

const asb = StyleSheet.create({
  card:       { marginBottom: space.md, overflow: 'hidden', borderWidth: 1, borderColor: colors.semantic.warningBg, backgroundColor: colors.semantic.warningBg },
  header:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: space.md, paddingVertical: space.sm + 2 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  title:      { ...typography.bodyStrong, color: colors.semantic.warning },
  chevron:    { fontSize: 10, color: colors.semantic.warningMid },
  row:        { paddingHorizontal: space.md, paddingBottom: space.md, flexDirection: 'row', alignItems: 'flex-start', gap: space.sm, borderTopWidth: 1, borderTopColor: colors.surface, paddingTop: space.md },
  rowContent: { flex: 1, gap: space.xs },
  brand:      { ...typography.cardTitle, color: colors.text.primary },
  reason:     { ...typography.caption, color: colors.text.tertiary, lineHeight: 18 },
  statusRow:  { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: 2 },
  fromChip:   { backgroundColor: colors.surface2, paddingHorizontal: 7, paddingVertical: 2, borderRadius: radius.sm },
  fromText:   { ...typography.status, color: colors.text.muted },
  arrow:      { fontSize: 11, color: colors.text.muted },
  toChip:     { backgroundColor: colors.semantic.successBg, paddingHorizontal: 7, paddingVertical: 2, borderRadius: radius.sm },
  toText:     { ...typography.status, color: colors.semantic.success },
  actions:    { flexDirection: 'column', gap: space.xs },
  applyBtn:   { backgroundColor: colors.semantic.warningMid, paddingHorizontal: space.sm + 2, paddingVertical: 6, borderRadius: radius.sm, alignItems: 'center' },
  applyText:  { ...typography.status, color: '#fff' },
  dismissBtn: { paddingHorizontal: space.sm + 2, paddingVertical: 6, alignItems: 'center' },
  dismissText:{ fontSize: 13, color: colors.text.muted },
});

// ─── Proposal banner ─────────────────────────────────────────────────────────

function formatWonShort(n: number) {
  if (n === 0) return '금액 미정';
  if (n >= 100_000_000) return `${Math.floor(n / 100_000_000)}억`;
  if (n >= 10_000) return `${Math.floor(n / 10_000)}만원`;
  return n.toLocaleString('ko-KR') + '원';
}

function ProposalBanner({
  proposals,
  onAccept,
  onReject,
}: {
  proposals: Proposal[];
  onAccept: (p: Proposal) => void;
  onReject: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  if (proposals.length === 0) return null;

  return (
    <AppCard style={pb.card} padding={0}>
      <TouchableOpacity
        style={pb.header}
        onPress={() => setExpanded((v) => !v)}
        activeOpacity={0.8}
      >
        <View style={pb.headerLeft}>
          <View style={pb.dot} />
          <Text style={pb.title}>새 협찬 제안</Text>
          <View style={pb.badge}>
            <Text style={pb.badgeText}>{proposals.length}</Text>
          </View>
        </View>
        <Text style={pb.chevron}>{expanded ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      {expanded && proposals.map((p) => (
        <View key={p.id} style={pb.row}>
          <View style={pb.avatar}>
            <Text style={pb.avatarText}>{p.brand_name[0]}</Text>
          </View>
          <View style={pb.info}>
            <Text style={pb.brand}>{p.brand_name}</Text>
            <Text style={pb.message} numberOfLines={2}>{p.message}</Text>
            <Text style={pb.amount}>{formatWonShort(p.amount)}</Text>
          </View>
          <View style={pb.actions}>
            <TouchableOpacity style={pb.acceptBtn} onPress={() => onAccept(p)} activeOpacity={0.8}>
              <Text style={pb.acceptText}>수락</Text>
            </TouchableOpacity>
            <TouchableOpacity style={pb.rejectBtn} onPress={() => onReject(p.id)} activeOpacity={0.8}>
              <Text style={pb.rejectText}>거절</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </AppCard>
  );
}

const pb = StyleSheet.create({
  card:       { marginBottom: space.md, overflow: 'hidden', borderWidth: 1.5, borderColor: colors.brand.soft },
  header:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: space.md, paddingVertical: space.sm + 2 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  dot:        { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.brand.default },
  title:      { ...typography.bodyStrong, color: colors.brand.default },
  badge:      { backgroundColor: colors.brand.default, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  badgeText:  { fontSize: 11, fontWeight: '800', color: '#fff' },
  chevron:    { fontSize: 10, color: colors.brand.deep },
  row:        { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm, paddingHorizontal: space.md, paddingBottom: space.md, paddingTop: space.sm, borderTopWidth: 1, borderTopColor: colors.brand.soft },
  avatar:     { width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.brand.default, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  avatarText: { ...typography.heading, color: '#fff' },
  info:       { flex: 1, gap: 3 },
  brand:      { ...typography.cardTitle, color: colors.text.primary },
  message:    { ...typography.caption, color: colors.text.tertiary, lineHeight: 18 },
  amount:     { ...typography.label, color: colors.brand.default, fontWeight: '700' },
  actions:    { gap: space.xs, flexShrink: 0 },
  acceptBtn:  { backgroundColor: colors.brand.default, paddingHorizontal: space.sm + 2, paddingVertical: 7, borderRadius: radius.sm, alignItems: 'center' },
  acceptText: { ...typography.status, color: '#fff', fontWeight: '800' },
  rejectBtn:  { backgroundColor: colors.surface2, paddingHorizontal: space.sm + 2, paddingVertical: 7, borderRadius: radius.sm, alignItems: 'center' },
  rejectText: { ...typography.status, color: colors.text.muted },
});

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function DealsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user } = useAuth();
  const { data, loading, refetch } = useDealsData(user?.id);
  const { proposals, acceptProposal, rejectProposal } = useProposals(user?.id);
  const { dealsVersion } = useRealtime();
  React.useEffect(() => { refetch(); }, [dealsVersion]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleAcceptProposal(p: Proposal) {
    await acceptProposal(p);
    refetch();
  }
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
      return <ActivityIndicator color={colors.brand.default} style={{ paddingVertical: 40 }} />;
    }

    if (data.deals.length === 0) {
      return (
        <AppCard variant="ghost" style={styles.empty}>
          <Text style={styles.emptyIcon}>🤝</Text>
          <Text style={styles.emptyTitle}>아직 협찬이 없어요</Text>
          <Text style={styles.emptyDesc}>
            {'+ 추가 버튼으로 첫 협찬을 등록하거나\n미디어 키트에서 인바운드 문의를 받아보세요.'}
          </Text>
        </AppCard>
      );
    }

    if (activeFilter !== '전체') {
      if (filtered.length === 0) {
        const ef = FILTER_EMPTY[activeFilter];
        return (
          <AppCard variant="ghost" style={styles.filterEmpty}>
            <Text style={styles.filterEmptyIcon}>{ef.icon}</Text>
            <Text style={styles.filterEmptyTitle}>{ef.title}</Text>
            <Text style={styles.filterEmptyDesc}>{ef.desc}</Text>
            <TouchableOpacity
              style={styles.filterEmptyClear}
              onPress={() => setActiveFilter('전체')}
              activeOpacity={0.8}
            >
              <Text style={styles.filterEmptyClearText}>전체 협찬 보기</Text>
            </TouchableOpacity>
          </AppCard>
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
          <PipelineSectionHeader status={status} count={group.length} />
          {group.map((deal) => (
            <DealCard key={deal.id} deal={deal} onPress={() => setSelectedDeal(deal)} />
          ))}
        </View>
      );
    });
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.title}>협찬 관리</Text>
        <View style={styles.headerBtns}>
          <TouchableOpacity
            style={styles.inboxBtn}
            onPress={() => navigation.navigate('Inquiries')}
            activeOpacity={0.85}
          >
            <Text style={styles.inboxBtnText}>📬 문의함</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => setShowAddModal(true)}
            activeOpacity={0.85}
          >
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

        <ProposalBanner
          proposals={proposals}
          onAccept={handleAcceptProposal}
          onReject={rejectProposal}
        />

        <AutoSuggestBanner
          suggestions={autoSuggestions}
          onPress={handleSuggestionPress}
          onDismiss={handleSuggestionDismiss}
        />

        <View style={styles.list}>{renderDeals()}</View>

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
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: space.screen, paddingVertical: space.xl,
  },
  title:      { ...typography.screenTitle, color: colors.text.primary },
  headerBtns: { flexDirection: 'row', gap: space.sm },
  inboxBtn: {
    backgroundColor: colors.semantic.warningBg,
    paddingHorizontal: space.sm + 2, paddingVertical: space.sm,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.semantic.warningBg,
  },
  inboxBtnText: { ...typography.buttonSm, color: colors.semantic.warningMid },
  addBtn: {
    backgroundColor: colors.brand.default,
    paddingHorizontal: space.md, paddingVertical: space.sm,
    borderRadius: radius.md, ...shadows.fab,
  },
  addBtnText: { ...typography.buttonSm, color: '#fff' },
  scroll:     { paddingHorizontal: space.screen },
  list:       {},

  empty: { alignItems: 'center', paddingVertical: space.xxxl, gap: space.sm },
  emptyIcon:  { fontSize: 44, marginBottom: space.xs },
  emptyTitle: { ...typography.subheading, color: colors.text.primary },
  emptyDesc:  { ...typography.caption, color: colors.text.muted, textAlign: 'center', lineHeight: 20 },

  filterEmpty:     { alignItems: 'center', paddingVertical: space.xxl, gap: space.sm },
  filterEmptyIcon: { fontSize: 36, marginBottom: space.xs },
  filterEmptyTitle:{ ...typography.cardTitle, color: colors.text.primary },
  filterEmptyDesc: { ...typography.caption, color: colors.text.muted, textAlign: 'center', lineHeight: 20, paddingHorizontal: space.xxl },
  filterEmptyClear:{ marginTop: space.sm, backgroundColor: colors.brand.soft, paddingHorizontal: space.xl, paddingVertical: space.sm + 2, borderRadius: radius.md },
  filterEmptyClearText: { ...typography.buttonSm, color: colors.brand.default },

  fab: {
    position: 'absolute', right: space.screen,
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: colors.brand.default,
    alignItems: 'center', justifyContent: 'center',
    ...shadows.fab,
  },
  fabText: { fontSize: 24, color: '#fff', fontWeight: '300', lineHeight: 28 },
});
