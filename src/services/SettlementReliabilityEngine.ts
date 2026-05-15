// Pure computation — no async, no side effects.
// Brand-level settlement reliability: duration tracking, delay probability, overdue exposure.

export interface SettledDeal {
  id: string;
  brand: string;
  amount: number;
  upload_date: string;   // ISO date string
  settled_date: string;  // ISO date string
}

export interface PendingDeal {
  id: string;
  brand: string;
  amount: number;
  upload_date: string;   // ISO date string
  status: string;
}

export interface BrandReliability {
  brand: string;
  avgSettlementDays: number;
  dealCount: number;      // number of settled deals analyzed
  delayRate: number;      // 0-1, fraction paid after 30 days
  reliabilityScore: number; // 0-100
}

export interface OverdueExposure {
  dealId: string;
  brand: string;
  amount: number;
  daysOverdue: number;    // days past the 30-day expected window
  riskLevel: 'low' | 'medium' | 'high';
}

export interface SettlementReliabilityReport {
  overallScore: number;           // 0-100, weighted by deal amount
  avgSettlementDays: number;      // across all settled deals
  overdueExposure: number;        // total KRW at risk (overdue pending deals)
  overdueDeals: OverdueExposure[];
  brandBreakdown: BrandReliability[];
  delayProbability: number;       // 0-1, likelihood next deal will be delayed
}

const EXPECTED_SETTLEMENT_DAYS = 30;
const HIGH_RISK_DAYS = 60;
const MEDIUM_RISK_DAYS = 45;

function daysBetween(a: string, b: string): number {
  return Math.floor((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000);
}

export function computeSettlementReliability(
  settledDeals: SettledDeal[],
  pendingDeals: PendingDeal[],
  todayISO: string,
): SettlementReliabilityReport {
  if (settledDeals.length === 0 && pendingDeals.length === 0) {
    return {
      overallScore: 80,
      avgSettlementDays: 0,
      overdueExposure: 0,
      overdueDeals: [],
      brandBreakdown: [],
      delayProbability: 0.2,
    };
  }

  // Per-brand reliability from historical settled deals
  const brandMap = new Map<string, { durations: number[]; totalAmount: number }>();
  for (const deal of settledDeals) {
    const days = daysBetween(deal.upload_date, deal.settled_date);
    const entry = brandMap.get(deal.brand) ?? { durations: [], totalAmount: 0 };
    entry.durations.push(days);
    entry.totalAmount += deal.amount;
    brandMap.set(deal.brand, entry);
  }

  const brandBreakdown: BrandReliability[] = [];
  let weightedScore = 0;
  let totalWeight = 0;

  for (const [brand, data] of brandMap.entries()) {
    const avg = data.durations.reduce((s, d) => s + d, 0) / data.durations.length;
    const delayRate = data.durations.filter((d) => d > EXPECTED_SETTLEMENT_DAYS).length / data.durations.length;

    // Score: 100 if avg ≤ 14 days, 0 if avg ≥ 60 days
    const score = Math.max(0, Math.min(100, Math.round(
      100 - ((avg - 14) / (60 - 14)) * 100,
    )));

    brandBreakdown.push({
      brand,
      avgSettlementDays: Math.round(avg),
      dealCount: data.durations.length,
      delayRate: Math.round(delayRate * 100) / 100,
      reliabilityScore: score,
    });

    weightedScore += score * data.totalAmount;
    totalWeight += data.totalAmount;
  }

  const overallScore = totalWeight > 0
    ? Math.round(weightedScore / totalWeight)
    : 80;

  const allDurations = settledDeals.map((d) => daysBetween(d.upload_date, d.settled_date));
  const avgSettlementDays = allDurations.length > 0
    ? Math.round(allDurations.reduce((s, d) => s + d, 0) / allDurations.length)
    : 0;

  const delayedCount = allDurations.filter((d) => d > EXPECTED_SETTLEMENT_DAYS).length;
  const delayProbability = allDurations.length > 0
    ? Math.round((delayedCount / allDurations.length) * 100) / 100
    : 0.2;

  // Overdue exposure from pending deals
  const overdueDeals: OverdueExposure[] = [];
  let overdueExposure = 0;

  for (const deal of pendingDeals) {
    if (deal.status === 'settled') continue;
    const daysSinceUpload = daysBetween(deal.upload_date, todayISO);
    const daysOverdue = daysSinceUpload - EXPECTED_SETTLEMENT_DAYS;
    if (daysOverdue <= 0) continue;

    const riskLevel: OverdueExposure['riskLevel'] =
      daysOverdue >= HIGH_RISK_DAYS - EXPECTED_SETTLEMENT_DAYS ? 'high'
      : daysOverdue >= MEDIUM_RISK_DAYS - EXPECTED_SETTLEMENT_DAYS ? 'medium'
      : 'low';

    overdueDeals.push({ dealId: deal.id, brand: deal.brand, amount: deal.amount, daysOverdue, riskLevel });
    overdueExposure += deal.amount;
  }

  overdueDeals.sort((a, b) => b.daysOverdue - a.daysOverdue);

  return {
    overallScore,
    avgSettlementDays,
    overdueExposure,
    overdueDeals,
    brandBreakdown: brandBreakdown.sort((a, b) => b.dealCount - a.dealCount),
    delayProbability,
  };
}
