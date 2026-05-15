// Pure computation — multi-layer intelligence from deal + revenue + inquiry data.

import { AutomationDeal, AutomationInquiry } from './AutomationEngine';

interface RevenueEntry {
  amount: number;
  date: string; // YYYY-MM-DD
}

// ─── Intelligence types ───────────────────────────────────────────────────────

export interface PersonalIntelligence {
  productivityScore: number;
  activityRhythm: 'consistent' | 'sporadic' | 'declining';
  burnoutRisk: 'high' | 'medium' | 'low';
  dealVelocity: number; // deals settled per 30 days
}

export interface FinancialIntelligence {
  revenueVolatility: 'high' | 'medium' | 'low';
  settlementReliability: number; // 0–100
  forecastConfidence: number; // 0–100
  monthlyTrend: 'growing' | 'stable' | 'declining';
  projectedThisMonth: number;
}

export interface RelationshipIntelligence {
  topBrands: Array<{
    brand: string;
    loyaltyScore: number;
    repeatProbability: number;
    status: 'active' | 'at_risk' | 'target';
  }>;
  dependencyRisk: 'high' | 'medium' | 'low';
  avgRelationshipAgeMonths: number;
  uniqueBrandCount: number;
}

export interface OperationalIntelligence {
  bottleneckStage: string;
  avgStageDays: Record<string, number>;
  automationHitRate: number; // % of active deals that are stale
  timelineCongestion: boolean;
}

export interface CreatorIntelligence {
  personal: PersonalIntelligence;
  financial: FinancialIntelligence;
  relationship: RelationshipIntelligence;
  operational: OperationalIntelligence;
  compositeScore: number; // 0–100
  trend: 'improving' | 'stable' | 'declining';
  computedAt: string;
}

// ─── Computation ──────────────────────────────────────────────────────────────

export function computeIntelligence(
  deals: AutomationDeal[],
  revenues: RevenueEntry[],
  _inquiries: AutomationInquiry[],
): CreatorIntelligence {
  const now          = Date.now();
  const thirtyAgo    = now - 30 * 86_400_000;
  const sixtyAgo     = now - 60 * 86_400_000;
  const activeDeals  = deals.filter((d) => d.status !== 'settled');
  const settledDeals = deals.filter((d) => d.status === 'settled');

  // ── Personal intelligence ──────────────────────────────────────────────────
  const recentSettled = settledDeals.filter((d) => new Date(d.created_at).getTime() > thirtyAgo).length;
  const olderSettled  = settledDeals.filter((d) => {
    const t = new Date(d.created_at).getTime();
    return t > sixtyAgo && t <= thirtyAgo;
  }).length;

  const staleCount = activeDeals.filter((d) => {
    const last = d.updated_at ?? d.created_at;
    return Math.floor((now - new Date(last).getTime()) / 86_400_000) >= 7;
  }).length;

  const activityRhythm: PersonalIntelligence['activityRhythm'] =
    recentSettled >= 2 ? 'consistent' :
    recentSettled >= 1 && olderSettled >= 1 ? 'consistent' :
    recentSettled === 0 && olderSettled === 0 ? 'declining' :
    'sporadic';

  const burnoutRisk: PersonalIntelligence['burnoutRisk'] =
    activeDeals.length >= 6 && staleCount >= 2 ? 'high' :
    activeDeals.length >= 4 && staleCount >= 1 ? 'medium' :
    'low';

  const productivityScore = Math.max(0, Math.min(100, Math.round(
    50 + recentSettled * 10 - staleCount * 8
    - (burnoutRisk === 'high' ? 15 : burnoutRisk === 'medium' ? 5 : 0),
  )));

  // ── Financial intelligence ─────────────────────────────────────────────────
  const recentRevs = revenues.filter((r) => new Date(r.date).getTime() > thirtyAgo);
  const olderRevs  = revenues.filter((r) => {
    const t = new Date(r.date).getTime();
    return t > sixtyAgo && t <= thirtyAgo;
  });

  const thisMonthTotal  = recentRevs.reduce((s, r) => s + r.amount, 0);
  const prevMonthTotal  = olderRevs.reduce((s, r) => s + r.amount, 0);

  // Coefficient of variation for volatility
  const allAmounts = revenues.map((r) => r.amount);
  const mean = allAmounts.length ? allAmounts.reduce((s, a) => s + a, 0) / allAmounts.length : 0;
  const variance = allAmounts.length
    ? allAmounts.reduce((s, a) => s + (a - mean) ** 2, 0) / allAmounts.length : 0;
  const cv = mean > 0 ? Math.sqrt(variance) / mean : 0;

  const revenueVolatility: FinancialIntelligence['revenueVolatility'] =
    cv > 0.5 ? 'high' : cv > 0.25 ? 'medium' : 'low';

  const monthlyTrend: FinancialIntelligence['monthlyTrend'] =
    thisMonthTotal > prevMonthTotal * 1.1 ? 'growing' :
    thisMonthTotal < prevMonthTotal * 0.9 ? 'declining' :
    'stable';

  const uploadedOrSettled = deals.filter((d) => ['uploaded', 'settled'].includes(d.status)).length;
  const settlementReliability = uploadedOrSettled > 0
    ? Math.round((settledDeals.length / uploadedOrSettled) * 100) : 100;

  const forecastConfidence = Math.max(20, Math.min(95, Math.round(40 + revenues.length * 3 - cv * 40)));

  // Pipeline pipeline projected (settled revenue + 30% chance on active)
  const projectedThisMonth = thisMonthTotal +
    activeDeals.filter((d) => d.status !== 'uploaded').reduce((s, d) => s + d.amount, 0) * 0.3;

  // ── Relationship intelligence ──────────────────────────────────────────────
  const brandMap = new Map<string, { count: number; settled: number; total: number; lastMs: number }>();
  for (const deal of deals) {
    if (!brandMap.has(deal.brand)) brandMap.set(deal.brand, { count: 0, settled: 0, total: 0, lastMs: 0 });
    const e = brandMap.get(deal.brand)!;
    e.count++;
    if (deal.status === 'settled') e.settled++;
    e.total += deal.amount;
    const ms = new Date(deal.created_at).getTime();
    if (ms > e.lastMs) e.lastMs = ms;
  }

  const topBrands = [...brandMap.entries()]
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 5)
    .map(([brand, info]) => {
      const loyaltyScore = Math.min(100, Math.round(
        info.count * 20 + (info.settled / Math.max(1, info.count)) * 40,
      ));
      const repeatProbability = Math.round(
        Math.min(0.95, 0.2 + info.count * 0.2 + (info.settled / Math.max(1, info.count)) * 0.3) * 100,
      ) / 100;
      const daysSince = Math.floor((now - info.lastMs) / 86_400_000);
      const status: RelationshipIntelligence['topBrands'][0]['status'] =
        activeDeals.some((d) => d.brand === brand) ? 'active' :
        daysSince < 90 ? 'at_risk' : 'target';
      return { brand, loyaltyScore, repeatProbability, status };
    });

  const totalRevenue  = revenues.reduce((s, r) => s + r.amount, 0) || 1;
  const topBrandRev   = [...brandMap.values()].sort((a, b) => b.total - a.total)[0]?.total ?? 0;
  const topRevShare   = topBrandRev / totalRevenue;
  const dependencyRisk: RelationshipIntelligence['dependencyRisk'] =
    topRevShare > 0.6 ? 'high' : topRevShare > 0.4 ? 'medium' : 'low';

  const avgRelAgeMonths = deals.length
    ? Math.round(deals.reduce((s, d) => s + (now - new Date(d.created_at).getTime()), 0)
        / (deals.length * 30 * 86_400_000))
    : 0;

  // ── Operational intelligence ───────────────────────────────────────────────
  const STAGES = ['inquiry', 'reviewing', 'in_progress', 'uploaded', 'settled'];
  const avgStageDays: Record<string, number> = {};
  for (const stage of STAGES) {
    const group = deals.filter((d) => d.status === stage);
    if (!group.length) continue;
    avgStageDays[stage] = Math.round(
      group.reduce((s, d) => s + (now - new Date(d.created_at).getTime()), 0)
        / (group.length * 86_400_000),
    );
  }
  const bottleneckStage = Object.entries(avgStageDays).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'inquiry';

  const automationHitRate = activeDeals.length > 0
    ? Math.round((staleCount / activeDeals.length) * 100) : 0;

  const timelineCongestion = activeDeals.filter((d) => {
    if (!d.end_date) return false;
    const ms = new Date(d.end_date).getTime();
    return ms > now && ms < now + 14 * 86_400_000;
  }).length >= 3;

  // ── Composite score ────────────────────────────────────────────────────────
  const compositeScore = Math.round(
    productivityScore * 0.3
    + settlementReliability * 0.2
    + (dependencyRisk === 'low' ? 80 : dependencyRisk === 'medium' ? 60 : 40) * 0.2
    + forecastConfidence * 0.15
    + (burnoutRisk === 'low' ? 90 : burnoutRisk === 'medium' ? 60 : 30) * 0.15,
  );

  const trend: CreatorIntelligence['trend'] =
    monthlyTrend === 'growing' && activityRhythm === 'consistent' ? 'improving' :
    monthlyTrend === 'declining' || activityRhythm === 'declining' ? 'declining' :
    'stable';

  return {
    personal:      { productivityScore, activityRhythm, burnoutRisk, dealVelocity: recentSettled },
    financial:     { revenueVolatility, settlementReliability, forecastConfidence, monthlyTrend, projectedThisMonth: Math.round(projectedThisMonth) },
    relationship:  { topBrands, dependencyRisk, avgRelationshipAgeMonths: avgRelAgeMonths, uniqueBrandCount: brandMap.size },
    operational:   { bottleneckStage, avgStageDays, automationHitRate, timelineCongestion },
    compositeScore,
    trend,
    computedAt: new Date().toISOString(),
  };
}
