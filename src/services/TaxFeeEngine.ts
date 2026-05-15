// Pure computation — no async, no side effects.
// Korean 3.3% withholding tax, platform fee estimates, net payout, tax reserve.

export type DealCategory = 'sponsored_post' | 'affiliate' | 'brand_deal' | 'consulting' | 'other';

export interface DealForTax {
  id: string;
  amount: number;
  category?: DealCategory;
  status: string;
}

export interface TaxLineItem {
  dealId: string;
  grossAmount: number;
  withholdingTax: number;   // 3.3%
  platformFee: number;
  netAmount: number;
}

export interface TaxSummary {
  totalGross: number;
  totalWithholding: number;
  totalPlatformFees: number;
  totalNet: number;
  effectiveTaxRate: number;  // 0-1 (withholding / gross)
  recommendedReserve: number; // buffer for year-end settlement
  lineItems: TaxLineItem[];
  annualTaxEstimate: number; // extrapolated from current data
}

const WITHHOLDING_RATE = 0.033; // Korean 3.3% source withholding

// Platform fee by category (rough estimates)
const PLATFORM_FEE_RATE: Record<DealCategory, number> = {
  sponsored_post: 0.0,   // typically direct — no platform fee
  affiliate:      0.05,  // 5% network fee
  brand_deal:     0.0,
  consulting:     0.0,
  other:          0.0,
};

export function computeTaxSummary(
  deals: DealForTax[],
  completedMonths: number, // months of data for annualization
): TaxSummary {
  const settled = deals.filter((d) => d.status === 'settled');

  const lineItems: TaxLineItem[] = settled.map((deal) => {
    const category: DealCategory = deal.category ?? 'brand_deal';
    const withholdingTax = Math.round(deal.amount * WITHHOLDING_RATE);
    const platformFeeRate = PLATFORM_FEE_RATE[category] ?? 0;
    const platformFee = Math.round(deal.amount * platformFeeRate);
    const netAmount = deal.amount - withholdingTax - platformFee;

    return {
      dealId: deal.id,
      grossAmount: deal.amount,
      withholdingTax,
      platformFee,
      netAmount,
    };
  });

  const totalGross = lineItems.reduce((s, l) => s + l.grossAmount, 0);
  const totalWithholding = lineItems.reduce((s, l) => s + l.withholdingTax, 0);
  const totalPlatformFees = lineItems.reduce((s, l) => s + l.platformFee, 0);
  const totalNet = lineItems.reduce((s, l) => s + l.netAmount, 0);

  const effectiveTaxRate = totalGross > 0
    ? Math.round((totalWithholding / totalGross) * 1000) / 1000
    : WITHHOLDING_RATE;

  // Annual estimate: extrapolate if < 12 months data
  const annualTaxEstimate = completedMonths > 0
    ? Math.round(totalWithholding * (12 / completedMonths))
    : 0;

  // Reserve: 5% buffer on top of withholding (for year-end reconciliation)
  const recommendedReserve = Math.round(totalGross * (WITHHOLDING_RATE + 0.05));

  return {
    totalGross,
    totalWithholding,
    totalPlatformFees,
    totalNet,
    effectiveTaxRate,
    recommendedReserve,
    lineItems,
    annualTaxEstimate,
  };
}

export function formatKRW(amount: number): string {
  if (amount >= 100_000_000) {
    return `${(amount / 100_000_000).toFixed(1)}억`;
  }
  if (amount >= 10_000) {
    return `${Math.round(amount / 10_000).toLocaleString()}만`;
  }
  return `${amount.toLocaleString()}원`;
}
