import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../../hooks/useAuth';
import { useHomeData, ActionItem } from '../../hooks/useHomeData';
import { usePlan } from '../../hooks/usePlan';
import FomoBanner from '../../components/FomoBanner';
import { useSocialChannels } from '../../hooks/useSocialChannels';
import { colors } from '../../constants/colors';
import { RootStackParamList } from '../../navigation/AppNavigator';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 40 - 12) / 2;

function MiniBarChart({ data }: { data: number[] }) {
  const max = Math.max(...data, 1);
  return (
    <View style={chart.container}>
      {data.map((val, i) => (
        <View key={i} style={chart.barWrapper}>
          <View
            style={[
              chart.bar,
              {
                height: Math.max((val / max) * 40, 3),
                backgroundColor:
                  i === data.length - 1
                    ? 'rgba(255,255,255,1)'
                    : 'rgba(255,255,255,0.45)',
              },
            ]}
          />
        </View>
      ))}
    </View>
  );
}

function formatFull(n: number) {
  return n.toLocaleString('ko-KR') + '원';
}

function pctChange(current: number, prev: number) {
  if (prev === 0) return null;
  const pct = Math.round(((current - prev) / prev) * 100);
  return pct;
}


// ─── 액션 카드 ──────────────────────────────────────────────

function ActionCard({ item, onPress }: { item: ActionItem; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[action.card, { backgroundColor: item.bg }, item.urgent && action.cardUrgent]}
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
  cardUrgent: {
    borderWidth: 1.5, borderColor: '#FCA5A5',
  },
  iconBg: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    opacity: 0.85,
  },
  icon:  { fontSize: 18 },
  body:  { flex: 1 },
  title: { fontSize: 14, fontWeight: '700', marginBottom: 2 },
  sub:   { fontSize: 12, color: '#6B7280' },
  urgentDot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: '#DC2626',
  },
  arrow: { fontSize: 20, fontWeight: '600' },
});

export default function HomeScreen() {
  const { user } = useAuth();
  const { data, loading, refetch } = useHomeData(user?.id);
  const { channels, formatCount } = useSocialChannels(user?.id);
  const { isPremium } = usePlan(user?.id);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const userName =
    user?.user_metadata?.full_name ?? user?.email?.split('@')[0] ?? '크리에이터';

  const pct = pctChange(data.totalRevenue, data.prevMonthRevenue);

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
            <Text style={styles.greetingSub}>오늘도 좋은 하루 되세요</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('Search')}>
              <Text style={styles.iconBtnText}>🔎</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.avatar} onPress={() => navigation.navigate('Profile')} activeOpacity={0.85}>
              <Text style={styles.avatarText}>{userName.charAt(0).toUpperCase()}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 이번 달 수익 카드 */}
        <LinearGradient
          colors={['#6C63FF', '#9B95FF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.revenueCard}
        >
          {loading ? (
            <ActivityIndicator color="rgba(255,255,255,0.8)" style={{ paddingVertical: 24 }} />
          ) : (
            <>
              <View style={styles.revenueTop}>
                <View>
                  <Text style={styles.revenueLabel}>이번 달 총수익</Text>
                  <Text style={styles.revenueAmount}>{formatFull(data.totalRevenue)}</Text>
                  {pct !== null && (
                    <View style={styles.revenueBadge}>
                      <Text style={styles.revenueBadgeText}>
                        {pct >= 0 ? '▲' : '▼'} 전달 대비 {pct >= 0 ? '+' : ''}{pct}%
                      </Text>
                    </View>
                  )}
                </View>
                <MiniBarChart data={data.barData} />
              </View>
              <View style={styles.revenueDivider} />
              <View style={styles.revenueBottom}>
                <View style={styles.revenueStatItem}>
                  <Text style={styles.revenueStatLabel}>협찬 건수</Text>
                  <Text style={styles.revenueStatValue}>{data.dealCount}건</Text>
                </View>
                <View style={styles.revenueStatDivider} />
                <View style={styles.revenueStatItem}>
                  <Text style={styles.revenueStatLabel}>정산 예정</Text>
                  <Text style={styles.revenueStatValue}>{formatFull(data.pendingSettlement)}</Text>
                </View>
                <View style={styles.revenueStatDivider} />
                <View style={styles.revenueStatItem}>
                  <Text style={styles.revenueStatLabel}>세금 예상</Text>
                  <Text style={styles.revenueStatValue}>{formatFull(data.estimatedTax)}</Text>
                </View>
              </View>
            </>
          )}
        </LinearGradient>

        {/* 액션 카드 */}
        {data.actionItems.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>오늘 할 일</Text>
              <Text style={styles.sectionCount}>{data.actionItems.length}개</Text>
            </View>
            {data.actionItems.map((item) => (
              <ActionCard
                key={item.id}
                item={item}
                onPress={() => {
                  if (item.type === 'deal_deadline_today' || item.type === 'deal_deadline_week') {
                    navigation.navigate('Main', { screen: '협찬' } as any);
                  } else if (item.type === 'schedule_today') {
                    navigation.navigate('Main', { screen: '캘린더' } as any);
                  } else if (item.type === 'unsettled') {
                    navigation.navigate('Main', { screen: '수익' } as any);
                  }
                }}
              />
            ))}
            <View style={{ height: 16 }} />
          </>
        )}

        {/* 수익원별 카드 */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>수익원별 현황</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Main', { screen: '수익' } as any)}>
            <Text style={styles.sectionMore}>전체보기</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.grid}>
          {data.categoryStats.map((src) => (
            <TouchableOpacity
              key={src.label}
              style={[styles.gridCard, { width: CARD_WIDTH, height: 120, backgroundColor: src.cardBg }]}
              activeOpacity={0.85}
              onPress={() => navigation.navigate('Main', { screen: '수익' } as any)}
            >
              <View style={[styles.gridIconBg, { backgroundColor: src.iconBg }]}>
                <Text style={styles.gridIcon}>{src.icon}</Text>
              </View>
              <Text style={styles.gridLabel}>{src.label}</Text>
              <Text style={[styles.gridAmount, { color: src.textColor }]}>
                {formatFull(src.amount)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 소셜 채널 현황 */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>소셜 채널 현황</Text>
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
            <View>
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
                <Text style={channelStyle.channelName} numberOfLines={1}>{ch.channel_name}</Text>
              </View>
              <View style={channelStyle.stats}>
                <View style={channelStyle.stat}>
                  <Text style={channelStyle.statValue}>{formatCount(ch.subscriber_count)}</Text>
                  <Text style={channelStyle.statLabel}>구독자</Text>
                </View>
                <View style={channelStyle.statDivider} />
                <View style={channelStyle.stat}>
                  <Text style={channelStyle.statValue}>{formatCount(ch.view_count)}</Text>
                  <Text style={channelStyle.statLabel}>총 조회수</Text>
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

        {/* 진행 중인 협찬 */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>진행 중인 협찬</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Main', { screen: '협찬' } as any)}>
            <Text style={styles.sectionMore}>전체보기</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.dealList}>
          {data.activeDeals.length === 0 && !loading ? (
            <View style={styles.emptyDeals}>
              <Text style={styles.emptyDealsText}>진행 중인 협찬이 없습니다</Text>
            </View>
          ) : (
            data.activeDeals.map((deal) => (
              <TouchableOpacity key={deal.id} style={styles.dealCard} activeOpacity={0.85} onPress={() => navigation.navigate('Main', { screen: '협찬' } as any)}>
                <View style={[styles.dealAvatar, { backgroundColor: deal.initBg }]}>
                  <Text style={styles.dealAvatarText}>{deal.initial}</Text>
                </View>
                <View style={styles.dealInfo}>
                  <Text style={styles.dealBrand}>{deal.brand}</Text>
                  <Text style={styles.dealAmount}>{formatFull(deal.amount)}</Text>
                </View>
                <View style={[styles.dealStatusBadge, { backgroundColor: deal.statusBg }]}>
                  <Text style={[styles.dealStatusText, { color: deal.statusColor }]}>
                    {deal.statusLabel}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* FOMO 페이월 배너 - 무료 유저만 */}
        {!isPremium && <FomoBanner variant="home" />}

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

const chart = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    height: 48,
  },
  barWrapper: {
    width: 8,
    height: 48,
    justifyContent: 'flex-end',
  },
  bar: {
    width: 8,
    borderRadius: 4,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8FF',
  },
  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 20,
  },
  greeting: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1A1A2E',
    letterSpacing: -0.3,
  },
  greetingSub: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  iconBtnText: {
    fontSize: 18,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  revenueCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  revenueTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  revenueLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 6,
  },
  revenueAmount: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
  },
  revenueBadge: {
    marginTop: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  revenueBadgeText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  revenueDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginBottom: 14,
  },
  revenueBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  revenueStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  revenueStatDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  revenueStatLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    marginBottom: 5,
  },
  revenueStatValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A2E',
  },
  sectionMore: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '500',
  },
  sectionCount: {
    fontSize: 13,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
    justifyContent: 'space-between',
  },
  gridCard: {
    borderRadius: 12,
    padding: 16,
    justifyContent: 'space-between',
  },
  gridIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  gridIcon: {
    fontSize: 20,
  },
  gridLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  gridAmount: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  dealList: {
    gap: 10,
    marginBottom: 8,
  },
  dealCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  dealAvatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  dealAvatarText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  dealInfo: {
    flex: 1,
  },
  dealBrand: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 3,
  },
  dealAmount: {
    fontSize: 13,
    color: '#6B7280',
  },
  dealStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  dealStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyDeals: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyDealsText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
});

const channelStyle = StyleSheet.create({
  empty: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
    gap: 12,
    borderWidth: 1.5,
    borderColor: '#E8E4FF',
    borderStyle: 'dashed',
  },
  emptyIcon:  { fontSize: 28 },
  emptyTitle: { fontSize: 14, fontWeight: '700', color: '#1A1A2E' },
  emptyDesc:  { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  emptyArrow: { fontSize: 22, color: '#D1D5DB', marginLeft: 'auto' },

  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  ytBadge: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: '#FF0000',
    alignItems: 'center', justifyContent: 'center',
  },
  ytBadgeText:  { color: '#fff', fontSize: 12, fontWeight: '800' },
  channelName:  { flex: 1, fontSize: 14, fontWeight: '700', color: '#1A1A2E' },

  stats: {
    flexDirection: 'row',
    backgroundColor: '#F8F8FF',
    borderRadius: 12,
    padding: 12,
  },
  stat:       { flex: 1, alignItems: 'center' },
  statValue:  { fontSize: 16, fontWeight: '800', color: '#1A1A2E', marginBottom: 2 },
  statLabel:  { fontSize: 11, color: '#7C6FCD' },
  statDivider:{ width: 1, backgroundColor: 'rgba(108,99,255,0.15)' },
});
