import { useState, useEffect } from 'react';
import { supabase } from '../api/supabase';

export type Plan = 'free' | 'premium';

function normalizePlan(plan: unknown): Plan {
  return plan === 'premium' || plan === 'pro' || plan === 'basic' ? 'premium' : 'free';
}

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
        setPlan(normalizePlan(data?.[0]?.plan));
        setLoading(false);
      });
  }, [userId]);

  const isPremium = plan === 'premium';
  return { plan, isPremium, isPro: isPremium, loading };
}
