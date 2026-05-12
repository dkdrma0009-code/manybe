import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../api/supabase';
import { Deal } from '../types';

export type DisplayStatus = '검토중' | '협상중' | '계약완료' | '취소됨';

export interface DealItem {
  id: string;
  brand: string;
  title: string;
  amount: number;
  deadline: string;
  endDate: string;
  status: DisplayStatus;
  avatarColor: string;
}

export interface DealsData {
  deals: DealItem[];
  totalAmount: number;
  inProgressCount: number;
  pendingSettlementCount: number;
}

const STATUS_MAP: Record<Deal['status'], DisplayStatus> = {
  pending:     '검토중',
  in_progress: '협상중',
  completed:   '계약완료',
  cancelled:   '취소됨',
};

const AVATAR_COLORS = ['#1A1A2E', '#6C63FF', '#059669', '#2563EB', '#EA580C', '#DC2626'];

function avatarColor(brand: string) {
  let hash = 0;
  for (let i = 0; i < brand.length; i++) hash = brand.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function formatDeadline(dateStr: string | undefined): string {
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

const DEV_DATA: DealsData = {
  deals: [
    { id: '1', brand: '나이키',    title: '러닝화 협찬 콘텐츠', amount: 3000000, deadline: '5월 15일', endDate: '', status: '협상중',   avatarColor: '#1A1A2E' },
    { id: '2', brand: '올리브영',  title: '스킨케어 리뷰',       amount: 1500000, deadline: '5월 22일', endDate: '', status: '계약완료', avatarColor: '#6C63FF' },
    { id: '3', brand: '삼성전자',  title: '갤럭시 언박싱',       amount: 5000000, deadline: '6월 1일',  endDate: '', status: '검토중',   avatarColor: '#2563EB' },
    { id: '4', brand: '다이슨',    title: '에어랩 리뷰',         amount: 2000000, deadline: '6월 10일', endDate: '', status: '협상중',   avatarColor: '#6C63FF' },
  ],
  totalAmount: 11500000,
  inProgressCount: 3,
  pendingSettlementCount: 1,
};

export function useDealsData(userId: string | undefined) {
  const [data, setData] = useState<DealsData>(__DEV__ ? DEV_DATA : DEFAULT_DATA);
  const [loading, setLoading] = useState(!!userId);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!userId) {
      setData(DEV_DATA);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data: rows, error: err } = await supabase
        .from('deals')
        .select('id, brand, title, amount, status, end_date')
        .eq('user_id', userId)
        .neq('status', 'cancelled')
        .order('created_at', { ascending: false });

      if (err) throw err;

      const deals: DealItem[] = (rows ?? []).map((r) => ({
        id: r.id,
        brand: r.brand,
        title: r.title,
        amount: r.amount,
        deadline: formatDeadline(r.end_date),
        endDate: r.end_date ?? '',
        status: STATUS_MAP[r.status as Deal['status']] ?? '검토중',
        avatarColor: avatarColor(r.brand),
      }));

      const totalAmount = deals.reduce((s, d) => s + d.amount, 0);
      const inProgressCount = deals.filter((d) =>
        ['협상중', '계약완료'].includes(d.status)
      ).length;
      const pendingSettlementCount = deals.filter((d) => d.status === '검토중').length;

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
