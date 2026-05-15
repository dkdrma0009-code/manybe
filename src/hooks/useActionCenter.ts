import { useState, useCallback } from 'react';
import {
  getPendingActions, approveAction, rejectAction, getActionHistory,
} from '../services/ActionQueue';
import { generateDraft, actionTypeToDraftType, DraftContext } from '../services/DraftGenerator';
import { trackAutomationEvent } from '../services/AutomationAnalytics';
import type { AutonomousAction } from '../types/autonomous';

const DRAFT_TYPES = new Set([
  'draft_followup_message',
  'draft_settlement_request',
  'draft_inquiry_response',
  'draft_reengagement_pitch',
]);

export function isDraftAction(action: AutonomousAction): boolean {
  return DRAFT_TYPES.has(action.type);
}

interface UseActionCenterResult {
  pending: AutonomousAction[];
  history: AutonomousAction[];
  loading: boolean;
  pendingCount: number;
  load: () => Promise<void>;
  approve: (id: string) => Promise<void>;
  reject: (id: string, isDraft?: boolean) => Promise<void>;
  getDraft: (action: AutonomousAction) => Promise<string>;
  trackCopy: (actionType: string, wasEdited: boolean) => Promise<void>;
}

export function useActionCenter(): UseActionCenterResult {
  const [pending, setPending] = useState<AutonomousAction[]>([]);
  const [history, setHistory] = useState<AutonomousAction[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, h] = await Promise.all([getPendingActions(), getActionHistory(30)]);
      setPending(p);
      setHistory(h);
    } finally {
      setLoading(false);
    }
  }, []);

  const approve = useCallback(async (id: string) => {
    const action = pending.find((a) => a.id === id);
    await approveAction(id);
    setPending((prev) => prev.filter((a) => a.id !== id));
    if (action) {
      await trackAutomationEvent(
        isDraftAction(action) ? 'draft_approved' : 'action_approved',
        action.type,
      );
    }
  }, [pending]);

  const reject = useCallback(async (id: string, isDraft = false) => {
    const action = pending.find((a) => a.id === id);
    await rejectAction(id);
    setPending((prev) => prev.filter((a) => a.id !== id));
    if (action) {
      await trackAutomationEvent(
        isDraft ? 'draft_rejected' : 'action_rejected',
        action.type,
      );
    }
  }, [pending]);

  const getDraft = useCallback(async (action: AutonomousAction): Promise<string> => {
    const p = action.payload;
    const ctx: DraftContext = {
      draftType:         actionTypeToDraftType(action.type),
      brand:             String(p.brand ?? ''),
      dealTitle:         p.title ? String(p.title) : undefined,
      dealAmount:        p.amount ? Number(p.amount) : undefined,
      daysSince:         p.daysSince    ? Number(p.daysSince)
                       : p.daysSinceUpload ? Number(p.daysSinceUpload)
                       : undefined,
    };
    return generateDraft(ctx);
  }, []);

  const trackCopy = useCallback(async (actionType: string, wasEdited: boolean) => {
    await trackAutomationEvent('draft_copied', actionType);
    if (wasEdited) await trackAutomationEvent('draft_edited', actionType);
  }, []);

  return {
    pending,
    history,
    loading,
    pendingCount: pending.length,
    load,
    approve,
    reject,
    getDraft,
    trackCopy,
  };
}
