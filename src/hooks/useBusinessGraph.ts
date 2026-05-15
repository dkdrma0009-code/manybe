import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../api/supabase';
import { buildBusinessGraph, BusinessGraph, DealForGraph } from '../services/BusinessGraph';

export function useBusinessGraph(userId: string | undefined) {
  const [graph,   setGraph]   = useState<BusinessGraph | null>(null);
  const [loading, setLoading] = useState(false);

  const build = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const { data } = await supabase
      .from('deals')
      .select('id, brand, status, amount, created_at')
      .eq('user_id', userId);
    if (data) setGraph(buildBusinessGraph(data as DealForGraph[]));
    setLoading(false);
  }, [userId]);

  useEffect(() => { build(); }, [build]);

  return { graph, loading, refetch: build };
}
