import { Text } from '@/components/Text';
import React from 'react';
import {
  View, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useAuth } from '../../hooks/useAuth';
import { RevenueBarChart } from '../../components/RevenueBarChart';
import { PremiumGate } from '../../components/PremiumGate';
import { EmptyStateIntelligence } from '../../components/EmptyStateIntelligence';
import type { TabParamList } from '../../navigation/TabNavigator';
import { tokens } from '../../constants/tokens';
import { formatKRW, timeAgo } from '../../utils/formatters';
import {
  riskColor, riskBg, riskLabel, trendColor, trendLabel, rhythmLabel,
  stageLabel, urgencyColor, eventLabel,
} from './helpers';
import {
  SectionCard, SectionTitle, ProDivider, Divider, ProgressBar,
  MetricRow, EmptyState, ScoreRing, StatBlock, TrendRow, CoachItem, pStyles,
} from './components';
import { useAnalyticsData } from './useAnalyticsData';

// ─── Main Screen ──────────────────────────────────────────────────────────────

type NavProp = BottomTabNavigationProp<TabParamList>;

export default function AnalyticsScreen() {
  const insets = useSafeAreaInsets();
  const nav = useNavigation<NavProp>();
  const { session } = useAuth();
  const userId = session?.user?.id;

  const {
    ytChannelId, channelAnalysis, intelligence, metrics, graph, weeklyReview,
    timeline, refreshing, isLoading, handleRefresh,
    healthExplanation, forecast, decisionItems, topBrands, chartBars,
    nextMonthForecast, stabilityScore, recurringBrandRatio, responseSpeed,
  } = useAnalyticsData(userId);
  const { analysis: chAnalysis, analyzing, error: chError, isStale, runAnalysis } = channelAnalysis;

  function handleNavigate(dest: 'deals' | 'revenue' | 'inquiries' | 'calendar') {
    const map: Record<string, keyof TabParamList> = {
      deals: '협찬', revenue: '협찬', inquiries: '협찬', calendar: '일정',
    };
    nav.navigate(map[dest]);
  }

  if (isLoading) {
    return (
      <View style={[s.loader, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={tokens.primary} />
        <Text style={s.loaderText}>데이터 분석 중...</Text>
      </View>
    );
  }

  if (!intelligence && !metrics) {
    return <EmptyStateIntelligence />;
  }

  const p = intelligence?.personal;
  const f = intelligence?.financial;
  const r = intelligence?.relationship;
  const op = intelligence?.operational;

  return (
    <ScrollView
      style={[s.container, { paddingTop: insets.top }]}
      contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={tokens.primary} />
      }
    >
      {/* ── Page Header ─────────────────────────────────────────── */}
      <View style={s.pageHeader}>
        <Text style={s.pageTitle}>인사이트</Text>
        {intelligence && (
          <Text style={s.pageSubtitle}>{timeAgo(intelligence.computedAt)} 분석</Text>
        )}
      </View>

      {/* ══════════════ 무료 기능 ══════════════ */}

      {/* ── 1. Creator Health ─────────────────────────────────────── */}
      {intelligence && p && f && (
        <SectionCard>
          <SectionTitle
            title="Creator Health"
            badge={
              intelligence.trend === 'improving' ? '↑ 개선'
              : intelligence.trend === 'declining' ? '↓ 하락' : '→ 유지'
            }
            badgeColor={trendColor(intelligence.trend)}
          />
          <View style={s.healthBody}>
            <ScoreRing score={intelligence.compositeScore} trend={intelligence.trend} />
            <View style={s.healthMetrics}>
              <View style={s.metricBlock}>
                <Text style={s.metricBlockLabel}>생산성</Text>
                <ProgressBar value={p.productivityScore} />
                <Text style={s.metricBlockVal}>{p.productivityScore}</Text>
              </View>
              <View style={s.metricBlock}>
                <Text style={s.metricBlockLabel}>수익 안정</Text>
                <ProgressBar
                  value={f.settlementReliability}
                  color={f.settlementReliability >= 70 ? tokens.uploaded : tokens.reviewing}
                />
                <Text style={s.metricBlockVal}>{f.settlementReliability}</Text>
              </View>
              <View style={s.metricBlock}>
                <Text style={s.metricBlockLabel}>번아웃</Text>
                <View style={[s.riskChip, { backgroundColor: riskBg(p.burnoutRisk) }]}>
                  <Text style={[s.riskChipText, { color: riskColor(p.burnoutRisk) }]}>
                    {riskLabel(p.burnoutRisk)}
                  </Text>
                </View>
              </View>
              <View style={s.metricBlock}>
                <Text style={s.metricBlockLabel}>활동 패턴</Text>
                <Text style={s.metricBlockVal}>{rhythmLabel(p.activityRhythm)}</Text>
              </View>
            </View>
          </View>
          <Divider />
          <MetricRow label="협찬 속도" value={`${p.dealVelocity.toFixed(1)}건/월`} />
        </SectionCard>
      )}

      {/* ══════════════ PRO 전용 기능 ══════════════ */}
      <ProDivider />

      {/* ── 2. Channel AI 분석 ───────────────────────────────────── */}
      {ytChannelId && (
        <SectionCard>
          <PremiumGate feature="channel_analysis" previewHeight={200}>
          <View style={pStyles.sectionTitleRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={pStyles.sectionTitle}>채널 분석</Text>
              <View style={pStyles.proBadge}><Text style={pStyles.proBadgeText}>PRO</Text></View>
            </View>
            <TouchableOpacity
              onPress={runAnalysis}
              disabled={analyzing}
              style={[pStyles.chip, { backgroundColor: tokens.primary + '22' }]}
              activeOpacity={0.7}
            >
              <Text style={[pStyles.chipText, { color: tokens.primary }]}>
                {analyzing ? '분석 중...' : chAnalysis ? (isStale ? '갱신' : '다시 분석') : '분석 시작'}
              </Text>
            </TouchableOpacity>
          </View>

          {analyzing && (
            <View style={{ paddingHorizontal: 16, paddingBottom: 16, alignItems: 'center', gap: 6 }}>
              <ActivityIndicator size="small" color={tokens.primary} />
              <Text style={{ fontSize: 12, color: tokens.ink4 }}>댓글 수집 및 분석 중...</Text>
            </View>
          )}

          {chError && !analyzing && (
            <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
              <Text style={{ fontSize: 12, color: tokens.urgent }}>{chError}</Text>
            </View>
          )}

          {chAnalysis && !analyzing && (
            <>
              {/* 유입 키워드 — 최상단 배치 */}
              {chAnalysis.inflow_keywords && chAnalysis.inflow_keywords.length > 0 && (
                <View style={{ paddingHorizontal: 16, paddingVertical: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 6 }}>
                    <Text style={{ fontSize: 11, color: tokens.ink4, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 }}>유입 키워드</Text>
                    <View style={[pStyles.chip, { backgroundColor: chAnalysis.inflow_source === 'analytics' ? tokens.uploaded + '22' : tokens.ink4 + '18', paddingVertical: 2, paddingHorizontal: 6 }]}>
                      <Text style={{ fontSize: 9, fontWeight: '700', color: chAnalysis.inflow_source === 'analytics' ? tokens.uploaded : tokens.ink4 }}>
                        {chAnalysis.inflow_source === 'analytics' ? '실측' : '추정'}
                      </Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {chAnalysis.inflow_keywords.map((kw) => (
                      <View key={kw} style={[pStyles.chip, { backgroundColor: tokens.reviewing + '18' }]}>
                        <Text style={[pStyles.chipText, { color: tokens.reviewing }]}>🔍 {kw}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              <Divider />

              {/* 시청자 관심 카테고리 */}
              {chAnalysis.audience_categories && chAnalysis.audience_categories.length > 0 && (
                <View style={{ paddingHorizontal: 16, paddingVertical: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 6 }}>
                    <Text style={{ fontSize: 11, color: tokens.ink4, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 }}>시청자 관심 카테고리</Text>
                    <View style={[pStyles.chip, { backgroundColor: chAnalysis.audience_categories_source === 'analytics' ? tokens.uploaded + '22' : tokens.ink4 + '18', paddingVertical: 2, paddingHorizontal: 6 }]}>
                      <Text style={{ fontSize: 9, fontWeight: '700', color: chAnalysis.audience_categories_source === 'analytics' ? tokens.uploaded : tokens.ink4 }}>
                        {chAnalysis.audience_categories_source === 'analytics' ? '실측' : '추정'}
                      </Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {chAnalysis.audience_categories.map((cat) => (
                      <View key={cat} style={[pStyles.chip, { backgroundColor: tokens.uploaded + '18' }]}>
                        <Text style={[pStyles.chipText, { color: tokens.uploaded }]}>✦ {cat}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              <Divider />

              {/* 감성 점수 */}
              <View style={{ paddingHorizontal: 16, paddingBottom: 10 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Text style={{ fontSize: 12, color: tokens.ink3 }}>댓글 감성</Text>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: chAnalysis.sentiment_score >= 60 ? tokens.uploaded : chAnalysis.sentiment_score >= 40 ? tokens.inProgress : tokens.urgent }}>
                    {chAnalysis.sentiment_label} ({chAnalysis.sentiment_score}/100)
                  </Text>
                </View>
                <ProgressBar
                  value={chAnalysis.sentiment_score}
                  color={chAnalysis.sentiment_score >= 60 ? tokens.uploaded : chAnalysis.sentiment_score >= 40 ? tokens.inProgress : tokens.urgent}
                />
              </View>

              <Divider />

              {/* 타겟 오디언스 */}
              {chAnalysis.audience_keywords.length > 0 && (
                <View style={{ paddingHorizontal: 16, paddingVertical: 10 }}>
                  <Text style={{ fontSize: 11, color: tokens.ink4, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 }}>타겟 오디언스</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {chAnalysis.audience_keywords.map((kw) => (
                      <View key={kw} style={[pStyles.chip, { backgroundColor: tokens.primary + '15' }]}>
                        <Text style={[pStyles.chipText, { color: tokens.primary }]}>{kw}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              <Divider />

              <MetricRow
                label="광고/협찬 콘텐츠 비율"
                value={`${chAnalysis.ad_ratio}%`}
                valueColor={chAnalysis.ad_ratio > 50 ? tokens.urgent : chAnalysis.ad_ratio > 25 ? tokens.reviewing : tokens.ink}
              />

              <Divider />

              {/* 인사이트 */}
              {chAnalysis.insights.map((insight, idx) => (
                <View key={idx} style={s.factorRow}>
                  <Text style={s.factorIcon}>{insight.icon}</Text>
                  <Text style={[s.factorDetail, { flex: 1 }]}>{insight.text}</Text>
                </View>
              ))}

              <View style={{ paddingHorizontal: 16, paddingBottom: 10, paddingTop: 4 }}>
                <Text style={{ fontSize: 10, color: tokens.ink4 }}>
                  댓글 {chAnalysis.sample_size}개 분석 · {new Date(chAnalysis.computed_at).toLocaleDateString('ko-KR')}
                </Text>
              </View>
            </>
          )}

          {!chAnalysis && !analyzing && (
            <View style={{ paddingHorizontal: 16, paddingBottom: 16 }}>
              <Text style={{ fontSize: 13, color: tokens.ink4, lineHeight: 20 }}>
                YouTube 댓글을 분석해 감성, 타겟 오디언스, 광고 비율을 파악합니다.{'\n'}
                "분석 시작"을 눌러 시작하세요.
              </Text>
            </View>
          )}
          </PremiumGate>
        </SectionCard>
      )}

      {/* ── 3. Revenue Trend Chart ───────────────────────────────────── */}
      {chartBars.length > 0 && (
        <SectionCard>
          <SectionTitle
            title="수익 트렌드"
            badge={f ? trendLabel(f.monthlyTrend) : undefined}
            badgeColor={f ? trendColor(f.monthlyTrend) : undefined}
          />
          <RevenueBarChart bars={chartBars} chartHeight={130} showMovingAvg />
        </SectionCard>
      )}

      {/* ── 3. Revenue Intelligence ──────────────────────────────── */}
      {f && forecast && (
        <SectionCard>
          <SectionTitle
            title="수익 분석"
            badge={trendLabel(f.monthlyTrend)}
            badgeColor={trendColor(f.monthlyTrend)}
          />
          <View style={s.revenueHero}>
            <Text style={s.revenueLabel}>이번달 예상</Text>
            <Text style={s.revenueValue}>{formatKRW(f.projectedThisMonth)}</Text>
          </View>
          <Divider />
          <MetricRow label="예측 신뢰도" value={`${f.forecastConfidence}%`} />
          <View style={s.progressRow}>
            <ProgressBar
              value={f.forecastConfidence}
              color={f.forecastConfidence >= 70 ? tokens.uploaded : tokens.reviewing}
            />
          </View>
          <MetricRow
            label="수익 변동성"
            value={riskLabel(f.revenueVolatility)}
            valueColor={riskColor(f.revenueVolatility)}
          />
          <MetricRow label="정산 안정성" value={`${f.settlementReliability}%`} />
        </SectionCard>
      )}

      {/* ── 4. Forecast Intelligence ─────────────────────────────── */}
      {f && nextMonthForecast !== null && (
        <SectionCard>
          <PremiumGate feature="forecast_intelligence">
          <SectionTitle
            pro
            title="수익 예측"
            badge={`신뢰도 ${f.forecastConfidence}%`}
            badgeColor={f.forecastConfidence >= 70 ? tokens.uploaded : tokens.reviewing}
          />
          <View style={s.forecastRow}>
            <View style={s.forecastBlock}>
              <Text style={s.forecastBlockLabel}>이번달 예측</Text>
              <Text style={s.forecastBlockValue}>{formatKRW(f.projectedThisMonth)}</Text>
            </View>
            <View style={s.forecastArrow}>
              <Text style={[s.forecastArrowText, { color: trendColor(f.monthlyTrend) }]}>→</Text>
            </View>
            <View style={s.forecastBlock}>
              <Text style={s.forecastBlockLabel}>다음달 전망</Text>
              <Text style={[s.forecastBlockValue, { color: trendColor(f.monthlyTrend) }]}>
                {formatKRW(nextMonthForecast)}
              </Text>
            </View>
          </View>
          <Divider />
          {/* Uncertainty range */}
          <View style={s.uncertaintyRow}>
            <Text style={s.uncertaintyLabel}>불확실성 범위</Text>
            <View style={s.uncertaintyBar}>
              <View style={[s.uncertaintyCenter, {
                backgroundColor: f.forecastConfidence >= 70 ? tokens.uploaded : tokens.reviewing,
              }]} />
              <View style={[s.uncertaintyBand, {
                backgroundColor: (f.forecastConfidence >= 70 ? tokens.uploaded : tokens.reviewing) + '30',
              }]} />
            </View>
            <Text style={s.uncertaintyPct}>
              ±{f.forecastConfidence >= 80 ? 10 : f.forecastConfidence >= 60 ? 20 : 35}%
            </Text>
          </View>
          {forecast && (
            <View style={s.explanationRow}>
              <Text style={s.explanationText}>{forecast.explanation}</Text>
            </View>
          )}
          </PremiumGate>
        </SectionCard>
      )}

      {/* ── 5. Revenue Stability ─────────────────────────────────── */}
      {f && stabilityScore !== null && (
        <SectionCard>
          <PremiumGate feature="revenue_stability">
          <SectionTitle
            pro
            title="수익 안정성"
            badge={`안정성 ${stabilityScore}/100`}
            badgeColor={stabilityScore >= 70 ? tokens.uploaded : stabilityScore >= 45 ? tokens.reviewing : tokens.urgent}
          />
          <View style={s.stabilityGrid}>
            <StatBlock
              label="안정성 점수"
              value={`${stabilityScore}`}
              valueColor={stabilityScore >= 70 ? tokens.uploaded : stabilityScore >= 45 ? tokens.reviewing : tokens.urgent}
            />
            <StatBlock
              label="변동성"
              value={riskLabel(f.revenueVolatility)}
              valueColor={riskColor(f.revenueVolatility)}
            />
            <StatBlock
              label="재방문 브랜드"
              value={`${recurringBrandRatio}%`}
              valueColor={recurringBrandRatio >= 60 ? tokens.uploaded : tokens.reviewing}
            />
            {graph && (
              <StatBlock
                label="다변화 점수"
                value={`${graph.diversificationScore}`}
                valueColor={graph.diversificationScore >= 60 ? tokens.uploaded : tokens.reviewing}
              />
            )}
          </View>
          {graph && (
            <>
              <Divider />
              <MetricRow
                label="수익 집중도 (HHI)"
                value={graph.revenueConcentration.toFixed(2)}
                sub="0에 가까울수록 분산"
                valueColor={graph.revenueConcentration > 0.5 ? tokens.urgent : graph.revenueConcentration > 0.3 ? tokens.reviewing : tokens.uploaded}
              />
              <MetricRow
                label="의존도 위험"
                value={riskLabel(graph.dependencyRisk)}
                valueColor={riskColor(graph.dependencyRisk)}
              />
            </>
          )}
          </PremiumGate>
        </SectionCard>
      )}

      {/* ── 6. AI Explainability ─────────────────────────────────── */}
      {healthExplanation && (
        <SectionCard>
          <PremiumGate feature="advanced_analytics">
            <SectionTitle
              pro
              title="운영 진단"
              badge={`신뢰도 ${healthExplanation.confidence}%`}
              badgeColor={tokens.primary}
            />
            {healthExplanation.data.factors.length > 0 ? (
              healthExplanation.data.factors.map((factor, idx) => (
                <View key={idx} style={s.factorRow}>
                  <Text style={s.factorIcon}>{factor.impact === 'positive' ? '✅' : '⚠️'}</Text>
                  <View style={s.factorBody}>
                    <Text style={s.factorName}>{factor.name}</Text>
                    <Text style={s.factorDetail}>{factor.detail}</Text>
                  </View>
                </View>
              ))
            ) : (
              <EmptyState message="협찬을 계속 기록하면 인사이트가 생성됩니다." />
            )}
            <View style={s.explanationRow}>
              <Text style={s.explanationText}>{healthExplanation.explanation}</Text>
            </View>
          </PremiumGate>
        </SectionCard>
      )}

      {/* ── 7. Weekly Review ─────────────────────────────────────── */}
      {weeklyReview && (
        <SectionCard>
          <PremiumGate feature="ai_coach">
            <SectionTitle
              pro
              title="주간 리뷰"
              badge={weeklyReview.burnoutRisk ? '번아웃 주의' : `완결률 ${weeklyReview.completionRate}%`}
              badgeColor={weeklyReview.burnoutRisk ? tokens.urgent : tokens.uploaded}
            />
            <View style={s.weeklyGrid}>
              <StatBlock label="완결률" value={`${weeklyReview.completionRate}%`}
                valueColor={weeklyReview.completionRate >= 60 ? tokens.uploaded : tokens.reviewing} />
              <StatBlock label="정체 협찬" value={`${weeklyReview.overdueCount}건`}
                valueColor={weeklyReview.overdueCount > 2 ? tokens.urgent : weeklyReview.overdueCount > 0 ? tokens.reviewing : tokens.uploaded} />
              {weeklyReview.topBrandRevenue > 0 && (
                <StatBlock label="주간 최고 수익" value={formatKRW(weeklyReview.topBrandRevenue)} />
              )}
              <StatBlock label="번아웃 위험" value={weeklyReview.burnoutRisk ? '있음' : '없음'}
                valueColor={weeklyReview.burnoutRisk ? tokens.urgent : tokens.uploaded} />
            </View>
            {weeklyReview.topBrandRevenue > 0 && (
              <>
                <Divider />
                <MetricRow label="이번 주 최고 브랜드" value={weeklyReview.topBrand} />
              </>
            )}
            <View style={s.explanationRow}>
              <Text style={s.explanationText}>{weeklyReview.aiSummary}</Text>
            </View>
          </PremiumGate>
        </SectionCard>
      )}

      {/* ── 8. Weekly AI Coach ───────────────────────────────────── */}
      {(weeklyReview || healthExplanation) && (
        <SectionCard>
          <PremiumGate feature="ai_coach">
            <SectionTitle pro title="성장 코치" badge="주간" badgeColor={tokens.primary} />
            {healthExplanation?.data.factors.filter((f) => f.impact === 'positive').slice(0, 2).map((f, idx) => (
              <CoachItem
                key={`pos-${idx}`}
                icon="✅"
                title={f.name}
                detail={f.detail}
                color={tokens.uploaded}
              />
            ))}
            {healthExplanation?.data.factors.filter((f) => f.impact === 'negative').slice(0, 2).map((f, idx) => (
              <CoachItem
                key={`neg-${idx}`}
                icon="⚠️"
                title={f.name}
                detail={f.detail}
                color={tokens.reviewing}
              />
            ))}
            {weeklyReview && (
              <CoachItem
                icon="🎯"
                title="다음 주 추천 액션"
                detail={weeklyReview.actionableInsight}
                color={tokens.primary}
              />
            )}
            {(!healthExplanation?.data.factors.length && !weeklyReview) && (
              <EmptyState message="더 많은 협찬 데이터가 쌓이면 코칭이 시작됩니다." />
            )}
          </PremiumGate>
        </SectionCard>
      )}

      {/* ── 9. Brand Intelligence ────────────────────────────────── */}
      {r && (
        <SectionCard>
          <PremiumGate feature="brand_risk">
            <SectionTitle
              pro
              title="브랜드 분석"
              badge={`의존도 ${riskLabel(r.dependencyRisk)}`}
              badgeColor={riskColor(r.dependencyRisk)}
            />
            <View style={s.brandSummaryRow}>
              <View style={s.brandStat}>
                <Text style={s.brandStatNum}>{r.uniqueBrandCount}</Text>
                <Text style={s.brandStatLabel}>총 브랜드</Text>
              </View>
              <View style={s.brandStat}>
                <Text style={s.brandStatNum}>{r.avgRelationshipAgeMonths.toFixed(1)}</Text>
                <Text style={s.brandStatLabel}>평균 파트너십(월)</Text>
              </View>
              {graph && (
                <View style={s.brandStat}>
                  <Text style={[s.brandStatNum, {
                    color: graph.diversificationScore >= 60 ? tokens.uploaded : tokens.reviewing,
                  }]}>{graph.diversificationScore}</Text>
                  <Text style={s.brandStatLabel}>다변화 점수</Text>
                </View>
              )}
            </View>
            {r.dependencyRisk === 'high' && (
              <View style={[s.alertRow, { backgroundColor: tokens.urgentBg }]}>
                <Text style={[s.alertText, { color: tokens.urgent }]}>
                  ⚠ 특정 브랜드 의존도 과다 — 파트너십 다변화를 권장합니다
                </Text>
              </View>
            )}
            {topBrands.length > 0 && (
              <>
                <Divider />
                {topBrands.map((brand, idx) => {
                  const statusColor = brand.status === 'active' ? tokens.uploaded
                    : brand.status === 'at_risk' ? tokens.urgent : tokens.ink4;
                  const statusBg = brand.status === 'active' ? tokens.uploadedBg
                    : brand.status === 'at_risk' ? tokens.urgentBg : tokens.settledBg;
                  const statusText = brand.status === 'active' ? '활성'
                    : brand.status === 'at_risk' ? '위험' : '타겟';
                  return (
                    <View key={idx} style={s.brandRow}>
                      <View style={[s.brandDot, { backgroundColor: statusColor }]} />
                      <Text style={s.brandName} numberOfLines={1}>{brand.brand}</Text>
                      <View style={{ flex: 1 }} />
                      <Text style={s.brandRepeat}>재방문 {Math.round(brand.repeatProbability * 100)}%</Text>
                      <View style={[s.brandStatusChip, { backgroundColor: statusBg }]}>
                        <Text style={[s.brandStatusText, { color: statusColor }]}>{statusText}</Text>
                      </View>
                    </View>
                  );
                })}
              </>
            )}
          </PremiumGate>
        </SectionCard>
      )}

      {/* ── 10. Trend Intelligence ───────────────────────────────── */}
      {intelligence && p && f && r && op && (
        <SectionCard>
          <PremiumGate feature="trend_intelligence">
            <SectionTitle pro title="트렌드 스냅샷" badge="현재 상태" badgeColor={tokens.ink4} />
            <TrendRow
              label="번아웃 위험"
              value={riskLabel(p.burnoutRisk)}
              status={p.burnoutRisk === 'low' ? '안정' : p.burnoutRisk === 'medium' ? '주의' : '위험'}
              statusColor={riskColor(p.burnoutRisk)}
              icon={p.burnoutRisk === 'low' ? '✓' : '⚠'}
            />
            <TrendRow
              label="수익 트렌드"
              value={f.monthlyTrend === 'growing' ? '성장' : f.monthlyTrend === 'stable' ? '안정' : '하락'}
              status={f.monthlyTrend === 'growing' ? '개선' : f.monthlyTrend === 'stable' ? '안정' : '주의'}
              statusColor={trendColor(f.monthlyTrend)}
              icon={f.monthlyTrend === 'growing' ? '↑' : f.monthlyTrend === 'stable' ? '→' : '↓'}
            />
            <TrendRow
              label="응답 속도"
              value={responseSpeed === 'fast' ? '빠름' : responseSpeed === 'moderate' ? '보통' : '느림'}
              status={responseSpeed === 'fast' ? '개선' : responseSpeed === 'moderate' ? '안정' : '주의'}
              statusColor={responseSpeed === 'fast' ? tokens.uploaded : responseSpeed === 'moderate' ? tokens.inProgress : tokens.reviewing}
              icon={responseSpeed === 'slow' ? '⚠' : '✓'}
            />
            <TrendRow
              label="브랜드 집중도"
              value={riskLabel(r.dependencyRisk)}
              status={r.dependencyRisk === 'low' ? '안정' : r.dependencyRisk === 'medium' ? '주의' : '위험'}
              statusColor={riskColor(r.dependencyRisk)}
              icon={r.dependencyRisk === 'low' ? '✓' : '⚠'}
            />
            <TrendRow
              label="일정 혼잡"
              value={op.timelineCongestion ? '혼잡' : '정상'}
              status={op.timelineCongestion ? '주의' : '안정'}
              statusColor={op.timelineCongestion ? tokens.reviewing : tokens.uploaded}
              icon={op.timelineCongestion ? '⚠' : '✓'}
            />
          </PremiumGate>
        </SectionCard>
      )}

      {/* ── 11. Operational Intelligence ─────────────────────────── */}
      {op && (
        <SectionCard>
          <SectionTitle
            title="운영 현황"
            badge={op.timelineCongestion ? '일정 혼잡 ⚠' : '일정 정상'}
            badgeColor={op.timelineCongestion ? tokens.urgent : tokens.uploaded}
          />
          <MetricRow label="병목 단계" value={stageLabel(op.bottleneckStage)} />
          <MetricRow
            label="자동화 감지율"
            value={`${op.automationHitRate.toFixed(0)}%`}
            sub="정체 협찬 비율"
            valueColor={op.automationHitRate > 40 ? tokens.urgent : op.automationHitRate > 20 ? tokens.reviewing : tokens.uploaded}
          />
          {Object.keys(op.avgStageDays).length > 0 && (
            <>
              <Divider />
              <Text style={s.subLabel}>단계별 평균 소요일</Text>
              <View style={s.stageDaysRow}>
                {Object.entries(op.avgStageDays).slice(0, 4).map(([stage, days]) => (
                  <View key={stage} style={s.stageDayBlock}>
                    <Text style={s.stageDayNum}>{(days as number).toFixed(1)}</Text>
                    <Text style={s.stageDayLabel}>{stageLabel(stage)}</Text>
                  </View>
                ))}
              </View>
            </>
          )}
        </SectionCard>
      )}

      {/* ── 12. Decision Center ──────────────────────────────────── */}
      {decisionItems.length > 0 && (
        <SectionCard>
          <SectionTitle
            title="추천 액션"
            badge={`${decisionItems.length}건`}
            badgeColor={tokens.primary}
          />
          {decisionItems.map((item, idx) => (
            <TouchableOpacity
              key={item.id}
              style={[s.focusItem, idx < decisionItems.length - 1 && s.focusItemBorder]}
              onPress={() => handleNavigate(item.navigateTo)}
              activeOpacity={0.7}
            >
              <View style={[s.urgencyBar, { backgroundColor: urgencyColor(item.urgency) }]} />
              <View style={s.focusBody}>
                <View style={s.focusTitleRow}>
                  <Text style={s.focusIcon}>{item.icon}</Text>
                  <Text style={s.focusTitle} numberOfLines={1}>{item.title}</Text>
                </View>
                <Text style={s.focusExplain} numberOfLines={2}>{item.explanation}</Text>
                <View style={s.focusFooter}>
                  <Text style={s.focusOutcome} numberOfLines={1}>{item.expectedOutcome}</Text>
                  <Text style={[s.focusCta, { color: tokens.primary }]}>{item.cta} →</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </SectionCard>
      )}

      {/* ── 13. Operational Timeline ─────────────────────────────── */}
      <SectionCard>
        <SectionTitle title="최근 활동" />
        {timeline.length > 0 ? (
          timeline.slice(0, 6).map((entry) => {
            const { icon, label } = eventLabel(entry.type);
            const meta = entry.metadata as Record<string, string | number | boolean>;
            return (
              <View key={entry.id} style={s.timelineItem}>
                <Text style={s.timelineIcon}>{icon}</Text>
                <View style={s.timelineBody}>
                  <Text style={s.timelineLabel}>{label}</Text>
                  {meta.brand ? (
                    <Text style={s.timelineMeta} numberOfLines={1}>{String(meta.brand)}</Text>
                  ) : null}
                </View>
                <Text style={s.timelineTime}>{timeAgo(entry.timestamp)}</Text>
              </View>
            );
          })
        ) : (
          <EmptyState message="아직 활동 기록 없음 — 추천 액션을 수락하거나 협찬을 업데이트하면 기록됩니다." />
        )}
      </SectionCard>

      {/* ── 14. Operational Stats ────────────────────────────────── */}
      {metrics && (
        <SectionCard>
          <SectionTitle title="운영 통계" />
          <View style={s.statsGrid}>
            <StatBlock label="총 협찬" value={String(metrics.totalDeals)} />
            <StatBlock label="완결률" value={`${(metrics.completionRate * 100).toFixed(0)}%`} />
            <StatBlock label="평균 단가" value={formatKRW(metrics.avgDealValue)} />
            <StatBlock label="활동 월수" value={`${metrics.activeMonths}개월`} />
          </View>
          {metrics.topBrand && (
            <>
              <Divider />
              <MetricRow label="최다 협찬 브랜드" value={metrics.topBrand} />
            </>
          )}
          {metrics.productivityScore > 0 && (
            <>
              <MetricRow
                label="생산성 점수"
                value={`${metrics.productivityScore}/100`}
                valueColor={metrics.productivityScore >= 70 ? tokens.uploaded : metrics.productivityScore >= 40 ? tokens.reviewing : tokens.urgent}
              />
              <View style={s.progressRow}>
                <ProgressBar
                  value={metrics.productivityScore}
                  color={metrics.productivityScore >= 70 ? tokens.uploaded : metrics.productivityScore >= 40 ? tokens.reviewing : tokens.urgent}
                />
              </View>
            </>
          )}
        </SectionCard>
      )}
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: tokens.bg },
  loader: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: tokens.bg, gap: 12, paddingHorizontal: 32,
  },
  loaderText: { fontSize: 14, color: tokens.ink3 },
  pageHeader: {
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8,
    flexDirection: 'row', alignItems: 'baseline', gap: 8,
  },
  pageTitle: { fontSize: 22, fontWeight: '800', color: tokens.ink, letterSpacing: -0.5 },
  pageSubtitle: { fontSize: 12, color: tokens.ink4 },

  progressRow: { paddingHorizontal: 16, marginTop: 4, marginBottom: 10 },

  // Health
  healthBody: {
    flexDirection: 'row', paddingHorizontal: 16, paddingBottom: 14, gap: 20, alignItems: 'center',
  },
  healthMetrics: { flex: 1, gap: 10 },
  metricBlock: { gap: 3 },
  metricBlockLabel: { fontSize: 9, color: tokens.ink4, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  metricBlockVal: { fontSize: 12, fontWeight: '700', color: tokens.ink2 },
  riskChip: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, alignSelf: 'flex-start', marginTop: 2 },
  riskChipText: { fontSize: 11, fontWeight: '700' },

  // Revenue
  revenueHero: { paddingHorizontal: 16, paddingBottom: 14 },
  revenueLabel: { fontSize: 10, color: tokens.ink4, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 3 },
  revenueValue: { fontSize: 30, fontWeight: '800', color: tokens.ink, letterSpacing: -1.5 },
  explanationRow: { paddingHorizontal: 16, paddingBottom: 12, paddingTop: 4 },
  explanationText: { fontSize: 12, color: tokens.ink3, lineHeight: 18 },

  // Forecast Intelligence
  forecastRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 14 },
  forecastBlock: { flex: 1, alignItems: 'center', padding: 10, backgroundColor: tokens.bg, borderRadius: 10 },
  forecastBlockLabel: { fontSize: 10, color: tokens.ink4, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  forecastBlockValue: { fontSize: 18, fontWeight: '800', color: tokens.ink, letterSpacing: -0.5 },
  forecastArrow: { paddingHorizontal: 8 },
  forecastArrowText: { fontSize: 20, fontWeight: '700' },
  uncertaintyRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, gap: 10 },
  uncertaintyLabel: { fontSize: 12, color: tokens.ink3, width: 70 },
  uncertaintyBar: { flex: 1, height: 10, position: 'relative', justifyContent: 'center' },
  uncertaintyCenter: { position: 'absolute', left: '20%', right: '20%', height: 3, borderRadius: 2 },
  uncertaintyBand: { position: 'absolute', left: 0, right: 0, height: 10, borderRadius: 5 },
  uncertaintyPct: { fontSize: 11, fontWeight: '700', color: tokens.ink3, width: 32, textAlign: 'right' },

  // Stability
  stabilityGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 8, paddingBottom: 8, gap: 8 },

  // AI factors
  factorRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 9, gap: 10, alignItems: 'flex-start' },
  factorIcon: { fontSize: 15, marginTop: 1, width: 20 },
  factorBody: { flex: 1 },
  factorName: { fontSize: 13, fontWeight: '600', color: tokens.ink },
  factorDetail: { fontSize: 12, color: tokens.ink3, marginTop: 2, lineHeight: 17 },

  // Weekly review grid
  weeklyGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 8, paddingBottom: 8, gap: 8 },

  // Brand
  brandSummaryRow: { flexDirection: 'row', paddingHorizontal: 12, paddingBottom: 14, gap: 8 },
  brandStat: { flex: 1, alignItems: 'center', paddingVertical: 10, backgroundColor: tokens.bg, borderRadius: 10 },
  brandStatNum: { fontSize: 18, fontWeight: '800', color: tokens.ink },
  brandStatLabel: { fontSize: 10, color: tokens.ink4, marginTop: 2, textAlign: 'center' },
  alertRow: { marginHorizontal: 16, marginBottom: 8, padding: 10, borderRadius: 8 },
  alertText: { fontSize: 12, fontWeight: '600', lineHeight: 17 },
  brandRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  brandDot: { width: 8, height: 8, borderRadius: 4 },
  brandName: { fontSize: 13, fontWeight: '600', color: tokens.ink, maxWidth: 110 },
  brandRepeat: { fontSize: 11, color: tokens.ink4, marginRight: 4 },
  brandStatusChip: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  brandStatusText: { fontSize: 11, fontWeight: '700' },

  // Operational
  subLabel: {
    fontSize: 10, color: tokens.ink4, fontWeight: '700', textTransform: 'uppercase',
    letterSpacing: 0.6, paddingHorizontal: 16, paddingTop: 6, paddingBottom: 8,
  },
  stageDaysRow: { flexDirection: 'row', paddingHorizontal: 12, paddingBottom: 14, gap: 6 },
  stageDayBlock: { flex: 1, alignItems: 'center', paddingVertical: 10, backgroundColor: tokens.bg, borderRadius: 10 },
  stageDayNum: { fontSize: 16, fontWeight: '800', color: tokens.ink },
  stageDayLabel: { fontSize: 9, color: tokens.ink4, marginTop: 2 },

  // Decision center
  focusItem: { flexDirection: 'row', gap: 0, alignItems: 'stretch' },
  focusItemBorder: { borderBottomWidth: 1, borderBottomColor: tokens.border },
  urgencyBar: { width: 3, marginVertical: 10, borderRadius: 2, marginLeft: 12 },
  focusBody: { flex: 1, paddingHorizontal: 12, paddingVertical: 10 },
  focusTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  focusIcon: { fontSize: 14 },
  focusTitle: { fontSize: 13, fontWeight: '700', color: tokens.ink, flex: 1 },
  focusExplain: { fontSize: 12, color: tokens.ink3, lineHeight: 17 },
  focusFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  focusOutcome: { fontSize: 11, color: tokens.ink4, flex: 1 },
  focusCta: { fontSize: 11, fontWeight: '700' },

  // Timeline
  timelineItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 10 },
  timelineIcon: { fontSize: 16, width: 24, textAlign: 'center' },
  timelineBody: { flex: 1 },
  timelineLabel: { fontSize: 13, fontWeight: '600', color: tokens.ink },
  timelineMeta: { fontSize: 12, color: tokens.ink4, marginTop: 1 },
  timelineTime: { fontSize: 11, color: tokens.ink4 },

  // Stats
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 8, paddingBottom: 8, gap: 8 },
});
