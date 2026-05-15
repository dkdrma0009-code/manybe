import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../api/supabase';
import { getEffectivenessScores, RecommendationEffectiveness } from '../services/OperationalMemory';

export interface OperationalMetrics {
  totalDeals: number;
  completionRate: number;   // 0–1
  avgDealValue: number;
  productivityScore: number; // 0–100
  automationEffectiveness: RecommendationEffectiveness[];
  topBrand: string | null;
  activeMonths: number;
}

export function useAnalytics(userId: string | undefined) {
  const [metrics, setMetrics] = useState<OperationalMetrics | null>(null);
  const [loading, setLoading] = useState(false);

  const compute = useCallback(async () => {
    if (!userId) return;
    setLoading(true);

    const [dealsRes, effectiveness] = await Promise.all([
      supabase
        .from('deals')
        .select('id, brand, status, amount, created_at')
        .eq('user_id', userId),
      getEffectivenessScores(),
    ]);

    const deals        = dealsRes.data ?? [];
    const settled      = deals.filter((d) => d.status === 'settled');
    const totalDeals   = deals.length;
    const completionRate = totalDeals > 0 ? settled.length / totalDeals : 0;

    const avgDealValue = totalDeals > 0
      ? Math.round(deals.reduce((s, d) => s + (d.amount ?? 0), 0) / totalDeals)
      : 0;

    const brandCounts = new Map<string, number>();
    for (const d of deals) brandCounts.set(d.brand, (brandCounts.get(d.brand) ?? 0) + 1);
    const topBrand = brandCounts.size > 0
      ? [...brandCounts.entries()].sort((a, b) => b[1] - a[1])[0][0]
      : null;

    const activeMonths = new Set(deals.map((d) => d.created_at?.slice(0, 7))).size;
    const dealVelocity = Math.min(totalDeals / Math.max(activeMonths, 1) / 3, 1);
    const valueFactor  = Math.min(avgDealValue / 500_000, 1);
    const productivityScore = Math.min(100, Math.round(
      completionRate * 50 + dealVelocity * 30 + valueFactor * 20,
    ));

    setMetrics({ totalDeals, completionRate, avgDealValue, productivityScore, automationEffectiveness: effectiveness, topBrand, activeMonths });
    setLoading(false);
  }, [userId]);

  useEffect(() => { compute(); }, [compute]);

  return { metrics, loading, refetch: compute };
}
