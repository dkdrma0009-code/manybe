import React from 'react';
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
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../../hooks/useAuth';
import { useHomeData } from '../../hooks/useHomeData';
import { useSocialChannels } from '../../hooks/useSocialChannels';
import { useTimeline } from '../../hooks/useTimeline';
import { useAutomation } from '../../hooks/useAutomation';
import { useOperationalContext } from '../../hooks/useOperationalContext';
import { useBriefing } from '../../hooks/useBriefing';
import { MorningBriefing } from '../../components/MorningBriefing';
import { TimelineFeed } from '../../components/TimelineFeed';
import { TimelineItem } from '../../types/timeline';
import { SmartRecommendations } from '../../components/SmartRecommendations';
import { SmartRecommendation } from '../../types/automation';
import { DailyDigest } from '../../components/DailyDigest';
import { FocusCard } from '../../components/FocusCard';
import { FocusItem } from '../../services/DecisionEngine';
import { useDecisionEngine } from '../../hooks/useDecisionEngine';
import { recordEvent } from '../../services/OperationalMemory';
import { useActivation } from '../../hooks/useActivation';
import { ActivationChecklist } from '../../components/ActivationChecklist';
import { useActionCenter } from '../../hooks/useActionCenter';
import { AppCard, AppBadge, AppSection } from '../../components/ui';
import { theme } from '../../constants/theme';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { useRealtime } from '../../context/RealtimeContext';

const { colors, space, radius, shadows, typography } = theme;

function formatWon(n: number): string {
  if (n >= 100_000_000) return `${Math.floor(n / 100_000_000)}억`;
  if (n >= 10_000) return `${Math.floor(n / 10_000)}만`;
  return n.toLocaleString('ko-KR');
}

// ─── Priority Collab Block — top active deal shown prominently ────────────────

function PriorityCollabBlock({
  deal,
  onPress,
}: {
  deal: { id: string; brand: string; initial: string; initBg: string; amount: number; statusLabel: string; statusBg: string; statusColor: string };
  onPress: () => void;
}) {
  return (
    <TouchableOpacity activeOpacity={0.82} onPress={onPress} style={s.priorityWrap}>
      <View style={s.priorityCard}>
        <View style={s.priorityLeft}>
          <View style={[s.priorityAvatar, { backgroundColor: deal.initBg }]}>
            <Text style={s.priorityAvatarText}>{deal.initial}</Text>
          </View>
          <View style={s.priorityInfo}>
            <Text style={s.priorityEyebrow}>우선 협찬</Text>
            <Text style={s.priorityBrand} numberOfLines={1}>{deal.brand}</Text>
            <View style={[s.priorityBadge, { backgroundColor: deal.statusBg }]}>
              <Text style={[s.priorityBadgeText, { color: deal.statusColor }]}>{deal.statusLabel}</Text>
            </View>
          </View>
        </View>
        <View style={s.priorityRight}>
          {deal.amount > 0 && (
            <>
              <Text style={s.priorityAmount}>{formatWon(deal.amount)}</Text>
              <Text style={s.priorityAmountUnit}>원</Text>
            </>
          )}
          <Text style={s.priorityArrow}>›</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Status strip ─────────────────────────────────────────────────────────────

function StatusStrip({
  activeCount,
  deadlineCount,
  pendingSettlement,
}: {
  activeCount: number;
  deadlineCount: number;
  pendingSettlement: number;
}) {
  return (
    <View style={s.strip}>
      <View style={s.stripItem}>
        <Text style={s.stripValue}>{activeCount}</Text>
        <Text style={s.stripLabel}>진행 중</Text>
      </View>
      <View style={s.stripDivider} />
      <View style={s.stripItem}>
        <Text style={[s.stripValue, deadlineCount > 0 && s.stripValueUrgent]}>
          {deadlineCount > 0 ? deadlineCount : '—'}
        </Text>
        <Text style={s.stripLabel}>마감 임박</Text>
      </View>
      <View style={s.stripDivider} />
      <View style={[s.stripItem, { flex: 1.5 }]}>
        <Text style={[s.stripValue, pendingSettlement > 0 && s.stripValuePending, { fontSize: pendingSettlement > 0 ? 15 : 18 }]}>
          {pendingSettlement > 0 ? `${formatWon(pendingSettlement)}만` : '—'}
        </Text>
        <Text style={s.stripLabel}>정산 대기</Text>
      </View>
    </View>
  );
}

// ─── AI Action Banner ─────────────────────────────────────────────────────────

function AIActionBanner({ count, onPress }: { count: number; onPress: () => void }) {
  return (
    <TouchableOpacity activeOpacity={0.8} onPress={onPress} style={s.aiBannerWrap}>
      <AppCard variant="ai" padding="md" style={s.aiBanner}>
        <View style={s.aiBannerLeft}>
          <AppBadge label="AI" variant="ai" size="sm" icon="✦" />
          <View style={s.aiBannerText}>
            <Text style={s.aiBannerTitle}>검토할 AI 제안 {count}건</Text>
            <Text style={s.aiBannerSub}>팔로업 · 정산 초안이 준비됐어요</Text>
          </View>
        </View>
        <Text style={s.aiBannerArrow}>›</Text>
      </AppCard>
    </TouchableOpacity>
  );
}

// ─── Deal row ─────────────────────────────────────────────────────────────────

function DealRow({
  deal,
  onPress,
}: {
  deal: { id: string; brand: string; initial: string; initBg: string; amount: number; statusLabel: string; statusBg: string; statusColor: string };
  onPress: () => void;
}) {
  return (
    <TouchableOpacity activeOpacity={0.82} onPress={onPress}>
      <AppCard padding={0} style={s.dealCard}>
        <View style={[s.dealAvatar, { backgroundColor: deal.initBg }]}>
          <Text style={s.dealAvatarText}>{deal.initial}</Text>
        </View>
        <View style={s.dealInfo}>
          <Text style={s.dealBrand}>{deal.brand}</Text>
          <Text style={s.dealAmount}>
            {deal.amount > 0 ? `${formatWon(deal.amount)}원` : '금액 미정'}
          </Text>
        </View>
        <View style={[s.dealStatusPill, { backgroundColor: deal.statusBg }]}>
          <Text style={[s.dealStatusText, { color: deal.statusColor }]}>{deal.statusLabel}</Text>
        </View>
      </AppCard>
    </TouchableOpacity>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const { user } = useAuth();
  const { data, loading, refetch } = useHomeData(user?.id);
  const { channels, formatCount } = useSocialChannels(user?.id);
  const { groups: timelineGroups, unreadCount, loading: timelineLoading, refetch: timelineRefetch, markRead } = useTimeline(user?.id);
  const { recommendations, dismissRecommendation } = useAutomation(user?.id);
  const { snapshot, refetch: ctxRefetch } = useOperationalContext(user?.id);
  const { briefing, refetch: briefingRefetch } = useBriefing(user?.id);
  const { focusItems, refetch: decisionRefetch } = useDecisionEngine(user?.id);
  const { dealsVersion, inquiriesVersion } = useRealtime();
  const activation = useActivation();
  const { pendingCount, load: loadActions } = useActionCenter();

  React.useEffect(() => { loadActions(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  React.useEffect(() => { refetch(); timelineRefetch(); ctxRefetch(); decisionRefetch(); briefingRefetch(); }, [dealsVersion, inquiriesVersion]); // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => {
    if (loading) return;
    if (data.dealCount > 0)      activation.mark('first_deal_added');
    if (data.totalRevenue > 0)   activation.mark('first_revenue_recorded');
    if (channels.length > 0)     activation.mark('channel_connected');
  }, [loading, data.dealCount, data.totalRevenue, channels.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const userName = user?.user_metadata?.full_name ?? user?.email?.split('@')[0] ?? '크리에이터';

  const deadlineCount = data.actionItems.filter(
    (i) => i.type === 'deal_deadline_today' || i.type === 'deal_deadline_week',
  ).length;
  const hasTodayDeadline = data.actionItems.some((i) => i.type === 'deal_deadline_today');
  const hasUrgentItems   = hasTodayDeadline || data.newInquiryCount > 0;

  const greetingSub = snapshot?.summaryText
    ?? (unreadCount > 0 ? `처리할 항목 ${unreadCount}건 있어요`
      : hasTodayDeadline ? '오늘 마감 협찬이 있어요'
      : data.activeDeals.length > 0 ? `협찬 ${data.activeDeals.length}건 진행 중`
      : '새 협찬을 시작해보세요');

  const priorityDeal = data.activeDeals[0] ?? null;

  function handleTimelineItemPress(item: TimelineItem) {
    if (!item.navigateTo) return;
    const t = item.navigateTo;
    if (t.screen === 'deals')         navigation.navigate('Main', { screen: '스튜디오' } as any);
    else if (t.screen === 'inquiries') navigation.navigate('Inquiries');
    else if (t.screen === 'calendar')  navigation.navigate('Main', { screen: '캘린더' } as any);
    else if (t.screen === 'revenue')   navigation.navigate('Main', { screen: '스튜디오' } as any);
    else if (t.screen === 'BrandDetail') navigation.navigate('BrandDetail', { brand: t.brand });
  }

  function handleFocusItemPress(item: FocusItem) {
    if (item.navigateTo === 'deals')        navigation.navigate('Main', { screen: '스튜디오' } as any);
    else if (item.navigateTo === 'revenue')   navigation.navigate('Main', { screen: '스튜디오' } as any);
    else if (item.navigateTo === 'inquiries') navigation.navigate('Inquiries');
    else if (item.navigateTo === 'calendar')  navigation.navigate('Main', { screen: '캘린더' } as any);
  }

  function handleDigestNavigate(target: string) {
    if (target === 'deals')          navigation.navigate('Main', { screen: '스튜디오' } as any);
    else if (target === 'revenue')   navigation.navigate('Main', { screen: '스튜디오' } as any);
    else if (target === 'inquiries') navigation.navigate('Inquiries');
    else if (target === 'calendar')  navigation.navigate('Main', { screen: '캘린더' } as any);
  }

  function handleRecommendationPress(rec: SmartRecommendation) {
    recordEvent('recommendation_actioned', { entityId: rec.id, metadata: { recommendationType: rec.type } });
    if (!rec.navigateTo) return;
    if (rec.navigateTo === 'deals')         navigation.navigate('Main', { screen: '스튜디오' } as any);
    else if (rec.navigateTo === 'revenue')   navigation.navigate('Main', { screen: '스튜디오' } as any);
    else if (rec.navigateTo === 'inquiries') navigation.navigate('Inquiries');
    else if (rec.navigateTo === 'calendar')  navigation.navigate('Main', { screen: '캘린더' } as any);
  }

  function handleDismissRecommendation(id: string) {
    const rec = recommendations.find((r) => r.id === id);
    if (rec) recordEvent('recommendation_dismissed', { entityId: id, metadata: { recommendationType: rec.type } });
    dismissRecommendation(id);
  }

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor={colors.brand.default} />}
      >
        {/* ── 헤더 ─────────────────────────────────────────────────────── */}
        <View style={s.header}>
          <View style={s.headerTitle}>
            <Text style={s.greeting}>{userName}</Text>
            {!loading && (
              <Text style={[s.greetingSub, hasUrgentItems && s.greetingSubUrgent]}>
                {greetingSub}
              </Text>
            )}
          </View>
          <View style={s.headerActions}>
            <TouchableOpacity
              style={s.iconBtn}
              onPress={() => navigation.navigate('Notifications')}
              activeOpacity={0.8}
            >
              <Text style={s.iconBtnText}>🔔</Text>
              {unreadCount > 0 && <View style={s.notifDot} />}
            </TouchableOpacity>
            <TouchableOpacity
              style={s.avatarBtn}
              onPress={() => navigation.navigate('Profile')}
              activeOpacity={0.85}
            >
              <Text style={s.avatarText}>{userName.charAt(0).toUpperCase()}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── AI 액션 센터 ─────────────────────────────────────────────── */}
        {pendingCount > 0 && (
          <AIActionBanner
            count={pendingCount}
            onPress={() => navigation.navigate('ActionCenter')}
          />
        )}

        {/* ── 시작 가이드 ──────────────────────────────────────────────── */}
        {!loading && !activation.isAllDone && (
          <ActivationChecklist
            state={activation.state}
            pct={activation.pct}
            completedCount={activation.completedCount}
            totalCount={activation.totalCount}
          />
        )}

        {loading ? (
          <ActivityIndicator color={colors.brand.default} style={{ paddingVertical: 48 }} />
        ) : (
          <>
            {/* ── 우선 협찬 블록 ──────────────────────────────────────── */}
            {priorityDeal && (
              <PriorityCollabBlock
                deal={priorityDeal}
                onPress={() => navigation.navigate('Main', { screen: '스튜디오' } as any)}
              />
            )}

            {/* ── 현황 스트립 ─────────────────────────────────────────── */}
            <StatusStrip
              activeCount={data.activeDeals.length}
              deadlineCount={deadlineCount}
              pendingSettlement={data.pendingSettlement}
            />

            {/* ── 오늘의 브리핑 ────────────────────────────────────────── */}
            {briefing ? (
              <MorningBriefing
                briefing={briefing}
                healthScore={snapshot?.healthScore}
                onNavigate={handleDigestNavigate}
              />
            ) : snapshot ? (
              <DailyDigest snapshot={snapshot} onNavigate={handleDigestNavigate} />
            ) : null}

            {/* ── TOP 3 집중 과제 ──────────────────────────────────────── */}
            <FocusCard items={focusItems} onPress={handleFocusItemPress} />

            {/* ── 운영 현황 타임라인 ───────────────────────────────────── */}
            <AppSection
              title="운영 현황"
              action={unreadCount > 0 ? (
                <TouchableOpacity onPress={() => navigation.navigate('Notifications')}>
                  <Text style={s.sectionLink}>전체 보기</Text>
                </TouchableOpacity>
              ) : undefined}
            >
              <TimelineFeed
                groups={timelineGroups}
                loading={timelineLoading}
                maxItems={5}
                onItemPress={handleTimelineItemPress}
                onMarkRead={markRead}
                onViewAll={() => navigation.navigate('Notifications')}
              />
            </AppSection>

            {/* ── 스마트 제안 ─────────────────────────────────────────── */}
            <SmartRecommendations
              recommendations={recommendations}
              onPress={handleRecommendationPress}
              onDismiss={handleDismissRecommendation}
            />

            {/* ── 활성 협찬 ───────────────────────────────────────────── */}
            <AppSection
              title="활성 협찬"
              action={
                <TouchableOpacity onPress={() => navigation.navigate('Main', { screen: '스튜디오' } as any)}>
                  <Text style={s.sectionLink}>전체보기</Text>
                </TouchableOpacity>
              }
            >
              {data.activeDeals.length === 0 ? (
                <AppCard variant="ghost" style={s.emptyBlock}>
                  <Text style={s.emptyIcon}>📮</Text>
                  <Text style={s.emptyTitle}>진행 중인 협찬이 없어요</Text>
                  <Text style={s.emptyDesc}>브랜드 문의를 받거나 협찬을 직접 등록해보세요</Text>
                  <View style={s.emptyBtns}>
                    <TouchableOpacity style={s.emptyBtnSoft} onPress={() => navigation.navigate('Inquiries')}>
                      <Text style={s.emptyBtnSoftText}>문의함</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.emptyBtnFill} onPress={() => navigation.navigate('Main', { screen: '스튜디오' } as any)}>
                      <Text style={s.emptyBtnFillText}>협찬 관리</Text>
                    </TouchableOpacity>
                  </View>
                </AppCard>
              ) : (
                <View style={s.dealList}>
                  {data.activeDeals.map((deal) => (
                    <DealRow
                      key={deal.id}
                      deal={deal}
                      onPress={() => navigation.navigate('Main', { screen: '스튜디오' } as any)}
                    />
                  ))}
                </View>
              )}
            </AppSection>
          </>
        )}

        {/* ── 소셜 채널 ─────────────────────────────────────────────────── */}
        <AppSection
          title="연결된 채널"
          action={
            <TouchableOpacity onPress={() => navigation.navigate('YouTubeConnect')}>
              <Text style={s.sectionLink}>{channels.length > 0 ? '관리' : '+ 연동'}</Text>
            </TouchableOpacity>
          }
        >
          {channels.length === 0 ? (
            <TouchableOpacity activeOpacity={0.85} onPress={() => navigation.navigate('YouTubeConnect')}>
              <AppCard variant="ghost" style={s.channelEmpty}>
                <Text style={s.channelEmptyIcon}>📺</Text>
                <View style={s.channelEmptyBody}>
                  <Text style={s.channelEmptyTitle}>YouTube 채널을 연동하세요</Text>
                  <Text style={s.channelEmptyDesc}>구독자·조회수를 홈에서 바로 확인</Text>
                </View>
                <Text style={s.rowArrow}>›</Text>
              </AppCard>
            </TouchableOpacity>
          ) : (
            channels.map((ch) => (
              <AppCard key={ch.id} style={s.channelCard}>
                <View style={s.channelHeader}>
                  <View style={s.ytBadge}>
                    <Text style={s.ytBadgeText}>▶</Text>
                  </View>
                  <Text style={s.channelName} numberOfLines={1}>{ch.channel_name}</Text>
                </View>
                <View style={s.channelStats}>
                  <View style={s.channelStat}>
                    <Text style={s.statValue}>{formatCount(ch.subscriber_count)}</Text>
                    <Text style={s.statLabel}>구독자</Text>
                  </View>
                  <View style={s.statDivider} />
                  <View style={s.channelStat}>
                    <Text style={s.statValue}>
                      {ch.video_count > 0 ? formatCount(Math.floor(ch.view_count / ch.video_count)) : '—'}
                    </Text>
                    <Text style={s.statLabel}>평균 조회수</Text>
                  </View>
                  <View style={s.statDivider} />
                  <View style={s.channelStat}>
                    <Text style={s.statValue}>{ch.video_count}</Text>
                    <Text style={s.statLabel}>영상</Text>
                  </View>
                </View>
              </AppCard>
            ))
          )}
        </AppSection>

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingHorizontal: space.screen, paddingBottom: space.lg },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: space.xl,
    paddingBottom: space.lg,
  },
  headerTitle:       { flex: 1 },
  greeting:          { fontSize: 22, fontWeight: '700', color: colors.text.primary, letterSpacing: -0.5 },
  greetingSub:       { ...typography.caption, color: colors.text.muted, marginTop: 3 },
  greetingSubUrgent: { ...typography.caption, color: colors.brand.default, fontWeight: '600', marginTop: 3 },
  headerActions:     { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  iconBtn: {
    width: 38, height: 38, borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.default,
    alignItems: 'center', justifyContent: 'center',
  },
  iconBtnText: { fontSize: 17 },
  notifDot: {
    position: 'absolute', top: 8, right: 8,
    width: 7, height: 7, borderRadius: 4,
    backgroundColor: colors.semantic.error,
  },
  avatarBtn: {
    width: 38, height: 38, borderRadius: radius.md,
    backgroundColor: colors.brand.default,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  // AI Banner
  aiBannerWrap: { marginBottom: space.md },
  aiBanner: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 0,
  },
  aiBannerLeft:  { flexDirection: 'row', alignItems: 'center', gap: space.sm, flex: 1 },
  aiBannerText:  { flex: 1 },
  aiBannerTitle: { ...typography.bodyStrong, color: colors.ai.text },
  aiBannerSub:   { ...typography.caption, color: colors.text.tertiary, marginTop: 2 },
  aiBannerArrow: { fontSize: 20, color: colors.ai.text, opacity: 0.5 },

  // Priority collab block
  priorityWrap: { marginBottom: space.md },
  priorityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.default,
    padding: space.md,
    ...shadows.sm,
  },
  priorityLeft:      { flexDirection: 'row', alignItems: 'center', gap: space.md, flex: 1 },
  priorityAvatar: {
    width: 48, height: 48, borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  priorityAvatarText: { fontSize: 18, fontWeight: '700', color: '#fff' },
  priorityInfo:       { flex: 1, gap: 4 },
  priorityEyebrow:    { fontSize: 10, fontWeight: '600', color: colors.text.muted, textTransform: 'uppercase', letterSpacing: 0.8 },
  priorityBrand:      { fontSize: 16, fontWeight: '700', color: colors.text.primary },
  priorityBadge:      { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill },
  priorityBadgeText:  { fontSize: 11, fontWeight: '600' },
  priorityRight:      { alignItems: 'flex-end', gap: 2 },
  priorityAmount:     { fontSize: 17, fontWeight: '700', color: colors.text.primary },
  priorityAmountUnit: { fontSize: 12, color: colors.text.muted },
  priorityArrow:      { fontSize: 18, color: colors.border.medium, marginTop: 2 },

  // Status strip
  strip: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border.default,
    paddingVertical: space.md,
    marginBottom: space.md,
    ...shadows.xs,
  },
  stripItem:        { flex: 1, alignItems: 'center', gap: 4 },
  stripDivider:     { width: StyleSheet.hairlineWidth, backgroundColor: colors.border.faint },
  stripValue:       { fontSize: 18, fontWeight: '700', color: colors.text.primary },
  stripValueUrgent: { color: colors.semantic.error },
  stripValuePending:{ color: colors.semantic.successMid },
  stripLabel:       { ...typography.caption, color: colors.text.muted },

  // Section link
  sectionLink: { ...typography.label, color: colors.brand.default },

  // Deal list
  dealList: { gap: space.xs + 2 },
  dealCard: {
    flexDirection: 'row', alignItems: 'center',
    padding: space.md, marginBottom: 0, gap: space.md,
  },
  dealAvatar: {
    width: 40, height: 40, borderRadius: radius.md,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  dealAvatarText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  dealInfo:       { flex: 1, gap: 2 },
  dealBrand:      { ...typography.bodyStrong, color: colors.text.primary },
  dealAmount:     { ...typography.caption, color: colors.text.muted },
  dealStatusPill: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: radius.pill },
  dealStatusText: { fontSize: 11, fontWeight: '600' },

  // Empty state
  emptyBlock: { alignItems: 'center', paddingVertical: space.xxl, gap: space.sm },
  emptyIcon:  { fontSize: 32, marginBottom: space.xs },
  emptyTitle: { ...typography.subheading, color: colors.text.primary },
  emptyDesc:  { ...typography.caption, color: colors.text.muted, textAlign: 'center', lineHeight: 20 },
  emptyBtns:  { flexDirection: 'row', gap: space.sm, alignSelf: 'stretch', marginTop: space.sm },
  emptyBtnSoft: {
    flex: 1, paddingVertical: space.sm + 2,
    borderRadius: radius.md, backgroundColor: colors.brand.softer,
    alignItems: 'center',
  },
  emptyBtnSoftText: { ...typography.buttonSm, color: colors.brand.deep },
  emptyBtnFill: {
    flex: 1, paddingVertical: space.sm + 2,
    borderRadius: radius.md, backgroundColor: colors.brand.default,
    alignItems: 'center', ...shadows.fab,
  },
  emptyBtnFillText: { ...typography.buttonSm, color: '#fff' },

  // Channel
  channelEmpty: {
    flexDirection: 'row', alignItems: 'center',
    gap: space.md, paddingVertical: space.lg,
  },
  channelEmptyIcon:  { fontSize: 24 },
  channelEmptyBody:  { flex: 1, gap: 2 },
  channelEmptyTitle: { ...typography.bodyStrong, color: colors.text.primary },
  channelEmptyDesc:  { ...typography.caption, color: colors.text.muted },
  rowArrow:          { fontSize: 20, color: colors.border.medium },
  channelCard:       { marginBottom: space.sm },
  channelHeader:     { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginBottom: space.md },
  ytBadge: {
    width: 28, height: 28, borderRadius: radius.sm,
    backgroundColor: '#FF0000', alignItems: 'center', justifyContent: 'center',
  },
  ytBadgeText:  { color: '#fff', fontSize: 10, fontWeight: '800' },
  channelName:  { flex: 1, ...typography.bodyStrong, color: colors.text.primary },
  channelStats: {
    flexDirection: 'row',
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    paddingVertical: space.sm + 2,
    paddingHorizontal: space.md,
  },
  channelStat:  { flex: 1, alignItems: 'center', gap: 3 },
  statValue:    { ...typography.heading, color: colors.text.primary },
  statLabel:    { ...typography.caption, color: colors.brand.default },
  statDivider:  { width: StyleSheet.hairlineWidth, backgroundColor: colors.border.faint },
});
