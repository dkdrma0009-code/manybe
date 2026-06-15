// AnalyticsScreen 데이터 레이어 — 11개 훅 + 파생 지표를 단일 훅으로 묶는다.
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../api/supabase';
import { useIntelligence } from '../../hooks/useIntelligence';
import { useChannelAnalysis } from '../../hooks/useChannelAnalysis';
import { useAnalytics } from '../../hooks/useAnalytics';
import { useDecisionEngine } from '../../hooks/useDecisionEngine';
import { useBusinessGraph } from '../../hooks/useBusinessGraph';
import { useWeeklyReview } from '../../hooks/useWeeklyReview';
import { useRevenueData } from '../../hooks/useRevenueData';
import { useActivation } from '../../hooks/useActivation';
import { getRecentEvents } from '../../services/OperationalMemory';
import type { MemoryEntry } from '../../services/OperationalMemory';
import type { ChartBar } from '../../components/RevenueBarChart';
import { explainHealthScore, forecastRevenueTool } from './helpers';

export function useAnalyticsData(userId: string | undefined) {
  const now = new Date();
  const [ytChannelId, setYtChannelId] = useState<string | undefined>();

  useEffect(() => {
    if (!userId) return;
    supabase
      .from('social_channels')
      .select('channel_id')
      .eq('user_id', userId)
      .eq('platform', 'youtube')
      .limit(1)
      .single()
      .then(({ data }) => { if (data?.channel_id) setYtChannelId(data.channel_id); });
  }, [userId]);

  const channelAnalysis = useChannelAnalysis(userId, ytChannelId);

  const { intelligence, loading: intLoading, refetch: refetchInt } = useIntelligence(userId);
  const { metrics, loading: metricsLoading, refetch: refetchMetrics } = useAnalytics(userId);
  const { focusItems, refetch: refetchDecision } = useDecisionEngine(userId);
  const { graph, refetch: refetchGraph } = useBusinessGraph(userId);
  const { review: weeklyReview, refetch: refetchReview } = useWeeklyReview(userId);
  const { data: revenueData, refetch: refetchRevenue } = useRevenueData(
    userId, now.getFullYear(), now.getMonth(),
  );

  const [timeline, setTimeline] = useState<MemoryEntry[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const { mark: markActivation } = useActivation();

  // Track first insight view once real data is loaded
  useEffect(() => {
    if (intelligence) markActivation('first_insight_viewed');
  }, [!!intelligence]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { getRecentEvents(10).then(setTimeline); }, []);

  // ── Derived intelligence ──────────────────────────────────────────────────

  const healthExplanation = useMemo(
    () => (intelligence ? explainHealthScore(intelligence, null) : null),
    [intelligence],
  );
  const forecast = useMemo(
    () => (intelligence ? forecastRevenueTool(intelligence) : null),
    [intelligence],
  );
  const decisionItems = useMemo(() => focusItems.slice(0, 5), [focusItems]);
  const topBrands = intelligence?.relationship.topBrands.slice(0, 5) ?? [];

  // Bar chart: 6 months + optional forecast bar
  const chartBars = useMemo(() => {
    const bars = revenueData.barData;
    if (!bars.length) return [];
    // BarItem uses `month`; ChartBar uses `label` — map explicitly
    const withFlags: ChartBar[] = bars.map((item, idx) => ({
      label: item.month,
      value: item.value,
      isCurrentMonth: idx === bars.length - 1,
    }));
    // Append projected bar if intelligence is available
    if (intelligence?.financial.projectedThisMonth) {
      const MONTH_NAMES = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];
      const nextMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      withFlags.push({
        label: MONTH_NAMES[nextMonthDate.getMonth()] + '예측',
        value: intelligence.financial.projectedThisMonth,
        isForecast: true,
        isCurrentMonth: false,
      });
    }
    return withFlags;
  }, [revenueData.barData, intelligence]);

  // Next month revenue projection
  const nextMonthForecast = useMemo(() => {
    const f = intelligence?.financial;
    if (!f) return null;
    const m = f.monthlyTrend === 'growing' ? 1.08 : f.monthlyTrend === 'declining' ? 0.92 : 1.0;
    return Math.round(f.projectedThisMonth * m);
  }, [intelligence]);

  // Stability score (0–100)
  const stabilityScore = useMemo(() => {
    const f = intelligence?.financial;
    if (!f) return null;
    const volScore = f.revenueVolatility === 'low' ? 90 : f.revenueVolatility === 'medium' ? 60 : 30;
    return Math.round((f.settlementReliability + volScore) / 2);
  }, [intelligence]);

  // Recurring brand ratio
  const recurringBrandRatio = useMemo(() => {
    const r = intelligence?.relationship;
    if (!r || r.uniqueBrandCount === 0) return 0;
    const active = r.topBrands.filter((b) => b.status === 'active').length;
    return Math.round((active / Math.max(r.uniqueBrandCount, 1)) * 100);
  }, [intelligence]);

  // Response speed derived from stale deal ratio
  const responseSpeed: 'fast' | 'moderate' | 'slow' = useMemo(() => {
    const hitRate = intelligence?.operational.automationHitRate ?? 0;
    return hitRate < 15 ? 'fast' : hitRate < 35 ? 'moderate' : 'slow';
  }, [intelligence]);

  const isLoading = (intLoading || metricsLoading) && !intelligence;

  async function handleRefresh() {
    setRefreshing(true);
    await Promise.all([
      refetchInt(), refetchMetrics(), refetchDecision(),
      refetchGraph(), refetchReview(), refetchRevenue(),
    ]);
    const events = await getRecentEvents(10);
    setTimeline(events);
    setRefreshing(false);
  }

  return {
    ytChannelId,
    channelAnalysis,
    intelligence,
    metrics,
    graph,
    weeklyReview,
    timeline,
    refreshing,
    isLoading,
    handleRefresh,
    healthExplanation,
    forecast,
    decisionItems,
    topBrands,
    chartBars,
    nextMonthForecast,
    stabilityScore,
    recurringBrandRatio,
    responseSpeed,
  };
}
