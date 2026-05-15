import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../api/supabase';
import { computeIntelligence, CreatorIntelligence } from '../services/IntelligenceLayer';
import { AutomationDeal, AutomationInquiry } from '../services/AutomationEngine';
import { intelligenceCache, CACHE_KEYS, CACHE_TTL } from '../services/IntelligenceCache';

export function useIntelligence(userId: string | undefined) {
  const [intelligence, setIntelligence] = useState<CreatorIntelligence | null>(() =>
    intelligenceCache.get<CreatorIntelligence>(CACHE_KEYS.INTELLIGENCE),
  );
  const [loading, setLoading] = useState(false);

  const compute = useCallback(async () => {
    if (!userId) return;

    const cached = intelligenceCache.get<CreatorIntelligence>(CACHE_KEYS.INTELLIGENCE);
    if (cached) { setIntelligence(cached); return; }

    setLoading(true);
    try {
      const sixtyDaysAgo = new Date(Date.now() - 60 * 86_400_000).toISOString().split('T')[0];

      const [dealsRes, revsRes, inqRes] = await Promise.all([
        supabase
          .from('deals')
          .select('id, brand, title, status, end_date, amount, created_at, updated_at')
          .eq('user_id', userId),
        supabase
          .from('revenues')
          .select('amount, date')
          .eq('user_id', userId)
          .gte('date', sixtyDaysAgo),
        supabase
          .from('media_kit_inquiries')
          .select('id, brand_name, created_at, is_read, media_kits!inner(user_id)')
          .eq('media_kits.user_id', userId)
          .eq('is_read', false),
      ]);

      const intel = computeIntelligence(
        (dealsRes.data ?? []) as AutomationDeal[],
        (revsRes.data ?? []) as Array<{ amount: number; date: string }>,
        (inqRes.data  ?? []) as AutomationInquiry[],
      );

      intelligenceCache.set(CACHE_KEYS.INTELLIGENCE, intel, CACHE_TTL.INTELLIGENCE);
      setIntelligence(intel);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { compute(); }, [compute]);

  return { intelligence, loading, refetch: compute };
}
