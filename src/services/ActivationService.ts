import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  EMPTY_ACTIVATION_STATE, MILESTONE_ORDER,
  type ActivationMilestone, type ActivationState, type FunnelEvent,
} from '../types/activation';

const STORAGE_KEY = 'activation_v1';
const MAX_FUNNEL_EVENTS = 50;

// ─── Persistence ──────────────────────────────────────────────────────────────

export async function loadActivationState(): Promise<ActivationState> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : EMPTY_ACTIVATION_STATE;
  } catch {
    return EMPTY_ACTIVATION_STATE;
  }
}

async function save(state: ActivationState): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // non-fatal
  }
}

// ─── Milestones ───────────────────────────────────────────────────────────────

export async function markMilestone(milestone: ActivationMilestone): Promise<ActivationState> {
  const state = await loadActivationState();
  if (state.completed[milestone]) return state; // idempotent

  const next: ActivationState = {
    ...state,
    completed: { ...state.completed, [milestone]: new Date().toISOString() },
  };
  await save(next);
  return next;
}

// ─── Funnel events ────────────────────────────────────────────────────────────

export async function trackFunnelEvent(
  type: string,
  metadata?: Record<string, string | number | boolean>,
): Promise<void> {
  const state = await loadActivationState();
  const event: FunnelEvent = { type, ts: new Date().toISOString(), metadata };
  const events = [...state.funnelEvents, event].slice(-MAX_FUNNEL_EVENTS);
  await save({ ...state, funnelEvents: events });
}

// ─── Computation ──────────────────────────────────────────────────────────────

export function computeCompletion(state: ActivationState): {
  completed: number;
  total: number;
  pct: number;
  nextMilestone: ActivationMilestone | null;
} {
  const total = MILESTONE_ORDER.length;
  const completed = MILESTONE_ORDER.filter((m) => Boolean(state.completed[m])).length;
  const pct = Math.round((completed / total) * 100);
  const nextMilestone = MILESTONE_ORDER.find((m) => !state.completed[m]) ?? null;
  return { completed, total, pct, nextMilestone };
}
