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
import { useHomeData, ActionItem } from '../../hooks/useHomeData';
import { useSocialChannels } from '../../hooks/useSocialChannels';
import { colors } from '../../constants/colors';
import { tokens } from '../../constants/tokens';
import { typography } from '../../constants/typography';
import { shadows } from '../../constants/shadows';
import { RootStackParamList } from '../../navigation/AppNavigator';

function formatWon(n: number): string {
  if (n >= 100000000) return `${Math.floor(n / 100000000)}억원`;
  if (n >= 10000) return `${Math.floor(n / 10000)}만원`;
  return n.toLocaleString('ko-KR') + '원';
}

// ─── Workflow summary ─────────────────────────────────────────────────────────

function WorkflowSummaryCard({
  activeCount,
  deadlineCount,
  pendingSettlement,
}: {
  activeCount: number;
  deadlineCount: number;
  pendingSettlement: number;
}) {
  return (
    <View style={wfs.card}>
      <View style={wfs.row}>
        <View style={wfs.item}>
          <Text style={wfs.value}>{activeCount}<Text style={wfs.unit}>건</Text></Text>
          <Text style={wfs.label}>파이프라인</Text>
        </View>
        <View style={wfs.divider} />
        <View style={wfs.item}>
          <Text style={[wfs.value, deadlineCount > 0 && wfs.urgent, deadlineCount === 0 && wfs.calm]}>
            {deadlineCount > 0 ? `${deadlineCount}건` : '없음'}
          </Text>
          <Text style={wfs.label}>마감 임박</Text>
        </View>
        <View style={wfs.divider} />
        <View style={[wfs.item, { flex: 1.5 }]}>
          <Text style={[
            wfs.value,
            pendingSettlement > 0 && wfs.pending,
            pendingSettlement > 0 && { fontSize: 16 },
            pendingSettlement === 0 && wfs.calm,
          ]}>
            {pendingSettlement > 0 ? formatWon(pendingSettlement) : '없음'}
          </Text>
          <Text style={wfs.label}>정산 대기</Text>
        </View>
      </View>
    </View>
  );
}

const wfs = StyleSheet.create({
  card: {
    backgroundColor: '#fff', borderRadius: 18, padding: 20, marginBottom: 20,
    ...shadows.card,
  },
  row:     { flexDirection: 'row', alignItems: 'center' },
  item:    { flex: 1, alignItems: 'center' },
  divider: { width: 1, height: 36, backgroundColor: tokens.bgDeeper },
  value:   { ...typography.screenTitle, color: tokens.ink, marginBottom: 4 },
  unit:    { ...typography.cardSubtitle },
  label:   { ...typography.caption, color: tokens.ink4 },
  urgent:  { color: tokens.urgent },
  pending: { color: tokens.uploaded },
  calm:    { fontSize: 16, color: tokens.ink4 },
});

// ─── Action card ──────────────────────────────────────────────────────────────

function ActionCard({ item, onPress }: { item: ActionItem; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[
        action.card,
        { backgroundColor: item.bg },
        item.urgent && { borderWidth: 1.5, borderColor: item.color + '66' },
      ]}
      onPress={onPress}
      activeOpacity={0.82}
    >
      <View style={[action.iconBg, { backgroundColor: item.urgent ? item.color : item.bg }]}>
        <Text style={action.icon}>{item.icon}</Text>
      </View>
      <View style={action.body}>
        <Text style={[action.title, { color: item.color }]} numberOfLines={1}>{item.title}</Text>
        <Text style={action.sub} numberOfLines={1}>{item.subtitle}</Text>
      </View>
      {item.urgent && <View style={action.urgentDot} />}
      <Text style={[action.arrow, { color: item.color }]}>›</Text>
    </TouchableOpacity>
  );
}

const action = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 14, padding: 14, marginBottom: 8,
  },
  iconBg: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center', opacity: 0.85,
  },
  icon:      { fontSize: 18 },
  body:      { flex: 1 },
  title:     { ...typography.bodyStrong, marginBottom: 2 },
  sub:       { ...typography.metadata, color: tokens.ink3 },
  urgentDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: tokens.urgent },
  arrow:     { fontSize: 20, fontWeight: '600' },
});

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const { user } = useAuth();
  const { data, loading, refetch } = useHomeData(user?.id);
  const { channels, formatCount } = useSocialChannels(user?.id);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const userName =
    user?.user_metadata?.full_name ?? user?.email?.split('@')[0] ?? '크리에이터';

  const deadlineCount = data.actionItems.filter(
    (i) => i.type === 'deal_deadline_today' || i.type === 'deal_deadline_week'
  ).length;
  const totalPipelineValue = data.activeDeals.reduce((sum, d) => sum + d.amount, 0);
  const hasTodayDeadline = data.actionItems.some((i) => i.type === 'deal_deadline_today');
  const hasUrgentItems = hasTodayDeadline || data.newInquiryCount > 0;

  const greetingSub =
    data.newInquiryCount > 0
      ? `새 협찬 문의 ${data.newInquiryCount}건이 도착했어요`
      : hasTodayDeadline
        ? '오늘 마감 협찬이 있어요'
        : data.actionItems.length > 0
          ? `처리할 항목 ${data.actionItems.length}개 있어요`
          : data.activeDeals.length > 0
            ? `협찬 ${data.activeDeals.length}건 순조롭게 진행 중`
            : '새 협찬을 시작해보세요';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} />}
      >
        {/* 헤더 */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>안녕하세요, {userName}님 👋</Text>
            {!loading && (
              <Text style={hasUrgentItems ? styles.greetingSubUrgent : styles.greetingSub}>
                {greetingSub}
              </Text>
            )}
          </View>
          <TouchableOpacity
            style={styles.avatar}
            onPress={() => navigation.navigate('Profile')}
            activeOpacity={0.85}
          >
            <Text style={styles.avatarText}>{userName.charAt(0).toUpperCase()}</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ paddingVertical: 48 }} />
        ) : (
          <>
            {/* 협찬 워크플로우 현황 */}
            <WorkflowSummaryCard
              activeCount={data.activeDeals.length}
              deadlineCount={deadlineCount}
              pendingSettlement={data.pendingSettlement}
            />

            {/* 오늘 처리할 항목 */}
            {data.activeDeals.length > 0 && (
              <>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, hasUrgentItems && styles.sectionTitleUrgent]}>
                    {hasUrgentItems ? '지금 처리하세요' : data.actionItems.length > 0 ? '처리할 항목' : '운영 현황'}
                  </Text>
                  {data.actionItems.length > 0 && (
                    <View style={[styles.sectionBadge, hasUrgentItems && styles.sectionBadgeUrgent]}>
                      <Text style={styles.sectionBadgeText}>{data.actionItems.length}</Text>
                    </View>
                  )}
                </View>
                {data.actionItems.length === 0 ? (
                  <View style={styles.allClearCard}>
                    <View style={styles.allClearIconWrap}>
                      <Text style={styles.allClearIconText}>✓</Text>
                    </View>
                    <View style={styles.allClearBody}>
                      <Text style={styles.allClearTitle}>처리할 항목이 없어요</Text>
                      <Text style={styles.allClearSub}>
                        협찬 {data.activeDeals.length}건
                        {totalPipelineValue > 0 ? ` · ${formatWon(totalPipelineValue)} 파이프라인 운영 중` : ' 순조롭게 진행 중이에요'}
                      </Text>
                    </View>
                  </View>
                ) : (
                  data.actionItems.map((item) => (
                    <ActionCard
                      key={item.id}
                      item={item}
                      onPress={() => {
                        if (item.type === 'new_inquiry') {
                          navigation.navigate('Inquiries');
                        } else if (item.type === 'inquiry_pipeline') {
                          navigation.navigate('Main', { screen: '협찬' } as any);
                        } else if (
                          item.type === 'deal_deadline_today' ||
                          item.type === 'deal_deadline_week'
                        ) {
                          navigation.navigate('Main', { screen: '협찬' } as any);
                        } else if (item.type === 'schedule_today') {
                          navigation.navigate('Main', { screen: '캘린더' } as any);
                        } else if (item.type === 'unsettled') {
                          navigation.navigate('Main', { screen: '수익' } as any);
                        }
                      }}
                    />
                  ))
                )}
                <View style={{ height: 16 }} />
              </>
            )}

            {/* 활성 협찬 */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>활성 협찬</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('Main', { screen: '협찬' } as any)}
              >
                <Text style={styles.sectionMore}>전체보기</Text>
              </TouchableOpacity>
            </View>

            {data.activeDeals.length === 0 ? (
              <View style={styles.emptyDeals}>
                <Text style={styles.emptyDealsIcon}>📮</Text>
                <Text style={styles.emptyDealsTitle}>진행 중인 협찬이 없어요</Text>
                <Text style={styles.emptyDealsDesc}>
                  브랜드 문의를 받거나 협찬을 직접 등록해보세요
                </Text>
                <View style={styles.emptyDealsBtns}>
                  <TouchableOpacity
                    style={styles.emptyBtnSecondary}
                    onPress={() => navigation.navigate('Inquiries')}
                  >
                    <Text style={styles.emptyBtnSecondaryText}>📬 문의함</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.emptyBtnPrimary}
                    onPress={() => navigation.navigate('Main', { screen: '협찬' } as any)}
                  >
                    <Text style={styles.emptyBtnPrimaryText}>협찬 관리</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.dealList}>
                {data.activeDeals.map((deal) => (
                  <TouchableOpacity
                    key={deal.id}
                    style={styles.dealCard}
                    activeOpacity={0.85}
                    onPress={() => navigation.navigate('Main', { screen: '협찬' } as any)}
                  >
                    <View style={[styles.dealAvatar, { backgroundColor: deal.initBg }]}>
                      <Text style={styles.dealAvatarText}>{deal.initial}</Text>
                    </View>
                    <View style={styles.dealInfo}>
                      <Text style={styles.dealBrand}>{deal.brand}</Text>
                      <Text style={styles.dealAmount}>
                        {deal.amount > 0
                          ? deal.amount.toLocaleString('ko-KR') + '원'
                          : '금액 미정'}
                      </Text>
                    </View>
                    <View style={[styles.dealStatusBadge, { backgroundColor: deal.statusBg }]}>
                      <Text style={[styles.dealStatusText, { color: deal.statusColor }]}>
                        {deal.statusLabel}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <View style={{ height: 24 }} />
          </>
        )}

        {/* 소셜 채널 현황 */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>소셜 채널</Text>
          <TouchableOpacity onPress={() => navigation.navigate('YouTubeConnect')}>
            <Text style={styles.sectionMore}>{channels.length > 0 ? '관리' : '+ 연동'}</Text>
          </TouchableOpacity>
        </View>

        {channels.length === 0 ? (
          <TouchableOpacity
            style={channelStyle.empty}
            onPress={() => navigation.navigate('YouTubeConnect')}
            activeOpacity={0.85}
          >
            <Text style={channelStyle.emptyIcon}>📺</Text>
            <View style={channelStyle.emptyBody}>
              <Text style={channelStyle.emptyTitle}>YouTube 채널을 연동하세요</Text>
              <Text style={channelStyle.emptyDesc}>구독자·조회수를 홈에서 바로 확인</Text>
            </View>
            <Text style={channelStyle.emptyArrow}>›</Text>
          </TouchableOpacity>
        ) : (
          channels.map((ch) => (
            <View key={ch.id} style={channelStyle.card}>
              <View style={channelStyle.cardHeader}>
                <View style={channelStyle.ytBadge}>
                  <Text style={channelStyle.ytBadgeText}>▶</Text>
                </View>
                <Text style={channelStyle.channelName} numberOfLines={1}>
                  {ch.channel_name}
                </Text>
              </View>
              <View style={channelStyle.stats}>
                <View style={channelStyle.stat}>
                  <Text style={channelStyle.statValue}>{formatCount(ch.subscriber_count)}</Text>
                  <Text style={channelStyle.statLabel}>구독자</Text>
                </View>
                <View style={channelStyle.statDivider} />
                <View style={channelStyle.stat}>
                  <Text style={channelStyle.statValue}>
                    {ch.video_count > 0 ? formatCount(Math.floor(ch.view_count / ch.video_count)) : '-'}
                  </Text>
                  <Text style={channelStyle.statLabel}>평균 조회수</Text>
                </View>
                <View style={channelStyle.statDivider} />
                <View style={channelStyle.stat}>
                  <Text style={channelStyle.statValue}>{ch.video_count}개</Text>
                  <Text style={channelStyle.statLabel}>영상</Text>
                </View>
              </View>
            </View>
          ))
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F3EF' },
  scroll: { paddingHorizontal: 20, paddingBottom: 16 },

  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingVertical: 20,
  },
  greeting:          { ...typography.screenTitle, color: tokens.ink },
  greetingSub:       { ...typography.metadata, color: tokens.ink4, marginTop: 2 },
  greetingSubUrgent: { ...typography.metadata, color: tokens.primary, marginTop: 2, fontWeight: '600' },
  avatar: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 16, fontWeight: '700', color: '#fff' },

  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 12,
  },
  sectionTitle: { ...typography.sectionTitle, color: tokens.ink },
  sectionMore:  { ...typography.metadata, color: colors.primary, fontWeight: '600' },
  sectionBadge: {
    backgroundColor: colors.primary, borderRadius: 10,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  sectionBadgeUrgent: { backgroundColor: tokens.urgent },
  sectionTitleUrgent: { color: tokens.urgent },
  sectionBadgeText: { fontSize: 11, fontWeight: '800', color: '#fff' },

  dealList: { gap: 10, marginBottom: 8 },
  dealCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 16, padding: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  dealAvatar: {
    width: 44, height: 44, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', marginRight: 14,
  },
  dealAvatarText: { fontSize: 18, fontWeight: '700', color: '#fff' },
  dealInfo:       { flex: 1 },
  dealBrand:      { ...typography.cardTitle, color: tokens.ink, marginBottom: 3 },
  dealAmount:     { ...typography.metadata, color: tokens.ink3 },
  dealStatusBadge:{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  dealStatusText: { fontSize: 12, fontWeight: '600' },

  emptyDeals: {
    backgroundColor: '#fff', borderRadius: 18, padding: 28,
    alignItems: 'center', marginBottom: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 6, elevation: 1,
  },
  emptyDealsIcon:  { fontSize: 40, marginBottom: 10 },
  emptyDealsTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A2E', marginBottom: 6 },
  emptyDealsDesc:  { fontSize: 13, color: '#9CA3AF', textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  emptyDealsBtns: { flexDirection: 'row', gap: 10, alignSelf: 'stretch' },
  emptyBtnSecondary: {
    flex: 1, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12,
    backgroundColor: '#F0EFFE', alignItems: 'center', justifyContent: 'center',
  },
  emptyBtnSecondaryText: { fontSize: 13, fontWeight: '700', color: colors.primary },
  emptyBtnPrimary: {
    flex: 1, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  emptyBtnPrimaryText: { fontSize: 13, fontWeight: '700', color: '#fff' },

  allClearCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#F0FDF4', borderRadius: 14, padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: '#BBF7D0',
  },
  allClearIconWrap: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: '#DCFCE7', alignItems: 'center', justifyContent: 'center',
  },
  allClearIconText: { fontSize: 16, color: '#059669', fontWeight: '800' },
  allClearBody:     { flex: 1 },
  allClearTitle:    { fontSize: 14, fontWeight: '700', color: '#166534', marginBottom: 2 },
  allClearSub:      { fontSize: 12, color: '#4B7A5A' },
});

const channelStyle = StyleSheet.create({
  empty: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 8,
    gap: 12, borderWidth: 1.5, borderColor: '#E8E4FF',
  },
  emptyIcon:  { fontSize: 28 },
  emptyBody:  { flex: 1 },
  emptyTitle: { fontSize: 14, fontWeight: '700', color: '#1A1A2E' },
  emptyDesc:  { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  emptyArrow: { fontSize: 22, color: '#D1D5DB' },

  card: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  cardHeader:  { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  ytBadge:     { width: 32, height: 32, borderRadius: 8, backgroundColor: '#FF0000', alignItems: 'center', justifyContent: 'center' },
  ytBadgeText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  channelName: { flex: 1, fontSize: 14, fontWeight: '700', color: '#1A1A2E' },

  stats:       { flexDirection: 'row', backgroundColor: '#F5F3EF', borderRadius: 12, padding: 12 },
  stat:        { flex: 1, alignItems: 'center' },
  statValue:   { fontSize: 16, fontWeight: '800', color: '#1A1A2E', marginBottom: 2 },
  statLabel:   { ...typography.caption, color: tokens.primary },
  statDivider: { width: 1, backgroundColor: 'rgba(110,86,240,0.15)' },
});
