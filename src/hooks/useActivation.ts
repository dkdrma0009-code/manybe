import { useState, useEffect, useCallback, useRef } from 'react';
import {
  loadActivationState, markMilestone as svcMark,
  trackFunnelEvent, computeCompletion,
} from '../services/ActivationService';
import { celebrateMilestone } from '../services/SmartReminderEngine';
import type { ActivationMilestone, ActivationState } from '../types/activation';
import { EMPTY_ACTIVATION_STATE } from '../types/activation';

interface UseActivationResult {
  state:        ActivationState;
  pct:          number;
  completedCount: number;
  totalCount:   number;
  nextMilestone: ActivationMilestone | null;
  isAllDone:    boolean;
  mark:         (milestone: ActivationMilestone) => Promise<void>;
  track:        (type: string, metadata?: Record<string, string | number | boolean>) => Promise<void>;
}

export function useActivation(): UseActivationResult {
  const [state, setState] = useState<ActivationState>(EMPTY_ACTIVATION_STATE);
  // Prevent double-marking (mark is async — track in-flight calls)
  const markingRef = useRef<Set<ActivationMilestone>>(new Set());

  useEffect(() => {
    loadActivationState().then(setState);
  }, []);

  const mark = useCallback(async (milestone: ActivationMilestone) => {
    if (state.completed[milestone]) return;
    if (markingRef.current.has(milestone)) return;
    markingRef.current.add(milestone);
    const next = await svcMark(milestone);
    setState(next);
    markingRef.current.delete(milestone);
    // Fire celebration notification only for newly completed milestones
    celebrateMilestone(milestone);
  }, [state.completed]);

  const track = useCallback(async (
    type: string,
    metadata?: Record<string, string | number | boolean>,
  ) => {
    await trackFunnelEvent(type, metadata);
  }, []);

  const { completed, total, pct, nextMilestone } = computeCompletion(state);

  return {
    state,
    pct,
    completedCount: completed,
    totalCount:     total,
    nextMilestone,
    isAllDone:      completed === total,
    mark,
    track,
  };
}
