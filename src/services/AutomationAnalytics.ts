// Tracks acceptance rates and effectiveness of AI-generated workflow actions.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { makeLogger } from '../utils/logger';

const log = makeLogger('AutomationAnalytics');
const KEY     = 'automation_analytics_v1';
const MAX_LOG = 300;

export type AutomationEventType =
  | 'draft_approved'
  | 'draft_rejected'
  | 'draft_edited'
  | 'draft_copied'
  | 'action_approved'
  | 'action_rejected';

interface AutomationEvent {
  type: AutomationEventType;
  actionType: string;
  timestamp: string;
}

export interface AutomationSummary {
  totalActions: number;
  approvalRate: number;  // 0–100
  draftCopyRate: number; // 0–100 (copied vs rejected)
  draftEditRate: number; // 0–100 (edited before copy vs copied as-is)
  byActionType: Record<string, { approved: number; rejected: number }>;
}

async function load(): Promise<AutomationEvent[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

async function save(events: AutomationEvent[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(events.slice(-MAX_LOG)));
  } catch (e) {
    log.warn('save failed:', e);
  }
}

export async function trackAutomationEvent(
  type: AutomationEventType,
  actionType: string,
): Promise<void> {
  const events = await load();
  events.push({ type, actionType, timestamp: new Date().toISOString() });
  await save(events);
}

export async function getAutomationSummary(): Promise<AutomationSummary> {
  const events = await load();

  const byActionType: Record<string, { approved: number; rejected: number }> = {};
  let totalApproved  = 0;
  let totalRejected  = 0;
  let draftCopied    = 0;
  let draftRejected  = 0;
  let draftEdited    = 0;

  for (const e of events) {
    if (!byActionType[e.actionType]) byActionType[e.actionType] = { approved: 0, rejected: 0 };
    if (e.type === 'action_approved' || e.type === 'draft_approved') {
      byActionType[e.actionType].approved++;
      totalApproved++;
    }
    if (e.type === 'action_rejected' || e.type === 'draft_rejected') {
      byActionType[e.actionType].rejected++;
      totalRejected++;
    }
    if (e.type === 'draft_copied')   draftCopied++;
    if (e.type === 'draft_rejected') draftRejected++;
    if (e.type === 'draft_edited')   draftEdited++;
  }

  const total        = totalApproved + totalRejected;
  const draftTotal   = draftCopied + draftRejected;
  const approvalRate  = total > 0 ? Math.round((totalApproved / total) * 100) : 0;
  const draftCopyRate = draftTotal > 0 ? Math.round((draftCopied / draftTotal) * 100) : 0;
  const draftEditRate = draftCopied > 0 ? Math.round((draftEdited / draftCopied) * 100) : 0;

  return {
    totalActions: events.length,
    approvalRate,
    draftCopyRate,
    draftEditRate,
    byActionType,
  };
}
