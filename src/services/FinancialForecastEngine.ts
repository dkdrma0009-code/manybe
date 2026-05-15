// Pure computation — no async, no side effects.
// Advanced revenue forecasting with trend-weighting, confidence intervals,
// seasonal adjustment, pipeline boosting, and settlement-reliability weighting.

export interface MonthlyRevenue {
  yearMonth: string; // "YYYY-MM"
  amount: number;
}

export interface DealForForecast {
  id: string;
  status: string;
  end_date: string | null;
  amount: number;
  created_at: string;
}

export interface ForecastInterval {
  low: number;
  mid: number;
  high: number;
}

export interface ExtendedForecast {
  nextMonth: ForecastInterval;
  twoMonthsOut: number;
  threeMonthsOut: number;
  trendMoM: number;          // month-over-month % change (last 3 months avg)
  seasonalFactor: number;    // 1.0 = neutral, >1 = seasonal boost
  pipelineBoost: number;     // incremental from active deals
  reliabilityAdjusted: number; // mid after settlement penalty
  forecastConfidence: number; // 0-100
  dataMonths: number;        // how many months of data available
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

// ─── Pipeline probability by deal status ─────────────────────────────────────

const STATUS_PROBABILITY: Record<string, number> = {
  in_progress: 0.75,
  reviewing:   0.50,
  inquiry:     0.25,
  uploaded:    0.90,
};

// ─── Main engine ──────────────────────────────────────────────────────────────

export function computeExtendedForecast(
  monthlyRevenues: MonthlyRevenue[],
  deals: DealForForecast[],
  settlementReliability: number, // 0-100
): ExtendedForecast {
  const now = new Date();
  const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const nextMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const nextMonthKey = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, '0')}`;

  // Sort months ascending, exclude current month (partial)
  const historicalMonths = monthlyRevenues
    .filter((m) => m.yearMonth < thisMonthKey)
    .sort((a, b) => a.yearMonth.localeCompare(b.yearMonth));

  const dataMonths = historicalMonths.length;

  if (dataMonths === 0) {
    return {
      nextMonth: { low: 0, mid: 0, high: 0 },
      twoMonthsOut: 0,
      threeMonthsOut: 0,
      trendMoM: 0,
      seasonalFactor: 1.0,
      pipelineBoost: 0,
      reliabilityAdjusted: 0,
      forecastConfidence: 10,
      dataMonths: 0,
    };
  }

  // Trend-weighted average: recent months get higher weight
  // Last month = weight dataMonths, oldest = weight 1
  const weights = historicalMonths.map((_, i) => i + 1);
  const totalWeight = weights.reduce((s, w) => s + w, 0);
  const weightedBase = historicalMonths.reduce((s, m, i) => s + m.amount * weights[i], 0) / totalWeight;

  // Trend: MoM growth rate over last 3 available months
  let trendMoM = 0;
  if (dataMonths >= 3) {
    const last3 = historicalMonths.slice(-3);
    const growthRates: number[] = [];
    for (let i = 1; i < last3.length; i++) {
      if (last3[i - 1].amount > 0) {
        growthRates.push((last3[i].amount - last3[i - 1].amount) / last3[i - 1].amount);
      }
    }
    trendMoM = growthRates.length > 0
      ? growthRates.reduce((s, r) => s + r, 0) / growthRates.length
      : 0;
  }

  // Seasonal adjustment: compare same month last year vs annual avg
  let seasonalFactor = 1.0;
  const sameMonthLastYear = historicalMonths.find(
    (m) => m.yearMonth === `${now.getFullYear() - 1}-${String(nextMonthDate.getMonth() + 1).padStart(2, '0')}`,
  );
  if (sameMonthLastYear && dataMonths >= 6) {
    const annualAvg = historicalMonths.slice(-12).reduce((s, m) => s + m.amount, 0)
      / Math.min(12, dataMonths);
    if (annualAvg > 0) {
      seasonalFactor = Math.max(0.6, Math.min(1.6, sameMonthLastYear.amount / annualAvg));
    }
  }

  // Trend-adjusted base
  const trendAdjusted = weightedBase * (1 + trendMoM) * seasonalFactor;

  // Pipeline boost: deals ending in next month × probability
  const pipelineBoost = deals
    .filter((d) => {
      if (!d.end_date || d.status === 'settled') return false;
      return d.end_date.startsWith(nextMonthKey);
    })
    .reduce((s, d) => s + d.amount * (STATUS_PROBABILITY[d.status] ?? 0.3), 0);

  const midForecast = Math.max(0, Math.round(trendAdjusted + pipelineBoost));

  // Confidence interval based on historical std dev
  const allAmounts = historicalMonths.map((m) => m.amount);
  const sd = stdDev(allAmounts);
  const lowForecast  = Math.max(0, Math.round(midForecast - sd));
  const highForecast = Math.round(midForecast + sd);

  // Settlement reliability penalty (mild: 0.95 factor at 80%, 0.85 at 60%)
  const reliabilityFactor = 0.7 + (settlementReliability / 100) * 0.3;
  const reliabilityAdjusted = Math.round(midForecast * reliabilityFactor);

  // Multi-month projection
  const growthRate = 1 + Math.max(-0.1, Math.min(0.1, trendMoM));
  const twoMonthsOut   = Math.round(midForecast * growthRate);
  const threeMonthsOut = Math.round(twoMonthsOut * growthRate);

  // Confidence: improves with more data, penalized by volatility
  const cv = weightedBase > 0 ? sd / weightedBase : 1;
  const forecastConfidence = Math.max(15, Math.min(90, Math.round(
    30 + dataMonths * 4 - cv * 30,
  )));

  return {
    nextMonth: { low: lowForecast, mid: midForecast, high: highForecast },
    twoMonthsOut,
    threeMonthsOut,
    trendMoM: Math.round(trendMoM * 1000) / 10, // as %
    seasonalFactor: Math.round(seasonalFactor * 100) / 100,
    pipelineBoost: Math.round(pipelineBoost),
    reliabilityAdjusted,
    forecastConfidence,
    dataMonths,
  };
}
