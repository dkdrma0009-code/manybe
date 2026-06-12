import { Text } from '@/components/Text';
import React, { useEffect, useState } from 'react';
import {
  View, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { RevenueBarChart } from './RevenueBarChart';
import { loadDemoProfile, generateDemoData, type DemoIntelligence } from '../services/DemoDataService';
import { tokens } from '../constants/tokens';
import type { TabParamList } from '../navigation/TabNavigator';
import { formatKRW } from '../utils/formatters';

type TabNav = BottomTabNavigationProp<TabParamList>;

// ─── Demo sub-components ──────────────────────────────────────────────────────

function DemoCard({ children }: { children: React.ReactNode }) {
  return <View style={s.card}>{children}</View>;
}

function DemoBadge({ label }: { label: string }) {
  return (
    <View style={s.demoBadge}>
      <Text style={s.demoBadgeText}>{label}</Text>
    </View>
  );
}

function SectionTitle({ title }: { title: string }) {
  return (
    <View style={s.cardHeader}>
      <Text style={s.cardTitle}>{title}</Text>
      <DemoBadge label="미리보기" />
    </View>
  );
}

function DemoScoreRing({ score }: { score: number }) {
  const color = score >= 70 ? tokens.uploaded : score >= 50 ? tokens.reviewing : tokens.urgent;
  return (
    <View style={s.scoreRingWrap}>
      <View style={[s.scoreRing, { borderColor: color }]}>
        <Text style={[s.scoreNum, { color }]}>{score}</Text>
        <Text style={s.scoreMax}>/100</Text>
      </View>
      <Text style={[s.scoreTrend, { color: tokens.uploaded }]}>↑ 개선 중</Text>
    </View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function EmptyStateIntelligence() {
  const insets  = useSafeAreaInsets();
  const tabNav  = useNavigation<TabNav>();
  const [demo, setDemo]     = useState<DemoIntelligence | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDemoProfile().then((profile) => {
      setDemo(generateDemoData(profile));
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <View style={[s.loader, { paddingTop: insets.top + 60 }]}>
        <ActivityIndicator color={tokens.primary} />
      </View>
    );
  }

  if (!demo) return null;

  return (
    <ScrollView
      style={[s.container, { paddingTop: insets.top }]}
      contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={s.pageHeader}>
        <Text style={s.pageTitle}>인사이트</Text>
        <View style={s.demoBannerChip}>
          <Text style={s.demoBannerText}>✨ 데모 미리보기</Text>
        </View>
      </View>

      {/* Explanation banner */}
      <View style={s.explanationBanner}>
        <Text style={s.explanationIcon}>🔮</Text>
        <View style={s.explanationBody}>
          <Text style={s.explanationTitle}>이렇게 보일 거예요</Text>
          <Text style={s.explanationDesc}>
            협찬을 추가하면 실제 데이터로 분석을 시작합니다.
            아래는 비슷한 규모 크리에이터의 예시입니다.
          </Text>
        </View>
      </View>

      {/* Creator Health Demo */}
      <DemoCard>
        <SectionTitle title="Creator Health" />
        <View style={s.healthBody}>
          <DemoScoreRing score={demo.healthScore} />
          <View style={s.healthMetrics}>
            <View style={s.metricBlock}>
              <Text style={s.metricBlockLabel}>생산성</Text>
              <View style={s.miniBar}>
                <View style={[s.miniBarFill, { width: '72%', backgroundColor: tokens.uploaded }]} />
              </View>
              <Text style={s.metricBlockVal}>72</Text>
            </View>
            <View style={s.metricBlock}>
              <Text style={s.metricBlockLabel}>수익 안정</Text>
              <View style={s.miniBar}>
                <View style={[s.miniBarFill, { width: '65%', backgroundColor: tokens.reviewing }]} />
              </View>
              <Text style={s.metricBlockVal}>65</Text>
            </View>
            <View style={s.metricBlock}>
              <Text style={s.metricBlockLabel}>번아웃</Text>
              <View style={[s.riskChip, { backgroundColor: tokens.uploadedBg }]}>
                <Text style={[s.riskChipText, { color: tokens.uploaded }]}>낮음</Text>
              </View>
            </View>
            <View style={s.metricBlock}>
              <Text style={s.metricBlockLabel}>협찬 속도</Text>
              <Text style={s.metricBlockVal}>2.4건/월</Text>
            </View>
          </View>
        </View>
      </DemoCard>

      {/* Revenue Chart Demo */}
      <DemoCard>
        <SectionTitle title="수익 트렌드" />
        <RevenueBarChart bars={demo.chartBars} chartHeight={100} showMovingAvg />
      </DemoCard>

      {/* Revenue Intelligence Demo */}
      <DemoCard>
        <SectionTitle title="수익 인텔리전스" />
        <View style={s.revenueHero}>
          <Text style={s.revenueLabel}>이번달 예상</Text>
          <Text style={s.revenueValue}>{formatKRW(demo.projectedRevenue)}</Text>
        </View>
        <View style={s.metricRow}>
          <Text style={s.metricLabel}>예측 신뢰도</Text>
          <Text style={[s.metricValue, { color: tokens.uploaded }]}>72%</Text>
        </View>
        <View style={s.metricRow}>
          <Text style={s.metricLabel}>수익 변동성</Text>
          <Text style={[s.metricValue, { color: tokens.reviewing }]}>중간</Text>
        </View>
        <View style={s.metricRow}>
          <Text style={s.metricLabel}>정산 안정성</Text>
          <Text style={s.metricValue}>68%</Text>
        </View>
      </DemoCard>

      {/* AI Coach Demo */}
      <DemoCard>
        <SectionTitle title="성장 코치" />
        {demo.aiCoach.map((msg, idx) => (
          <View key={idx} style={s.coachRow}>
            <Text style={s.coachIcon}>{msg.icon}</Text>
            <View style={s.coachBody}>
              <Text style={[s.coachTitle, { color: msg.color }]}>{msg.title}</Text>
              <Text style={s.coachDetail}>{msg.detail}</Text>
            </View>
          </View>
        ))}
      </DemoCard>

      {/* Brand Intelligence Demo */}
      <DemoCard>
        <SectionTitle title="브랜드 인텔리전스" />
        <View style={s.brandStatRow}>
          <View style={s.brandStatBlock}>
            <Text style={s.brandStatNum}>{demo.brandCount}</Text>
            <Text style={s.brandStatLabel}>총 브랜드</Text>
          </View>
          <View style={s.brandStatBlock}>
            <Text style={[s.brandStatNum, { color: tokens.uploaded }]}>
              {demo.completionRate}%
            </Text>
            <Text style={s.brandStatLabel}>완결률</Text>
          </View>
          <View style={s.brandStatBlock}>
            <Text style={[s.brandStatNum, { color: tokens.primary }]}>72%</Text>
            <Text style={s.brandStatLabel}>재방문율</Text>
          </View>
        </View>
        <View style={s.topBrandRow}>
          <View style={[s.brandDot, { backgroundColor: tokens.uploaded }]} />
          <Text style={s.topBrandName}>{demo.topBrand}</Text>
          <View style={{ flex: 1 }} />
          <View style={[s.brandChip, { backgroundColor: tokens.uploadedBg }]}>
            <Text style={[s.brandChipText, { color: tokens.uploaded }]}>활성</Text>
          </View>
        </View>
      </DemoCard>

      {/* Weekly Win Preview */}
      <DemoCard>
        <SectionTitle title="주간 리뷰" />
        <View style={s.weeklyWinRow}>
          <Text style={s.weeklyWinIcon}>🏆</Text>
          <View style={s.weeklyWinBody}>
            <Text style={s.weeklyWinTitle}>이번 주 하이라이트</Text>
            <Text style={s.weeklyWinDetail}>{demo.weeklyWin}</Text>
          </View>
        </View>
        <View style={s.weeklyWinRow}>
          <Text style={s.weeklyWinIcon}>⚠️</Text>
          <View style={s.weeklyWinBody}>
            <Text style={s.weeklyWinTitle}>이번 주 과제</Text>
            <Text style={s.weeklyWinDetail}>{demo.weeklyChallenge}</Text>
          </View>
        </View>
      </DemoCard>

      {/* CTA section */}
      <View style={s.ctaSection}>
        <Text style={s.ctaSectionTitle}>실제 데이터로 시작해볼까요?</Text>
        <Text style={s.ctaSectionDesc}>
          협찬을 하나만 추가해도 분석이 시작됩니다
        </Text>
        <TouchableOpacity
          style={s.ctaButton}
          onPress={() => tabNav.navigate('협찬')}
          activeOpacity={0.85}
        >
          <Text style={s.ctaButtonText}>🤝 첫 협찬 추가하기 →</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={s.ctaSecondary}
          onPress={() => tabNav.navigate('협찬')}
          activeOpacity={0.7}
        >
          <Text style={s.ctaSecondaryText}>💰 수익 기록하기</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: tokens.bg },
  loader:    { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: tokens.bg },

  pageHeader: {
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8,
    flexDirection: 'row', alignItems: 'center', gap: 10,
  },
  pageTitle: { fontSize: 22, fontWeight: '800', color: tokens.ink, letterSpacing: -0.5 },
  demoBannerChip: {
    backgroundColor: tokens.reviewing + '22',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
  },
  demoBannerText: { fontSize: 11, fontWeight: '700', color: tokens.reviewing },

  explanationBanner: {
    flexDirection: 'row', gap: 12, alignItems: 'flex-start',
    marginHorizontal: 16, marginBottom: 12,
    backgroundColor: tokens.primarySofter,
    borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: tokens.primarySoft,
  },
  explanationIcon:  { fontSize: 24 },
  explanationBody:  { flex: 1 },
  explanationTitle: { fontSize: 13, fontWeight: '800', color: tokens.primary, marginBottom: 3 },
  explanationDesc:  { fontSize: 12, color: tokens.ink3, lineHeight: 17 },

  card: {
    backgroundColor: tokens.surface,
    marginHorizontal: 16, marginBottom: 12,
    borderRadius: 16, borderWidth: 1, borderColor: tokens.border,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#15131E', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  cardHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10,
  },
  cardTitle: { fontSize: 14, fontWeight: '700', color: tokens.ink, letterSpacing: -0.2 },
  demoBadge: {
    backgroundColor: tokens.border,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
  },
  demoBadgeText: { fontSize: 10, fontWeight: '700', color: tokens.ink4 },

  // Health
  healthBody: {
    flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 14, gap: 20, alignItems: 'center',
  },
  scoreRingWrap: { alignItems: 'center', gap: 6 },
  scoreRing: {
    width: 80, height: 80, borderRadius: 40, borderWidth: 5,
    alignItems: 'center', justifyContent: 'center',
  },
  scoreNum: { fontSize: 26, fontWeight: '800', letterSpacing: -1, lineHeight: 30 },
  scoreMax: { fontSize: 10, color: tokens.ink4 },
  scoreTrend: { fontSize: 11, fontWeight: '600' },

  healthMetrics: { flex: 1, gap: 10 },
  metricBlock: { gap: 3 },
  metricBlockLabel: {
    fontSize: 9, color: tokens.ink4, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 0.6,
  },
  metricBlockVal: { fontSize: 12, fontWeight: '700', color: tokens.ink2 },
  miniBar: { height: 4, backgroundColor: tokens.border, borderRadius: 2, overflow: 'hidden' },
  miniBarFill: { height: 4, borderRadius: 2 },
  riskChip: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, alignSelf: 'flex-start', marginTop: 2 },
  riskChipText: { fontSize: 11, fontWeight: '700' },

  // Revenue
  revenueHero: { paddingHorizontal: 16, paddingBottom: 12 },
  revenueLabel: {
    fontSize: 10, color: tokens.ink4, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 3,
  },
  revenueValue: { fontSize: 26, fontWeight: '800', color: tokens.ink, letterSpacing: -1 },

  metricRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 8,
  },
  metricLabel: { fontSize: 13, color: tokens.ink3 },
  metricValue: { fontSize: 13, fontWeight: '700', color: tokens.ink },

  // Coach
  coachRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingHorizontal: 16, paddingVertical: 9, gap: 10,
  },
  coachIcon:   { fontSize: 16, width: 22, marginTop: 1 },
  coachBody:   { flex: 1 },
  coachTitle:  { fontSize: 13, fontWeight: '700' },
  coachDetail: { fontSize: 12, color: tokens.ink3, marginTop: 3, lineHeight: 17 },

  // Brand
  brandStatRow: {
    flexDirection: 'row', paddingHorizontal: 12, paddingBottom: 14, gap: 8,
  },
  brandStatBlock: {
    flex: 1, alignItems: 'center', paddingVertical: 10,
    backgroundColor: tokens.bg, borderRadius: 10,
  },
  brandStatNum:   { fontSize: 18, fontWeight: '800', color: tokens.ink },
  brandStatLabel: { fontSize: 10, color: tokens.ink4, marginTop: 2 },
  topBrandRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 10, gap: 8,
  },
  brandDot: { width: 8, height: 8, borderRadius: 4 },
  topBrandName: { fontSize: 13, fontWeight: '600', color: tokens.ink },
  brandChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  brandChipText: { fontSize: 11, fontWeight: '700' },

  // Weekly review
  weeklyWinRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingHorizontal: 16, paddingVertical: 9, gap: 10,
  },
  weeklyWinIcon:   { fontSize: 16, width: 22 },
  weeklyWinBody:   { flex: 1 },
  weeklyWinTitle:  { fontSize: 12, fontWeight: '700', color: tokens.ink2 },
  weeklyWinDetail: { fontSize: 12, color: tokens.ink3, marginTop: 2, lineHeight: 17 },

  // CTA
  ctaSection: {
    marginHorizontal: 16, marginTop: 4,
    backgroundColor: tokens.surface,
    borderRadius: 16, padding: 20,
    alignItems: 'center', gap: 8,
    borderWidth: 1, borderColor: tokens.border,
  },
  ctaSectionTitle: { fontSize: 16, fontWeight: '800', color: tokens.ink, textAlign: 'center' },
  ctaSectionDesc:  {
    fontSize: 13, color: tokens.ink3, textAlign: 'center',
    lineHeight: 18, marginBottom: 4,
  },
  ctaButton: {
    backgroundColor: tokens.primary,
    paddingHorizontal: 28, paddingVertical: 13,
    borderRadius: 13, alignSelf: 'stretch', alignItems: 'center',
  },
  ctaButtonText:  { fontSize: 15, fontWeight: '800', color: '#fff' },
  ctaSecondary: {
    paddingVertical: 10, paddingHorizontal: 20,
    borderRadius: 12, alignSelf: 'stretch', alignItems: 'center',
    backgroundColor: tokens.bg,
  },
  ctaSecondaryText: { fontSize: 14, fontWeight: '700', color: tokens.ink3 },
});
