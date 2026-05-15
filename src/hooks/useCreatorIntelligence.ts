import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../api/supabase';
import { computeDealHealthSimple, HealthLevel } from '../utils/dealHealth';

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface BrandProfile {
  brand: string;
  dealCount: number;
  settledCount: number;
  totalEarned: number;
  avgAmount: number;
  completionRate: number;
  hasStaleUploaded: boolean;
  isRisky: boolean;
  isReturning: boolean;
}

export interface CreatorIntelligence {
  // Pipeline health
  healthCounts: Record<HealthLevel, number>;
  overallHealthScore: number;       // 0–100, higher is healthier

  // Revenue intelligence
  thisMonthRevenue: number;
  lastMonthRevenue: number;
  pipelineValue: number;            // sum of active deal amounts
  forecastedMonthRevenue: number;   // pipelineValue × historical completion rate

  // Brand intelligence
  topBrands: BrandProfile[];        // sorted by totalEarned
  riskyBrands: BrandProfile[];      // hasStaleUploaded
  returningBrands: BrandProfile[];  // dealCount >= 2

  // Activity score 0–100
  activityScore: number;
  activityLabel: '비활성' | '보통' | '활발' | '매우 활발';

  // Deal velocity
  dealsCreatedLast30Days: number;
  dealsSettledLast30Days: number;

  loading: boolean;
}

// ─── Schema extension notes ───────────────────────────────────────────────────
// Current schema limits some intelligence features. To unlock full analytics:
//
//   ALTER TABLE deals ADD COLUMN IF NOT EXISTS status_changed_at timestamptz;
//   -- Populated via trigger on status update
//   -- Enables: avg settlement period, avg response time, pipeline velocity
//
//   ALTER TABLE deals ADD COLUMN IF NOT EXISTS revision_count int DEFAULT 0;
//   -- Populated in app on each save
//   -- Enables: revision risk signal
//
// Until then, createdAt is used as a proxy for all time-based signals.
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT: CreatorIntelligence = {
  healthCounts: { healthy: 0, attention: 0, overdue: 0, risky: 0 },
  overallHealthScore: 100,
  thisMonthRevenue: 0,
  lastMonthRevenue: 0,
  pipelineValue: 0,
  forecastedMonthRevenue: 0,
  topBrands: [],
  riskyBrands: [],
  returningBrands: [],
  activityScore: 0,
  activityLabel: '비활성',
  dealsCreatedLast30Days: 0,
  dealsSettledLast30Days: 0,
  loading: true,
};

function activityLabel(score: number): CreatorIntelligence['activityLabel'] {
  if (score >= 75) return '매우 활발';
  if (score >= 50) return '활발';
  if (score >= 25) return '보통';
  return '비활성';
}

export function useCreatorIntelligence(userId: string | undefined) {
  const [intel, setIntel] = useState<CreatorIntelligence>(DEFAULT);

  const compute = useCallback(async () => {
    if (!userId) return;

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
    const prevMonthEnd   = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
    const day30Ago = new Date(now); day30Ago.setDate(now.getDate() - 30);
    const day30AgoStr = day30Ago.toISOString().split('T')[0];

    const [dealsRes, revenueRes, prevRevenueRes] = await Promise.all([
      supabase
        .from('deals')
        .select('id, brand, amount, status, end_date, created_at')
        .eq('user_id', userId),
      supabase
        .from('revenues')
        .select('amount')
        .eq('user_id', userId)
        .gte('date', monthStart)
        .lte('date', monthEnd),
      supabase
        .from('revenues')
        .select('amount')
        .eq('user_id', userId)
        .gte('date', prevMonthStart)
        .lte('date', prevMonthEnd),
    ]);

    const deals = dealsRes.data ?? [];
    const thisMonthRevenue = (revenueRes.data ?? []).reduce((s, r) => s + r.amount, 0);
    const lastMonthRevenue = (prevRevenueRes.data ?? []).reduce((s, r) => s + r.amount, 0);

    // ── Health counts ──────────────────────────────────────────────────────
    const healthCounts: Record<HealthLevel, number> = { healthy: 0, attention: 0, overdue: 0, risky: 0 };
    let pipelineValue = 0;

    for (const d of deals) {
      if (d.status === 'settled') continue;
      const level = computeDealHealthSimple({
        status: d.status,
        endDate: d.end_date,
        amount: d.amount,
        createdAt: d.created_at,
      });
      healthCounts[level]++;
      pipelineValue += d.amount;
    }

    const activeDealCount = deals.filter((d) => d.status !== 'settled').length;
    const healthyRatio = activeDealCount > 0
      ? (healthCounts.healthy / activeDealCount)
      : 1;
    const overallHealthScore = Math.round(
      healthyRatio * 60 +
      (1 - Math.min(healthCounts.overdue / Math.max(activeDealCount, 1), 1)) * 25 +
      (1 - Math.min(healthCounts.risky / Math.max(activeDealCount, 1), 1)) * 15
    );

    // ── Brand profiles ─────────────────────────────────────────────────────
    const brandMap = new Map<string, {
      deals: typeof deals; settled: number; earned: number;
    }>();

    for (const d of deals) {
      if (!brandMap.has(d.brand)) brandMap.set(d.brand, { deals: [], settled: 0, earned: 0 });
      const b = brandMap.get(d.brand)!;
      b.deals.push(d);
      if (d.status === 'settled') { b.settled++; b.earned += d.amount; }
    }

    const now_ms = Date.now();
    const brandProfiles: BrandProfile[] = Array.from(brandMap.entries()).map(([brand, b]) => {
      const amounts = b.deals.filter((d) => d.amount > 0).map((d) => d.amount);
      const avgAmount = amounts.length > 0 ? Math.round(amounts.reduce((s, a) => s + a, 0) / amounts.length) : 0;
      const completionRate = b.deals.length > 0 ? Math.round((b.settled / b.deals.length) * 100) : 0;
      const hasStaleUploaded = b.deals.some(
        (d) => d.status === 'uploaded' && (now_ms - new Date(d.created_at).getTime()) > 45 * 86400000
      );
      return {
        brand,
        dealCount: b.deals.length,
        settledCount: b.settled,
        totalEarned: b.earned,
        avgAmount,
        completionRate,
        hasStaleUploaded,
        isRisky: hasStaleUploaded,
        isReturning: b.deals.length >= 2,
      };
    });

    const topBrands    = [...brandProfiles].sort((a, b) => b.totalEarned - a.totalEarned).slice(0, 5);
    const riskyBrands  = brandProfiles.filter((b) => b.isRisky);
    const returningBrands = brandProfiles.filter((b) => b.isReturning);

    // ── Activity score ─────────────────────────────────────────────────────
    const dealsCreatedLast30Days = deals.filter(
      (d) => d.created_at?.slice(0, 10) >= day30AgoStr
    ).length;
    const dealsSettledLast30Days = deals.filter(
      (d) => d.status === 'settled' && d.created_at?.slice(0, 10) >= day30AgoStr
    ).length;

    // Score components (each 0–100, weighted):
    // 40% creation velocity (deals in last 30d, cap at 5 = 100%)
    // 30% settlement rate (settled / total active+settled, cap at 100%)
    // 30% brand diversity (unique brands, cap at 10 = 100%)
    const velocityScore = Math.min(dealsCreatedLast30Days / 5, 1) * 40;
    const allSettleable = deals.filter((d) => d.status !== 'inquiry').length;
    const settledAll = deals.filter((d) => d.status === 'settled').length;
    const settlementScore = allSettleable > 0 ? (settledAll / allSettleable) * 30 : 0;
    const diversityScore = Math.min(brandMap.size / 10, 1) * 30;
    const actScore = Math.round(velocityScore + settlementScore + diversityScore);

    // ── Forecast ───────────────────────────────────────────────────────────
    const historicalCompletionRate = allSettleable > 0 ? settledAll / allSettleable : 0.6;
    const forecastedMonthRevenue = Math.round(
      thisMonthRevenue + pipelineValue * historicalCompletionRate * 0.3
    );

    setIntel({
      healthCounts,
      overallHealthScore,
      thisMonthRevenue,
      lastMonthRevenue,
      pipelineValue,
      forecastedMonthRevenue,
      topBrands,
      riskyBrands,
      returningBrands,
      activityScore: actScore,
      activityLabel: activityLabel(actScore),
      dealsCreatedLast30Days,
      dealsSettledLast30Days,
      loading: false,
    });
  }, [userId]);

  useEffect(() => { compute(); }, [compute]);

  return { ...intel, refetch: compute };
}
