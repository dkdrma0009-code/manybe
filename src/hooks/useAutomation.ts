import { useState, useEffect, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { supabase } from '../api/supabase';
import { SmartRecommendation } from '../types/automation';
import {
  runAutomation,
  loadRecommendations,
  dismissRecommendation,
  AutomationDeal,
  AutomationInquiry,
} from '../services/AutomationEngine';
import { runAutonomousEngine } from '../services/AutonomousEngine';
import { processQueue } from '../services/MutationQueue';

export function useAutomation(userId: string | undefined) {
  const [recommendations, setRecommendations] = useState<SmartRecommendation[]>([]);

  const run = useCallback(async () => {
    if (!userId) return;

    // Process any offline-queued mutations first
    processQueue().catch(() => {});

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

    const deals     = (dealsRes.data ?? []) as AutomationDeal[];
    const inquiries = (inquiriesRes.data ?? []) as AutomationInquiry[];

    // Run recommendation engine and autonomous workflow chains in parallel.
    // Autonomous engine is fire-and-forget — failures don't affect recommendations.
    const [recs] = await Promise.all([
      runAutomation(userId, deals, inquiries),
      runAutonomousEngine(userId, deals, inquiries).catch(() => {}),
    ]);
    setRecommendations(recs.slice(0, 5));
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    // Show cached recs immediately, then run full check
    loadRecommendations().then((recs) => setRecommendations(recs.slice(0, 5)));
    run();

    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next === 'active') run();
    });
    return () => sub.remove();
  }, [userId, run]);

  const dismiss = useCallback(async (id: string) => {
    await dismissRecommendation(id);
    setRecommendations((prev) => prev.filter((r) => r.id !== id));
  }, []);

  return { recommendations, refetch: run, dismissRecommendation: dismiss };
}
