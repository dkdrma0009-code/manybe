import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../api/supabase';

export interface BrandDeal {
  id: string;
  title: string;
  amount: number;
  status: string;
  endDate: string | null;
  createdAt: string;
}

export interface BrandStats {
  brand: string;
  deals: BrandDeal[];
  totalCount: number;
  settledCount: number;
  totalEarned: number;
  avgAmount: number;
  completionRate: number;
  lastDealDate: string | null;
  relationshipLevel: 'new' | 'returning' | 'frequent';
  relationshipLabel: string;
  hasStaleUploaded: boolean;
}

export function useBrandHistory(userId: string | undefined, brand: string) {
  const [stats, setStats] = useState<BrandStats | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    if (!userId || !brand.trim()) return;
    setLoading(true);

    const { data } = await supabase
      .from('deals')
      .select('id, title, amount, status, end_date, created_at')
      .eq('user_id', userId)
      .eq('brand', brand)
      .order('created_at', { ascending: false });

    setLoading(false);
    if (!data) return;

    const deals: BrandDeal[] = data.map((d) => ({
      id: d.id,
      title: d.title,
      amount: d.amount,
      status: d.status,
      endDate: d.end_date ?? null,
      createdAt: d.created_at,
    }));

    const totalCount = deals.length;
    const settled = deals.filter((d) => d.status === 'settled');
    const settledCount = settled.length;
    const totalEarned = settled.reduce((s, d) => s + d.amount, 0);
    const allAmounts = deals.filter((d) => d.amount > 0);
    const avgAmount = allAmounts.length > 0
      ? Math.round(allAmounts.reduce((s, d) => s + d.amount, 0) / allAmounts.length)
      : 0;
    const completionRate = totalCount > 0 ? Math.round((settledCount / totalCount) * 100) : 0;
    const lastDealDate = deals.length > 0 ? deals[0].createdAt : null;

    // Stale uploaded: any deal that's been in 'uploaded' status for 45+ days
    const now = Date.now();
    const hasStaleUploaded = deals.some(
      (d) => d.status === 'uploaded' && (now - new Date(d.createdAt).getTime()) > 45 * 86400000
    );

    const relationshipLevel: 'new' | 'returning' | 'frequent' =
      totalCount >= 4 ? 'frequent' : totalCount >= 2 ? 'returning' : 'new';

    const relationshipLabel =
      relationshipLevel === 'frequent' ? '자주 협업하는 브랜드' :
      relationshipLevel === 'returning' ? '재협업 브랜드' : '신규 브랜드';

    setStats({
      brand,
      deals,
      totalCount,
      settledCount,
      totalEarned,
      avgAmount,
      completionRate,
      lastDealDate,
      relationshipLevel,
      relationshipLabel,
      hasStaleUploaded,
    });
  }, [userId, brand]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { stats, loading, refetch: fetchData };
}
