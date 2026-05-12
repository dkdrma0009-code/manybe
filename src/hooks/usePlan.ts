import { useState, useEffect } from 'react';
import { supabase } from '../api/supabase';

export type Plan = 'free' | 'basic' | 'pro';

export function usePlan(userId: string | undefined) {
  const [plan, setPlan] = useState<Plan>('free');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    supabase
      .from('users')
      .select('plan')
      .eq('id', userId)
      .limit(1)
      .then(({ data }) => {
        setPlan((data?.[0]?.plan as Plan) ?? 'free');
        setLoading(false);
      });
  }, [userId]);

  const isPro = plan === 'pro' || plan === 'basic';
  return { plan, isPro, loading };
}