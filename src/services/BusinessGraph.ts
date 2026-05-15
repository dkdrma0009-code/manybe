// Pure computation — stateless, no async.

export interface DealForGraph {
  id: string;
  brand: string;
  status: string;
  amount: number;
  created_at: string;
}

export interface BrandNode {
  brand: string;
  totalDeals: number;
  settledDeals: number;
  totalRevenue: number;
  avgDealValue: number;
  reliabilityScore: number; // 0–1
  lastInteraction: string;  // YYYY-MM-DD
  status: 'active' | 'dormant' | 'target';
  partnershipScore: number; // 0–100
}

export interface BusinessGraph {
  nodes: BrandNode[];
  revenueConcentration: number; // HHI 0–1
  topBrand: string | null;
  diversificationScore: number; // 0–100
  dependencyRisk: 'high' | 'medium' | 'low';
  totalBrands: number;
  totalRevenue: number;
}

export function buildBusinessGraph(deals: DealForGraph[]): BusinessGraph {
  const now = Date.now();
  const brandMap = new Map<string, { deals: DealForGraph[]; revenue: number }>();

  for (const deal of deals) {
    if (!brandMap.has(deal.brand)) brandMap.set(deal.brand, { deals: [], revenue: 0 });
    const entry = brandMap.get(deal.brand)!;
    entry.deals.push(deal);
    if (deal.status === 'settled') entry.revenue += deal.amount;
  }

  const totalRevenue = [...brandMap.values()].reduce((s, b) => s + b.revenue, 0);

  const nodes: BrandNode[] = [];
  for (const [brand, { deals: brandDeals, revenue }] of brandMap) {
    const settled = brandDeals.filter((d) => d.status === 'settled').length;
    const total   = brandDeals.length;
    const latest  = brandDeals.reduce((a, b) =>
      new Date(a.created_at) > new Date(b.created_at) ? a : b
    );
    const hasActive     = brandDeals.some((d) => d.status !== 'settled');
    const daysSinceLast = Math.floor((now - new Date(latest.created_at).getTime()) / 86_400_000);

    const reliabilityScore = total > 1 ? settled / total : 0.5;
    const partnershipScore = Math.min(100, Math.round(
      reliabilityScore * 40 +
      Math.min(settled * 15, 40) +
      (daysSinceLast < 90 ? 20 : daysSinceLast < 180 ? 10 : 0)
    ));

    nodes.push({
      brand,
      totalDeals: total,
      settledDeals: settled,
      totalRevenue: revenue,
      avgDealValue: settled > 0 ? Math.round(revenue / settled) : 0,
      reliabilityScore,
      lastInteraction: latest.created_at.split('T')[0],
      status: hasActive ? 'active' : daysSinceLast < 180 ? 'dormant' : 'target',
      partnershipScore,
    });
  }

  // Herfindahl-Hirschman Index for revenue concentration
  const hhi = totalRevenue > 0
    ? nodes.reduce((s, n) => s + Math.pow(n.totalRevenue / totalRevenue, 2), 0)
    : 0;

  const sorted    = [...nodes].sort((a, b) => b.totalRevenue - a.totalRevenue);
  const topBrand  = sorted[0]?.brand ?? null;
  const divScore  = Math.round((1 - Math.min(hhi, 1)) * 100);
  const depRisk: BusinessGraph['dependencyRisk'] =
    hhi > 0.5 ? 'high' : hhi > 0.25 ? 'medium' : 'low';

  return {
    nodes: nodes.sort((a, b) => b.partnershipScore - a.partnershipScore),
    revenueConcentration: Math.round(hhi * 100) / 100,
    topBrand,
    diversificationScore: divScore,
    dependencyRisk: depRisk,
    totalBrands: nodes.length,
    totalRevenue,
  };
}
