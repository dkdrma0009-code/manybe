import { Text } from '@/components/Text';
import React, { useState } from 'react';
import {
  View, ScrollView, TouchableOpacity,
  StyleSheet, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../../hooks/useAuth';
import { useHomeData } from '../../hooks/useHomeData';
import { useSocialChannels } from '../../hooks/useSocialChannels';
import { useRealtime } from '../../context/RealtimeContext';
import { supabase } from '../../api/supabase';
import { theme } from '../../constants/theme';
import { tokens } from '../../constants/tokens';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { formatWon } from '../../utils/formatters';

const { colors, space, radius, shadows, typography } = theme;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getGreeting(name: string): string {
  const hour = new Date().getHours();
  const firstName = name.split(' ')[0];
  if (hour < 12) return `좋은 아침이에요, ${firstName}님`;
  if (hour < 18) return `${firstName}님,\n오늘 작업 정리됩니다.`;
  return `${firstName}님,\n오늘 하루도 수고했어요.`;
}

function formatDate(): string {
  const now = new Date();
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return `${days[now.getDay()]}요일 · ${now.getMonth() + 1}월 ${now.getDate()}일`;
}



// ─── Priority Card ────────────────────────────────────────────────────────────

function PriorityCard({
  deal,
  onViewMessage,
  onDismiss,
}: {
  deal: { brand: string; statusLabel: string; subtitle?: string };
  onViewMessage: () => void;
  onDismiss: () => void;
}) {
  return (
    <View style={pc.wrap}>
      <View style={pc.bar} />
      <View style={pc.inner}>
        <Text style={pc.eyebrow}>오늘 우선 처리</Text>
        <Text style={pc.brand}>{deal.brand} 협찬 제안에</Text>
        <Text style={pc.title}>오늘 당장이 필요합니다</Text>
        {deal.subtitle && <Text style={pc.sub}>{deal.subtitle}</Text>}
        <View style={pc.actions}>
          <TouchableOpacity style={pc.primaryBtn} onPress={onViewMessage} activeOpacity={0.85}>
            <Text style={pc.primaryBtnText}>메시지 보기</Text>
          </TouchableOpacity>
          <TouchableOpacity style={pc.secondaryBtn} onPress={onDismiss} activeOpacity={0.85}>
            <Text style={pc.secondaryBtnText}>나중에</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const pc = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.faint,
    overflow: 'hidden',
    marginBottom: space.xl,
    ...shadows.sm,
  },
  bar:   { width: 3, backgroundColor: colors.brand.default },
  inner: { flex: 1, padding: space.lg },
  eyebrow: {
    ...typography.label,
    color: colors.brand.default,
    marginBottom: 6,
  },
  brand: {
    ...typography.bodyStrong,
    color: colors.text.primary,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text.primary,
    letterSpacing: -0.2,
    marginBottom: 4,
  },
  sub: {
    ...typography.caption,
    color: colors.text.tertiary,
    marginBottom: space.md,
  },
  actions: { flexDirection: 'row', gap: space.sm, marginTop: space.sm },
  primaryBtn: {
    backgroundColor: colors.ai.from,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm + 2,
    borderRadius: radius.md,
  },
  primaryBtnText: { ...typography.buttonSm, color: '#fff' },
  secondaryBtn: {
    paddingHorizontal: space.lg,
    paddingVertical: space.sm + 2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  secondaryBtnText: { ...typography.buttonSm, color: colors.text.muted },
});

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionHeader({
  title,
  count,
  onMore,
}: {
  title: string;
  count?: number;
  onMore?: () => void;
}) {
  return (
    <View style={sh.wrap}>
      <Text style={sh.title}>{title}</Text>
      <TouchableOpacity onPress={onMore} activeOpacity={0.7} disabled={!onMore}>
        {count !== undefined && (
          <Text style={sh.count}>{count}개 활성</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const sh = StyleSheet.create({
  wrap:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: space.sm + 2 },
  title: { ...typography.sectionTitle, color: colors.text.primary },
  count: { ...typography.caption, color: colors.text.tertiary },
});

// ─── Channel Card ─────────────────────────────────────────────────────────────

const PLATFORM_ICON: Record<string, { name: React.ComponentProps<typeof Ionicons>['name']; color: string }> = {
  youtube:   { name: 'logo-youtube',   color: '#FF0000' },
  instagram: { name: 'logo-instagram', color: '#E1306C' },
  tiktok:    { name: 'logo-tiktok',    color: '#010101' },
};

function ChannelCard({
  ch,
  formatCount,
  onPress,
}: {
  ch: import('../../hooks/useSocialChannels').SocialChannel;
  formatCount: (n: number) => string;
  onPress: () => void;
}) {
  const cfg = PLATFORM_ICON[ch.platform] ?? { name: 'globe-outline' as const, color: '#888' };
  const syncedAt = new Date(ch.updated_at).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' });
  return (
    <TouchableOpacity style={cc.card} onPress={onPress} activeOpacity={0.85}>
      <View style={cc.top}>
        <View style={[cc.iconWrap, { backgroundColor: cfg.color + '12' }]}>
          <Ionicons name={cfg.name} size={20} color={cfg.color} />
        </View>
        <View style={cc.titleWrap}>
          <Text style={cc.name} numberOfLines={1}>
            {ch.handle ? `@${ch.handle.replace(/^@/, '')}` : ch.channel_name}
          </Text>
          <Text style={cc.sync}>{syncedAt} 동기화</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.text.muted} />
      </View>
      <View style={cc.stats}>
        <View style={cc.stat}>
          <Text style={cc.statVal}>{formatCount(ch.subscriber_count)}</Text>
          <Text style={cc.statLabel}>구독자</Text>
        </View>
        <View style={cc.divider} />
        <View style={cc.stat}>
          <Text style={cc.statVal}>{formatCount(ch.view_count)}</Text>
          <Text style={cc.statLabel}>총 조회수</Text>
        </View>
        <View style={cc.divider} />
        <View style={cc.stat}>
          <Text style={cc.statVal}>{ch.video_count.toLocaleString()}</Text>
          <Text style={cc.statLabel}>영상 수</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const cc = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.faint,
    padding: space.lg,
    marginBottom: space.sm,
    ...shadows.sm,
  },
  top:       { flexDirection: 'row', alignItems: 'center', marginBottom: space.md, gap: space.md },
  iconWrap:  { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  titleWrap: { flex: 1 },
  name:      { ...typography.bodyStrong, color: colors.text.primary },
  sync:      { ...typography.caption, color: colors.text.tertiary, marginTop: 2 },
  stats:     { flexDirection: 'row', backgroundColor: colors.bg, borderRadius: radius.md, padding: space.md },
  stat:      { flex: 1, alignItems: 'center' },
  statVal:   { fontSize: 16, fontWeight: '700', color: colors.text.primary, letterSpacing: -0.3 },
  statLabel: { ...typography.caption, color: colors.text.tertiary, marginTop: 2 },
  divider:   { width: 1, backgroundColor: colors.border.faint, marginVertical: 2 },
});

// ─── Deal Row ─────────────────────────────────────────────────────────────────

function DealRow({
  initial,
  initBg,
  brand,
  sub,
  statusLabel,
  statusColor,
  onPress,
}: {
  initial: string;
  initBg: string;
  brand: string;
  sub: string;
  statusLabel: string;
  statusColor: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={dr.row} onPress={onPress} activeOpacity={0.8}>
      <View style={[dr.avatar, { backgroundColor: initBg }]}>
        <Text style={dr.avatarText}>{initial}</Text>
      </View>
      <View style={dr.info}>
        <Text style={dr.brand}>{brand}</Text>
        <Text style={dr.sub} numberOfLines={1}>{sub}</Text>
      </View>
      <Text style={[dr.status, { color: statusColor }]}>{statusLabel}</Text>
      <Text style={dr.arrow}>›</Text>
    </TouchableOpacity>
  );
}

const dr = StyleSheet.create({
  row:        { flexDirection: 'row', alignItems: 'center', paddingVertical: space.sm + 2, gap: space.md },
  avatar:     { width: 36, height: 36, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  info:       { flex: 1 },
  brand:      { ...typography.cardTitle, color: colors.text.primary },
  sub:        { ...typography.caption, color: colors.text.tertiary, marginTop: 1 },
  status:     { ...typography.status, fontWeight: '600' },
  arrow:      { fontSize: 16, color: colors.text.muted, marginLeft: 2 },
});

// ─── Quick Actions ────────────────────────────────────────────────────────────

const QUICK_ACTIONS = [
  { icon: 'id-card-outline'      as const, label: '미디어킷',   screen: 'MediaKitEdit' },
  { icon: 'analytics-outline'    as const, label: '채널 분석',  screen: 'Analytics'    },
  { icon: 'wallet-outline'       as const, label: '수익 기록',  screen: 'Revenue'      },
  { icon: 'chatbubble-outline'   as const, label: '문의함',     screen: 'Inquiries'    },
] as const;

type QuickActionScreen = (typeof QUICK_ACTIONS)[number]['screen'];

function QuickActions({ onPress }: { onPress: (screen: QuickActionScreen) => void }) {
  return (
    <View style={qa.wrap}>
      {QUICK_ACTIONS.map((a) => (
        <TouchableOpacity key={a.label} style={qa.item} onPress={() => onPress(a.screen)} activeOpacity={0.75}>
          <View style={qa.iconWrap}>
            <Ionicons name={a.icon} size={22} color={colors.brand.default} />
          </View>
          <Text style={qa.label}>{a.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const qa = StyleSheet.create({
  wrap:     { flexDirection: 'row', justifyContent: 'space-between', marginBottom: space.xl },
  item:     { alignItems: 'center', gap: space.xs + 1, flex: 1 },
  iconWrap: {
    width: 52, height: 52, borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border.faint,
    alignItems: 'center', justifyContent: 'center',
    ...shadows.sm,
  },
  label: { ...typography.caption, color: colors.text.secondary, fontWeight: '500' },
});

// ─── Divider ──────────────────────────────────────────────────────────────────

function Divider() {
  return <View style={{ height: 1, backgroundColor: colors.border.faint, marginVertical: 2 }} />;
}

// ─── Card wrapper ─────────────────────────────────────────────────────────────

function Card({ children, style }: { children: React.ReactNode; style?: object }) {
  return (
    <View style={[cw.card, style]}>
      {children}
    </View>
  );
}

const cw = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.faint,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    marginBottom: space.lg,
    ...shadows.sm,
  },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user } = useAuth();
  const { data, loading, refetch } = useHomeData(user?.id);
  const { channels, formatCount } = useSocialChannels(user?.id);
  const { dealsVersion, proposalsVersion } = useRealtime();

  const [dismissedPriority, setDismissedPriority] = useState(false);
  const [pendingProposalCount, setPendingProposalCount] = useState(0);

  React.useEffect(() => { refetch(); }, [dealsVersion]); // eslint-disable-line

  React.useEffect(() => {
    if (!user?.id) return;
    supabase
      .from('advertiser_proposals')
      .select('id', { count: 'exact', head: true })
      .eq('creator_id', user.id)
      .eq('status', 'pending')
      .then(({ count }) => { setPendingProposalCount(count ?? 0); });
  }, [user?.id, proposalsVersion]);

  const userName = user?.user_metadata?.full_name ?? user?.email?.split('@')[0] ?? '크리에이터';
  const priorityDeal = data.activeDeals[0];
  const showPriority = !dismissedPriority && !!priorityDeal;

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      {/* 헤더 */}
      <View style={s.header}>
        <Text style={s.logo}>manybe</Text>
        <View style={s.headerRight}>
          <TouchableOpacity style={s.iconBtn} onPress={() => navigation.navigate('Revenue')} activeOpacity={0.7}>
            <Ionicons name="wallet-outline" size={20} color={tokens.ink2} />
          </TouchableOpacity>
          <TouchableOpacity style={s.iconBtn} onPress={() => navigation.navigate('Analytics')} activeOpacity={0.7}>
            <Ionicons name="analytics-outline" size={20} color={tokens.ink2} />
          </TouchableOpacity>
          <TouchableOpacity style={s.iconBtn} onPress={() => navigation.navigate('Notifications')} activeOpacity={0.7}>
            <Ionicons name="notifications-outline" size={20} color={tokens.ink2} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} />}
      >
        {/* 날짜 + 인사말 */}
        <Text style={s.date}>{formatDate()}</Text>
        <Text style={s.greeting}>{getGreeting(userName)}</Text>

        {data.newInquiryCount > 0 && (
          <View style={s.insightRow}>
            <View style={s.insightDot} />
            <Text style={s.insightText}>
              {data.newInquiryCount}개의 새 문의가 들어왔어요
            </Text>
          </View>
        )}

        {pendingProposalCount > 0 && (
          <TouchableOpacity
            style={s.proposalBanner}
            onPress={() => navigation.navigate('IncomingProposals')}
            activeOpacity={0.85}
          >
            <View style={s.proposalBannerLeft}>
              <Text style={s.proposalBannerIcon}>📨</Text>
              <Text style={s.proposalBannerText}>
                광고주 협찬 제안 {pendingProposalCount}건 도착
              </Text>
            </View>
            <Text style={s.proposalBannerArrow}>›</Text>
          </TouchableOpacity>
        )}

        <View style={s.gap} />

        {/* 퀵 액션 */}
        <QuickActions onPress={(screen) => navigation.navigate(screen)} />

        {/* 오늘 우선 처리 */}
        {showPriority && (
          <PriorityCard
            deal={{
              brand: priorityDeal.brand,
              statusLabel: priorityDeal.statusLabel,
              subtitle: `${priorityDeal.statusLabel} · 오늘 기한`,
            }}
            onViewMessage={() => navigation.navigate('Inquiries')}
            onDismiss={() => setDismissedPriority(true)}
          />
        )}

        {/* 내 채널 */}
        {channels.length > 0 && (
          <>
            <SectionHeader
              title="내 채널"
              count={channels.length}
              onMore={() => navigation.navigate('YouTubeConnect')}
            />
            {channels.map((ch) => (
              <ChannelCard
                key={ch.id}
                ch={ch}
                formatCount={formatCount}
                onPress={() => navigation.navigate('Analytics')}
              />
            ))}
          </>
        )}

        {/* 브랜드 협업 */}
        {data.activeDeals.length > 0 && (
          <>
            <SectionHeader
              title="브랜드 협업"
              count={data.activeDeals.length}
              onMore={() => navigation.navigate('Main', { screen: '협찬' })}
            />
            <Card>
              {data.activeDeals.slice(0, 4).map((deal, i) => (
                <React.Fragment key={deal.id}>
                  {i > 0 && <Divider />}
                  <DealRow
                    initial={deal.initial}
                    initBg={deal.initBg}
                    brand={deal.brand}
                    sub={`${deal.statusLabel} · ${deal.amount > 0 ? formatWon(deal.amount) : '금액 미정'}`}
                    statusLabel={deal.statusLabel}
                    statusColor={deal.statusColor}
                    onPress={() => navigation.navigate('Main', { screen: '협찬' })}
                  />
                </React.Fragment>
              ))}
            </Card>
          </>
        )}

        {/* 빈 상태 */}
        {!loading && data.activeDeals.length === 0 && channels.length === 0 && (
          <View style={s.empty}>
            <Text style={s.emptyIcon}>🤝</Text>
            <Text style={s.emptyTitle}>매니비를 시작해볼까요?</Text>
            <Text style={s.emptyDesc}>채널을 연결하고 첫 협찬을 등록해보세요</Text>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: space.screen,
    paddingVertical: space.md,
  },
  logo: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text.primary,
    letterSpacing: -0.3,
  },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: '#F0EEF8',
    alignItems: 'center', justifyContent: 'center',
  },

  scroll: { paddingHorizontal: space.screen, paddingTop: space.sm },

  date: {
    ...typography.caption,
    color: colors.text.tertiary,
    marginBottom: space.xs,
  },
  greeting: {
    ...typography.greeting,
    color: colors.text.primary,
  },

  insightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    marginTop: space.sm,
  },
  insightDot: {
    width: 5, height: 5, borderRadius: 3,
    backgroundColor: colors.brand.default,
  },
  insightText: {
    ...typography.caption,
    color: colors.text.secondary,
  },

  gap: { height: space.xxl },

  proposalBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border.faint,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    marginTop: space.sm,
  },
  proposalBannerLeft: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  proposalBannerIcon: { fontSize: 16 },
  proposalBannerText: {
    ...typography.bodyStrong,
    color: colors.brand.default,
    fontSize: 13,
  },
  proposalBannerArrow: { fontSize: 18, color: colors.text.tertiary },

  empty: { alignItems: 'center', paddingVertical: 60, gap: space.sm },
  emptyIcon:  { fontSize: 44 },
  emptyTitle: { ...typography.heading, color: colors.text.primary },
  emptyDesc:  { ...typography.caption, color: colors.text.tertiary, textAlign: 'center' },
});
