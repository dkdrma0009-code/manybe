// Pure computation — no async, no side effects.
// HHI concentration, recurring revenue ratio, brand diversification, volatility.

export interface BrandRevenue {
  brand: string;
  totalAmount: number;
  dealCount: number;
}

export interface MonthlyRevenueRS {
  yearMonth: string;
  amount: number;
}

export interface StabilityReport {
  hhiScore: number;           // 0-10000, lower = more diversified
  diversificationScore: number; // 0-100, inverse of HHI normalized
  recurringRatio: number;     // 0-1, brands appearing in 2+ months / total brands
  volatilityScore: number;    // coefficient of variation * 100
  stabilityGrade: 'A' | 'B' | 'C' | 'D';
  topBrandShare: number;      // 0-100, % revenue from single top brand
  brandCount: number;         // unique brands
  recurringBrandCount: number;
}

function coefficientOfVariation(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  if (mean === 0) return 0;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance) / mean;
}

export function computeStabilityReport(
  brandRevenues: BrandRevenue[],
  monthlyRevenues: MonthlyRevenueRS[],
  brandMonthlyMap: Map<string, Set<string>>, // brand → set of yearMonths active
): StabilityReport {
  const brandCount = brandRevenues.length;

  if (brandCount === 0) {
    return {
      hhiScore: 10000,
      diversificationScore: 0,
      recurringRatio: 0,
      volatilityScore: 0,
      stabilityGrade: 'C',
      topBrandShare: 100,
      brandCount: 0,
      recurringBrandCount: 0,
    };
  }

  const totalRevenue = brandRevenues.reduce((s, b) => s + b.totalAmount, 0);

  // HHI: sum of squared market shares (in %)
  const hhiScore = totalRevenue > 0
    ? Math.round(
        brandRevenues.reduce((s, b) => {
          const share = (b.totalAmount / totalRevenue) * 100;
          return s + share * share;
        }, 0),
      )
    : 10000;

  // Normalize HHI to 0-100 diversification score
  // HHI 10000 (monopoly) → 0, HHI ~0 → 100
  const diversificationScore = Math.max(0, Math.min(100, Math.round(100 - hhiScore / 100)));

  const topBrandShare = totalRevenue > 0
    ? Math.round((Math.max(...brandRevenues.map((b) => b.totalAmount)) / totalRevenue) * 100)
    : 100;

  // Recurring brands: appeared in ≥2 different months
  const recurringBrandCount = [...brandMonthlyMap.entries()].filter(
    ([, months]) => months.size >= 2,
  ).length;
  const recurringRatio = brandCount > 0 ? Math.round((recurringBrandCount / brandCount) * 100) / 100 : 0;

  // Volatility: CV of monthly revenue
  const amounts = monthlyRevenues.map((m) => m.amount);
  const cv = coefficientOfVariation(amounts);
  const volatilityScore = Math.min(100, Math.round(cv * 100));

  // Grade: composite of diversification + recurring + low volatility
  const composite =
    diversificationScore * 0.4 +
    recurringRatio * 100 * 0.4 +
    (100 - volatilityScore) * 0.2;

  const stabilityGrade: StabilityReport['stabilityGrade'] =
    composite >= 75 ? 'A' : composite >= 55 ? 'B' : composite >= 35 ? 'C' : 'D';

  return {
    hhiScore,
    diversificationScore,
    recurringRatio,
    volatilityScore,
    stabilityGrade,
    topBrandShare,
    brandCount,
    recurringBrandCount,
  };
}
