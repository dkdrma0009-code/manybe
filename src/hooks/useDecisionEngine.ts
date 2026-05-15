import { useState, useEffect, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { supabase } from '../api/supabase';
import {
  computeFocusItems,
  FocusItem,
  DealForDecision,
  InquiryForDecision,
} from '../services/DecisionEngine';
import {
  computeAutoSuggestions,
  computeFollowUpSuggestions,
  analyzeWorkload,
  AutoSuggestion,
  FollowUpSuggestion,
  WorkloadBalance,
  DealForAutomation,
} from '../services/WorkflowAutomation';

export function useDecisionEngine(userId: string | undefined) {
  const [focusItems,      setFocusItems]      = useState<FocusItem[]>([]);
  const [autoSuggestions, setAutoSuggestions] = useState<AutoSuggestion[]>([]);
  const [followUps,       setFollowUps]       = useState<FollowUpSuggestion[]>([]);
  const [workload,        setWorkload]        = useState<WorkloadBalance | null>(null);

  const compute = useCallback(async () => {
    if (!userId) return;

    const [dealsRes, inquiriesRes] = await Promise.all([
      supabase
        .from('deals')
        .select('id, brand, title, status, end_date, amount, created_at, updated_at')
        .eq('user_id', userId),
      supabase
        .from('media_kit_inquiries')
        .select('id, brand_name, created_at, is_read, media_kits!inner(user_id)')
        .eq('media_kits.user_id', userId)
        .eq('is_read', false),
    ]);

    const deals     = (dealsRes.data ?? []) as DealForDecision[];
    const inquiries = (inquiriesRes.data ?? []) as InquiryForDecision[];

    setFocusItems(computeFocusItems(deals, inquiries));
    setAutoSuggestions(computeAutoSuggestions(deals as DealForAutomation[]));
    setFollowUps(computeFollowUpSuggestions(deals as DealForAutomation[]));
    setWorkload(analyzeWorkload(deals as DealForAutomation[]));
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    compute();
    const sub = AppState.addEventListener('change', (s: AppStateStatus) => {
      if (s === 'active') compute();
    });
    return () => sub.remove();
  }, [userId, compute]);

  return { focusItems, autoSuggestions, followUps, workload, refetch: compute };
}
