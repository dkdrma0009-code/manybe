import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../api/supabase';

export interface DonutSegment {
  label: string;
  pct: number;
  amount: number;
  color: string;
}

export interface BarItem {
  month: string;
  value: number;
}

export interface Transaction {
  id: string;
  date: string;
  desc: string;
  amount: number;
  icon: string;
}

export interface RevenueData {
  total: number;
  tax: number;
  net: number;
  goal: number;
  segments: DonutSegment[];
  barData: BarItem[];
  transactions: Transaction[];
}

const TAX_RATE = 0.033;
const DEFAULT_GOAL = 5_000_000;

const CATEGORY_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
  platform:    { label: '플랫폼 광고', color: '#EF4444', icon: '📱' },
  sponsorship: { label: '브랜드 협찬', color: '#6E56F0', icon: '🤝' },
  affiliate:   { label: '제휴 수익',   color: '#F97316', icon: '🔗' },
  other:       { label: '기타',        color: '#9CA3AF', icon: '💡' },
};

const DEFAULT_DATA: RevenueData = {
  total: 0,
  tax: 0,
  net: 0,
  goal: DEFAULT_GOAL,
  segments: [],
  barData: [],
  transactions: [],
};


const GOAL_STORAGE_KEY = 'revenue_goal';

export function useRevenueData(
  userId: string | undefined,
  year: number,
  month: number,
) {
  const [data, setData] = useState<RevenueData>(DEFAULT_DATA);
  const [loading, setLoading] = useState(!!userId);
  const [error, setError] = useState<string | null>(null);
  const [goal, setGoalState] = useState<number>(DEFAULT_GOAL);

  useEffect(() => {
    AsyncStorage.getItem(GOAL_STORAGE_KEY).then((val) => {
      if (val) setGoalState(parseInt(val, 10));
    });
  }, []);

  const saveGoal = useCallback(async (amount: number) => {
    setGoalState(amount);
    await AsyncStorage.setItem(GOAL_STORAGE_KEY, String(amount));
    setData((prev) => ({ ...prev, goal: amount }));
  }, []);

  const fetchData = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // 주의: toISOString()은 UTC 변환이라 KST에서 월 경계가 하루 밀린다 — 로컬 기준으로 직접 조립
      const pad = (n: number) => String(n).padStart(2, '0');
      const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      const monthStart = ymd(new Date(year, month, 1));
      const monthEnd = ymd(new Date(year, month + 1, 0));

      // Build date range for last 6 months bar chart
      const barStart = ymd(new Date(year, month - 5, 1));

      const [monthRes, barRes, txRes] = await Promise.all([
        supabase
          .from('revenues')
          .select('amount, category')
          .eq('user_id', userId)
          .gte('date', monthStart)
          .lte('date', monthEnd),
        supabase
          .from('revenues')
          .select('amount, date')
          .eq('user_id', userId)
          .gte('date', barStart)
          .lte('date', monthEnd),
        supabase
          .from('revenues')
          .select('id, amount, category, description, date')
          .eq('user_id', userId)
          .gte('date', monthStart)
          .lte('date', monthEnd)
          .order('date', { ascending: false })
          .limit(10),
      ]);

      if (monthRes.error) throw monthRes.error;
      if (barRes.error) throw barRes.error;
      if (txRes.error) throw txRes.error;

      // Monthly totals
      const revenues = monthRes.data ?? [];
      const total = revenues.reduce((s, r) => s + r.amount, 0);
      const tax = Math.round(total * TAX_RATE);

      // Category breakdown for donut
      const catTotals: Record<string, number> = {};
      for (const r of revenues) {
        const key = r.category in CATEGORY_CONFIG ? r.category : 'other';
        catTotals[key] = (catTotals[key] ?? 0) + r.amount;
      }
      const segments: DonutSegment[] = Object.entries(CATEGORY_CONFIG)
        .map(([key, cfg]) => ({
          label: cfg.label,
          color: cfg.color,
          amount: catTotals[key] ?? 0,
          pct: total > 0 ? Math.round(((catTotals[key] ?? 0) / total) * 100) : 0,
        }))
        .filter((s) => s.amount > 0);

      // Last 6 months bar chart
      const monthTotals: Record<string, number> = {};
      for (const r of barRes.data ?? []) {
        const key = r.date.slice(0, 7); // "YYYY-MM"
        monthTotals[key] = (monthTotals[key] ?? 0) + r.amount;
      }
      const MONTH_NAMES = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];
      const barData: BarItem[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(year, month - i, 1);
        const key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
        barData.push({ month: MONTH_NAMES[d.getMonth()], value: monthTotals[key] ?? 0 });
      }

      // Recent transactions
      const transactions: Transaction[] = (txRes.data ?? []).map((r) => {
        const cfg = CATEGORY_CONFIG[r.category] ?? CATEGORY_CONFIG.other;
        const d = new Date(r.date);
        const dateStr = `${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
        return {
          id: r.id,
          date: dateStr,
          desc: r.description || cfg.label,
          amount: r.amount,
          icon: cfg.icon,
        };
      });

      setData({ total, tax, net: total - tax, goal, segments, barData, transactions });
    } catch (e: any) {
      setError(e.message ?? '데이터를 불러오지 못했습니다');
    } finally {
      setLoading(false);
    }
  }, [userId, year, month]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { data, loading, error, refetch: fetchData, saveGoal };
}
