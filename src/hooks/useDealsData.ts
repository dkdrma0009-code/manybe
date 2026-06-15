import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../api/supabase';
import { Deal } from '../types';

export type DisplayStatus = '문의' | '검토중' | '진행중' | '업로드됨' | '정산완료';

export interface DealItem {
  id: string;
  brand: string;
  title: string;
  amount: number;
  deadline: string;
  endDate: string;
  status: DisplayStatus;
  dbStatus: Deal['status'];
  avatarColor: string;
  createdAt: string;
}

export interface DealsData {
  deals: DealItem[];
  totalAmount: number;
  inProgressCount: number;
  pendingSettlementCount: number;
}

const STATUS_MAP: Record<Deal['status'], DisplayStatus> = {
  inquiry:     '문의',
  reviewing:   '검토중',
  in_progress: '진행중',
  uploaded:    '업로드됨',
  settled:     '정산완료',
};

const AVATAR_COLORS = ['#1A1A2E', '#6E56F0', '#2E8C5D', '#3B6FD9', '#EA580C', '#C13C3C'];

function avatarColor(brand: string) {
  let hash = 0;
  for (let i = 0; i < brand.length; i++) hash = brand.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function formatDeadline(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

const DEFAULT_DATA: DealsData = {
  deals: [],
  totalAmount: 0,
  inProgressCount: 0,
  pendingSettlementCount: 0,
};

// PLAN_GATE: brand history — past brand collaborations, repeat partner detection, collaboration timeline
export function useDealsData(userId: string | undefined) {
  const [data, setData] = useState<DealsData>(DEFAULT_DATA);
  const [loading, setLoading] = useState(!!userId);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data: rows, error: err } = await supabase
        .from('deals')
        .select('id, brand, title, amount, status, end_date, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (err) throw err;

      const deals: DealItem[] = (rows ?? []).map((r) => ({
        id: r.id,
        brand: r.brand ?? '',
        title: r.title,
        amount: r.amount ?? 0,
        deadline: formatDeadline(r.end_date),
        endDate: r.end_date ?? '',
        status: STATUS_MAP[r.status as Deal['status']] ?? '검토중',
        dbStatus: r.status as Deal['status'],
        avatarColor: avatarColor(r.brand ?? ''),
        createdAt: r.created_at ?? '',
      }));

      const totalAmount = deals.reduce((s, d) => s + d.amount, 0);
      const inProgressCount = deals.filter((d) =>
        ['진행중', '업로드됨'].includes(d.status)
      ).length;
      const pendingSettlementCount = deals.filter((d) => d.status === '업로드됨').length;

      setData({ deals, totalAmount, inProgressCount, pendingSettlementCount });
    } catch (e: any) {
      setError(e.message ?? '데이터를 불러오지 못했습니다');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}
