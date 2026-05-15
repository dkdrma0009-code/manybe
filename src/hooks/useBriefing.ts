import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../api/supabase';
import { generateMorningBriefing } from '../services/BriefingEngine';
import { MorningBriefing } from '../types/autonomous';
import { AutomationDeal, AutomationInquiry } from '../services/AutomationEngine';
import { intelligenceCache, CACHE_KEYS, CACHE_TTL } from '../services/IntelligenceCache';

export function useBriefing(userId: string | undefined) {
  const [briefing, setBriefing] = useState<MorningBriefing | null>(() =>
    intelligenceCache.get<MorningBriefing>(CACHE_KEYS.BRIEFING),
  );
  const [loading, setLoading] = useState(false);

  const compute = useCallback(async () => {
    if (!userId) return;

    const cached = intelligenceCache.get<MorningBriefing>(CACHE_KEYS.BRIEFING);
    if (cached) { setBriefing(cached); return; }

    setLoading(true);
    try {
      const now            = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];

      const [dealsRes, thisRevRes, prevRevRes, inqRes] = await Promise.all([
        supabase
          .from('deals')
          .select('id, brand, title, status, end_date, amount, created_at, updated_at')
          .eq('user_id', userId),
        supabase
          .from('revenues')
          .select('amount')
          .eq('user_id', userId)
          .gte('date', thisMonthStart),
        supabase
          .from('revenues')
          .select('amount')
          .eq('user_id', userId)
          .gte('date', prevMonthStart)
          .lt('date', thisMonthStart),
        supabase
          .from('media_kit_inquiries')
          .select('id, brand_name, created_at, is_read, media_kits!inner(user_id)')
          .eq('media_kits.user_id', userId)
          .eq('is_read', false),
      ]);

      const thisMonthRevenue = (thisRevRes.data ?? []).reduce((s: number, r: { amount: number }) => s + r.amount, 0);
      const prevMonthRevenue = (prevRevRes.data ?? []).reduce((s: number, r: { amount: number }) => s + r.amount, 0);

      const briefingData = generateMorningBriefing(
        (dealsRes.data ?? []) as AutomationDeal[],
        (inqRes.data ?? []) as AutomationInquiry[],
        thisMonthRevenue,
        prevMonthRevenue,
      );

      intelligenceCache.set(CACHE_KEYS.BRIEFING, briefingData, CACHE_TTL.BRIEFING);
      setBriefing(briefingData);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { compute(); }, [compute]);

  return { briefing, loading, refetch: compute };
}
