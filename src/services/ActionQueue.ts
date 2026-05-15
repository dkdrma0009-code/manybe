// Idempotent action queue — persists to AsyncStorage.
// Executed key log prevents duplicate side effects across app restarts.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { AutonomousAction } from '../types/autonomous';

const QUEUE_KEY    = 'autonomous_queue_v1';
const EXECUTED_KEY = 'autonomous_executed_v1';
const MAX_LOG      = 500;

// ─── Persistence ──────────────────────────────────────────────────────────────

async function loadQueue(): Promise<AutonomousAction[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

async function saveQueue(actions: AutonomousAction[]): Promise<void> {
  try { await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(actions)); } catch {}
}

async function loadExecutedKeys(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(EXECUTED_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function isAlreadyExecuted(idempotencyKey: string): Promise<boolean> {
  const keys = await loadExecutedKeys();
  return keys.includes(idempotencyKey);
}

export async function markAsExecuted(idempotencyKey: string): Promise<void> {
  const keys = await loadExecutedKeys();
  // Keep last MAX_LOG, then append
  const pruned = keys.slice(-MAX_LOG);
  try { await AsyncStorage.setItem(EXECUTED_KEY, JSON.stringify([...pruned, idempotencyKey])); } catch {}
  // Update status in queue if present
  const queue   = await loadQueue();
  const updated = queue.map((a) =>
    a.idempotencyKey === idempotencyKey
      ? { ...a, status: 'executed' as const, executedAt: new Date().toISOString() }
      : a,
  );
  await saveQueue(updated);
}

export async function enqueueForApproval(action: AutonomousAction): Promise<void> {
  const queue  = await loadQueue();
  const exists = queue.some((a) => a.idempotencyKey === action.idempotencyKey);
  if (!exists) await saveQueue([...queue, { ...action, status: 'pending' }]);
}

export async function getPendingActions(): Promise<AutonomousAction[]> {
  const queue = await loadQueue();
  return queue.filter((a) => a.status === 'pending');
}

export async function approveAction(id: string): Promise<AutonomousAction | null> {
  const queue  = await loadQueue();
  const action = queue.find((a) => a.id === id);
  if (!action) return null;
  await saveQueue(queue.map((a) => a.id === id ? { ...a, status: 'approved' as const } : a));
  return { ...action, status: 'approved' };
}

export async function rejectAction(id: string): Promise<void> {
  const queue = await loadQueue();
  await saveQueue(queue.map((a) => a.id === id ? { ...a, status: 'rejected' as const } : a));
}

export async function pruneStaleActions(maxAgeDays = 30): Promise<void> {
  const cutoff = new Date(Date.now() - maxAgeDays * 86_400_000).toISOString();
  const queue  = await loadQueue();
  await saveQueue(queue.filter(
    (a) => a.status === 'pending' || a.status === 'approved' || (a.executedAt && a.executedAt > cutoff),
  ));
}
