// Pure computation — no async, no side effects.
// Cash flow timeline: expected payout schedule, predictability score.

export interface PendingDealCF {
  id: string;
  brand: string;
  amount: number;
  status: string;
  upload_date: string | null;   // ISO date string
  end_date: string | null;
}

export interface ExpectedPayout {
  yearMonth: string;       // "YYYY-MM"
  expectedAmount: number;
  dealIds: string[];
  isConfident: boolean;    // true if high-probability status
}

export interface CashFlowReport {
  thisMonthExpected: number;
  nextMonthExpected: number;
  twoMonthsExpected: number;
  payoutSchedule: ExpectedPayout[];  // 3-month window
  predictabilityScore: number;       // 0-100
  pendingTotal: number;              // all unsettled deal amounts
  highConfidenceTotal: number;       // uploaded + in_progress amounts
}

// Status-based collection probability
const COLLECTION_PROBABILITY: Record<string, number> = {
  uploaded:    1.0,
  in_progress: 0.75,
  reviewing:   0.50,
  inquiry:     0.25,
};

const HIGH_CONFIDENCE_STATUSES = new Set(['uploaded', 'in_progress']);
const AVG_SETTLEMENT_DELAY_DAYS = 21; // expected days from upload to receipt

function addDays(isoDate: string, days: number): string {
  const d = new Date(isoDate);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function toYearMonth(isoDate: string): string {
  return isoDate.slice(0, 7);
}

export function computeCashFlow(
  pendingDeals: PendingDealCF[],
  todayISO: string,
): CashFlowReport {
  const now = new Date(todayISO);
  const months = [0, 1, 2].map((offset) => {
    const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const buckets = new Map<string, { amount: number; dealIds: string[]; confident: boolean[] }>();
  for (const m of months) {
    buckets.set(m, { amount: 0, dealIds: [], confident: [] });
  }

  let pendingTotal = 0;
  let highConfidenceTotal = 0;

  for (const deal of pendingDeals) {
    if (deal.status === 'settled') continue;

    const prob = COLLECTION_PROBABILITY[deal.status] ?? 0.3;
    const weightedAmount = Math.round(deal.amount * prob);

    pendingTotal += deal.amount;
    if (HIGH_CONFIDENCE_STATUSES.has(deal.status)) {
      highConfidenceTotal += deal.amount;
    }

    // Estimate payout month: prefer end_date, fallback to upload + delay
    let expectedDate: string;
    if (deal.end_date) {
      expectedDate = deal.end_date;
    } else if (deal.upload_date) {
      expectedDate = addDays(deal.upload_date, AVG_SETTLEMENT_DELAY_DAYS);
    } else {
      expectedDate = addDays(todayISO, AVG_SETTLEMENT_DELAY_DAYS);
    }

    const targetMonth = toYearMonth(expectedDate);
    if (buckets.has(targetMonth)) {
      const b = buckets.get(targetMonth)!;
      b.amount += weightedAmount;
      b.dealIds.push(deal.id);
      b.confident.push(HIGH_CONFIDENCE_STATUSES.has(deal.status));
    }
  }

  const payoutSchedule: ExpectedPayout[] = months.map((m) => {
    const b = buckets.get(m)!;
    const confidentCount = b.confident.filter(Boolean).length;
    return {
      yearMonth: m,
      expectedAmount: b.amount,
      dealIds: b.dealIds,
      isConfident: b.dealIds.length > 0 && confidentCount / b.dealIds.length >= 0.5,
    };
  });

  const [thisMonth, nextMonth, twoMonths] = payoutSchedule;

  // Predictability: high if most pending are high-confidence
  const predictabilityScore = pendingTotal > 0
    ? Math.max(10, Math.min(95, Math.round((highConfidenceTotal / pendingTotal) * 100)))
    : 50;

  return {
    thisMonthExpected: thisMonth.expectedAmount,
    nextMonthExpected: nextMonth.expectedAmount,
    twoMonthsExpected: twoMonths.expectedAmount,
    payoutSchedule,
    predictabilityScore,
    pendingTotal,
    highConfidenceTotal,
  };
}
