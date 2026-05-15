import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../api/supabase';
import { generateWeeklyReview } from '../services/BriefingEngine';
import type { WeeklyReview } from '../types/autonomous';
import type { AutomationDeal } from '../services/AutomationEngine';

export function useWeeklyReview(userId: string | undefined) {
  const [review, setReview] = useState<WeeklyReview | null>(null);
  const [loading, setLoading] = useState(false);

  const compute = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 86_400_000);
      const twoWeeksAgo = new Date(now.getTime() - 14 * 86_400_000);
      const weekStart = weekAgo.toISOString().split('T')[0];
      const twoWeekStart = twoWeeksAgo.toISOString().split('T')[0];

      const [dealsRes, weekRevRes, prevRevRes] = await Promise.all([
        supabase
          .from('deals')
          .select('id, brand, title, status, end_date, amount, created_at, updated_at')
          .eq('user_id', userId),
        supabase
          .from('revenues')
          .select('amount, date')
          .eq('user_id', userId)
          .gte('date', weekStart),
        supabase
          .from('revenues')
          .select('amount, date')
          .eq('user_id', userId)
          .gte('date', twoWeekStart)
          .lt('date', weekStart),
      ]);

      setReview(
        generateWeeklyReview(
          (dealsRes.data ?? []) as AutomationDeal[],
          weekRevRes.data ?? [],
          prevRevRes.data ?? [],
        ),
      );
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { compute(); }, [compute]);

  return { review, loading, refetch: compute };
}
