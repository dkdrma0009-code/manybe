import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../api/supabase';
import { Revenue, Deal } from '../types';

export interface CategoryStat {
  label: string;
  amount: number;
  icon: string;
  cardBg: string;
  iconBg: string;
  textColor: string;
}

export interface HomeDeal {
  id: string;
  brand: string;
  amount: number;
  statusLabel: string;
  statusColor: string;
  statusBg: string;
  initial: string;
  initBg: string;
}

export interface HomeData {
  totalRevenue: number;
  prevMonthRevenue: number;
  categoryStats: CategoryStat[];
  activeDeals: HomeDeal[];
  dealCount: number;
  pendingSettlement: number;
  estimatedTax: number;
  barData: number[];
}

const CATEGORY_CONFIG: Record<string, Omit<CategoryStat, 'amount'>> = {
  platform:    { label: '플랫폼 광고', icon: '📱', cardBg: '#FFF1F0', iconBg: '#FECACA', textColor: '#DC2626' },
  sponsorship: { label: '브랜드 협찬', icon: '🤝', cardBg: '#F5F3FF', iconBg: '#DDD6FE', textColor: '#7C3AED' },
  affiliate:   { label: '제휴 수익',   icon: '🔗', cardBg: '#FFF7ED', iconBg: '#FED7AA', textColor: '#EA580C' },
  other:       { label: '기타',        icon: '💡', cardBg: '#F3F4F6', iconBg: '#E5E7EB', textColor: '#4B5563' },
};

const DEAL_STATUS_CONFIG: Record<Deal['status'], { label: string; color: string; bg: string }> = {
  pending:    { label: '검토중',   color: '#F59E0B', bg: '#FEF3C7' },
  in_progress:{ label: '협상중',   color: '#7C3AED', bg: '#F5F3FF' },
  completed:  { label: '계약완료', color: '#059669', bg: '#D1FAE5' },
  cancelled:  { label: '취소됨',   color: '#9CA3AF', bg: '#F3F4F6' },
};

const AVATAR_COLORS = ['#1A1A2E', '#6C63FF', '#059669', '#2563EB', '#EA580C', '#DC2626'];

function avatarColor(brand: string) {
  let hash = 0;
  for (let i = 0; i < brand.length; i++) hash = brand.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

const DEFAULT_DATA: HomeData = {
  totalRevenue: 0,
  prevMonthRevenue: 0,
  categoryStats: Object.values(CATEGORY_CONFIG).map((c) => ({ ...c, amount: 0 })),
  activeDeals: [],
  dealCount: 0,
  pendingSettlement: 0,
  estimatedTax: 0,
  barData: [0, 0, 0, 0, 0, 0, 0],
};

export function useHomeData(userId: string | undefined) {
  const [data, setData] = useState<HomeData>(DEFAULT_DATA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);

    try {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
      const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
      const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];

      // Last 7 days for bar chart
      const day7Start = new Date(now);
      day7Start.setDate(now.getDate() - 6);
      const day7StartStr = day7Start.toISOString().split('T')[0];

      const [revenueRes, prevRevenueRes, dealsRes, barRes] = await Promise.all([
        supabase
          .from('revenue')
          .select('amount, category')
          .eq('user_id', userId)
          .gte('date', monthStart)
          .lte('date', monthEnd),
        supabase
          .from('revenue')
          .select('amount')
          .eq('user_id', userId)
          .gte('date', prevMonthStart)
          .lte('date', prevMonthEnd),
        supabase
          .from('deals')
          .select('id, brand, amount, status')
          .eq('user_id', userId)
          .in('status', ['pending', 'in_progress']),
        supabase
          .from('revenue')
          .select('amount, date')
          .eq('user_id', userId)
          .gte('date', day7StartStr)
          .lte('date', now.toISOString().split('T')[0]),
      ]);

      if (revenueRes.error) throw revenueRes.error;
      if (prevRevenueRes.error) throw prevRevenueRes.error;
      if (dealsRes.error) throw dealsRes.error;
      if (barRes.error) throw barRes.error;

      // Total and category breakdown
      const revenues: Pick<Revenue, 'amount' | 'category'>[] = revenueRes.data ?? [];
      const totalRevenue = revenues.reduce((sum, r) => sum + r.amount, 0);

      const categoryTotals: Record<string, number> = {};
      for (const r of revenues) {
        const key = r.category in CATEGORY_CONFIG ? r.category : 'other';
        categoryTotals[key] = (categoryTotals[key] ?? 0) + r.amount;
      }
      const categoryStats: CategoryStat[] = Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => ({
        ...cfg,
        amount: categoryTotals[key] ?? 0,
      }));

      // Previous month total (for % change badge)
      const prevMonthRevenue = (prevRevenueRes.data ?? []).reduce((sum, r) => sum + r.amount, 0);

      // Active deals
      const deals: Pick<Deal, 'id' | 'brand' | 'amount' | 'status'>[] = dealsRes.data ?? [];
      const activeDeals: HomeDeal[] = deals.map((d) => {
        const cfg = DEAL_STATUS_CONFIG[d.status];
        return {
          id: d.id,
          brand: d.brand,
          amount: d.amount,
          statusLabel: cfg.label,
          statusColor: cfg.color,
          statusBg: cfg.bg,
          initial: d.brand.charAt(0),
          initBg: avatarColor(d.brand),
        };
      });

      const dealCount = deals.length;
      const pendingSettlement = deals
        .filter((d) => d.status === 'in_progress')
        .reduce((sum, d) => sum + d.amount, 0);
      const estimatedTax = Math.round(totalRevenue * 0.033);

      // Bar chart: sum revenue per day for last 7 days
      const dayTotals: Record<string, number> = {};
      for (const r of barRes.data ?? []) {
        const day = r.date.slice(0, 10);
        dayTotals[day] = (dayTotals[day] ?? 0) + r.amount;
      }
      const barData: number[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        const key = d.toISOString().split('T')[0];
        barData.push(dayTotals[key] ?? 0);
      }

      setData({
        totalRevenue,
        prevMonthRevenue,
        categoryStats,
        activeDeals,
        dealCount,
        pendingSettlement,
        estimatedTax,
        barData,
      });
    } catch (e: any) {
      setError(e.message ?? '데이터를 불러오지 못했습니다');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}
