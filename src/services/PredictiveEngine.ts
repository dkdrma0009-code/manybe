// Pure computation — no async, no side effects.

export interface DealForPrediction {
  id: string;
  brand: string;
  title: string;
  status: string;
  end_date: string | null;
  amount: number;
  created_at: string;
  updated_at?: string | null;
}

export interface RevenueForPrediction {
  amount: number;
  date: string; // YYYY-MM-DD
}

// ─── Revenue Forecasting ──────────────────────────────────────────────────────

export interface RevenueForecast {
  thisMonthExpected: number;
  nextMonthExpected: number;
  trend: 'up' | 'down' | 'flat';
  confidence: 'high' | 'medium' | 'low';
}

export function forecastRevenue(
  deals: DealForPrediction[],
  revenues: RevenueForPrediction[],
): RevenueForecast {
  const now = new Date();
  const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  const thisMonthStr    = fmt(now);
  const prevMonthStr    = fmt(new Date(now.getFullYear(), now.getMonth() - 1, 1));
  const prevPrevMonthStr = fmt(new Date(now.getFullYear(), now.getMonth() - 2, 1));

  const sum = (prefix: string) =>
    revenues.filter((r) => r.date.startsWith(prefix)).reduce((s, r) => s + r.amount, 0);

  const thisMonth   = sum(thisMonthStr);
  const prevMonth   = sum(prevMonthStr);
  const prevPrev    = sum(prevPrevMonthStr);

  // Extrapolate rest of this month at current daily rate
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysPassed  = now.getDate();
  const dailyRate   = daysPassed > 0 ? thisMonth / daysPassed : 0;
  const projected   = thisMonth + dailyRate * (daysInMonth - daysPassed);

  // Pipeline deals ending this month contribute at 70% probability
  const pipeline = deals
    .filter((d) => d.end_date?.startsWith(thisMonthStr) && d.status !== 'settled')
    .reduce((s, d) => s + d.amount * 0.7, 0);

  const thisMonthExpected = Math.round(projected + pipeline);

  const trend: RevenueForecast['trend'] =
    prevMonth > prevPrev * 1.1 ? 'up' :
    prevMonth < prevPrev * 0.9 ? 'down' : 'flat';

  const nextMonthExpected = Math.round(
    ((prevMonth + prevPrev) / 2) * (trend === 'up' ? 1.1 : trend === 'down' ? 0.9 : 1.0)
  );

  const confidence: RevenueForecast['confidence'] =
    revenues.length >= 5 && prevMonth > 0 ? 'high' :
    revenues.length >= 2 ? 'medium' : 'low';

  return { thisMonthExpected, nextMonthExpected, trend, confidence };
}

// ─── Deal Success Scoring ─────────────────────────────────────────────────────

export interface DealScore {
  dealId: string;
  score: number; // 0–100
  factors: {
    brandReliability: number;   // 0–1
    timelineHealth: number;     // 0–1
    relationshipStrength: number; // 0–1
  };
  verdict: 'strong' | 'moderate' | 'at_risk';
}

export function scoreDeal(deal: DealForPrediction, allDeals: DealForPrediction[]): DealScore {
  const brandDeals  = allDeals.filter((d) => d.brand === deal.brand);
  const settledCount = brandDeals.filter((d) => d.status === 'settled').length;
  const totalCount   = brandDeals.length;

  const brandReliability = totalCount > 1 ? settledCount / totalCount : 0.6;

  let timelineHealth = 0.7;
  if (deal.end_date) {
    const daysUntil = Math.ceil(
      (new Date(deal.end_date).getTime() - Date.now()) / 86_400_000
    );
    timelineHealth = daysUntil > 14 ? 1.0 : daysUntil > 7 ? 0.8 : daysUntil >= 0 ? 0.5 : 0.2;
  }

  const relationshipStrength =
    settledCount >= 3 ? 1.0 :
    settledCount >= 2 ? 0.8 :
    settledCount >= 1 ? 0.6 : 0.4;

  const score = Math.round(brandReliability * 40 + timelineHealth * 40 + relationshipStrength * 20);
  const verdict: DealScore['verdict'] = score >= 70 ? 'strong' : score >= 45 ? 'moderate' : 'at_risk';

  return { dealId: deal.id, score, factors: { brandReliability, timelineHealth, relationshipStrength }, verdict };
}

// ─── Risk Prediction ──────────────────────────────────────────────────────────

export type RiskType =
  | 'settlement_delay'
  | 'schedule_overload'
  | 'burnout'
  | 'low_value_collaboration';

export interface RiskSignal {
  type: RiskType;
  severity: 'high' | 'medium' | 'low';
  description: string;
  affectedDealIds?: string[];
}

export function detectRisks(deals: DealForPrediction[]): RiskSignal[] {
  const signals: RiskSignal[] = [];
  const now         = Date.now();
  const activeDeals = deals.filter((d) => d.status !== 'settled');

  // Settlement delay
  const longDelayed = activeDeals.filter((d) => {
    if (d.status !== 'uploaded') return false;
    return Math.floor((now - new Date(d.created_at).getTime()) / 86_400_000) >= 30;
  });
  if (longDelayed.length > 0) {
    signals.push({
      type: 'settlement_delay',
      severity: 'high',
      description: `${longDelayed.length}건의 협찬이 30일 이상 정산 지연 중이에요`,
      affectedDealIds: longDelayed.map((d) => d.id),
    });
  }

  // Schedule overload: 3+ deals ending in next 7 days
  const nextWeekDeadlines = activeDeals.filter((d) => {
    if (!d.end_date) return false;
    const daysUntil = Math.ceil((new Date(d.end_date).getTime() - now) / 86_400_000);
    return daysUntil >= 0 && daysUntil <= 7;
  });
  if (nextWeekDeadlines.length >= 3) {
    signals.push({
      type: 'schedule_overload',
      severity: nextWeekDeadlines.length >= 4 ? 'high' : 'medium',
      description: `이번 주 마감 ${nextWeekDeadlines.length}건이 집중돼 있어요`,
      affectedDealIds: nextWeekDeadlines.map((d) => d.id),
    });
  }

  // Burnout: too many concurrent active deals
  if (activeDeals.length >= 6) {
    signals.push({
      type: 'burnout',
      severity: activeDeals.length >= 8 ? 'high' : 'medium',
      description: `동시 진행 협찬이 ${activeDeals.length}건이에요. 집중력 분산 위험이 있어요`,
    });
  }

  // Low-value
  const lowValue = activeDeals.filter((d) => d.amount > 0 && d.amount < 50_000);
  if (lowValue.length >= 2) {
    signals.push({
      type: 'low_value_collaboration',
      severity: 'low',
      description: `5만원 미만 협찬 ${lowValue.length}건이 진행 중이에요`,
      affectedDealIds: lowValue.map((d) => d.id),
    });
  }

  return signals;
}

// ─── Opportunity Detection ────────────────────────────────────────────────────

export type OpportunityType = 'reengagement' | 'upsell' | 'long_term_partner' | 'high_value_brand';

export interface Opportunity {
  type: OpportunityType;
  brand: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
}

export function detectOpportunities(deals: DealForPrediction[]): Opportunity[] {
  const opportunities: Opportunity[] = [];
  const now = Date.now();
  const activeBrands = new Set(deals.filter((d) => d.status !== 'settled').map((d) => d.brand));

  const brandSettled = new Map<string, DealForPrediction[]>();
  for (const deal of deals.filter((d) => d.status === 'settled')) {
    if (!brandSettled.has(deal.brand)) brandSettled.set(deal.brand, []);
    brandSettled.get(deal.brand)!.push(deal);
  }

  for (const [brand, settled] of brandSettled) {
    if (activeBrands.has(brand)) continue;

    const latest = settled.reduce((a, b) =>
      new Date(a.created_at) > new Date(b.created_at) ? a : b
    );
    const daysSince = Math.floor((now - new Date(latest.created_at).getTime()) / 86_400_000);

    if (settled.length >= 3) {
      opportunities.push({
        type: 'long_term_partner',
        brand,
        title: `${brand} 장기 파트너 관계`,
        description: `${settled.length}번 협업한 브랜드예요. 정기 파트너십을 제안해보세요.`,
        priority: 'high',
      });
      continue;
    }

    if (daysSince >= 60 && daysSince <= 270) {
      const avg = settled.reduce((s, d) => s + d.amount, 0) / settled.length;
      opportunities.push({
        type: avg >= 300_000 ? 'upsell' : 'reengagement',
        brand,
        title: `${brand} ${avg >= 300_000 ? '업셀' : '재협업'} 기회`,
        description: avg >= 300_000
          ? `평균 ${Math.round(avg / 10_000)}만원 브랜드예요. 더 높은 금액으로 제안해보세요.`
          : `마지막 협찬 후 ${daysSince}일이 지났어요. 다시 제안해보세요.`,
        priority: settled.length >= 2 ? 'high' : 'medium',
      });
    }
  }

  const P = { high: 0, medium: 1, low: 2 };
  return opportunities.sort((a, b) => P[a.priority] - P[b.priority]).slice(0, 5);
}
