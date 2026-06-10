import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../api/supabase';
import { EventBus } from './EventBus';
import { makeLogger } from '../utils/logger';

const log = makeLogger('MutationQueue');

const QUEUE_KEY = 'mutation_queue_v1';
const MAX_ATTEMPTS = 3;

export interface QueuedMutation {
  id: string;
  table: string;
  operation: 'insert' | 'update' | 'delete';
  payload: Record<string, unknown>;
  filter?: { column: string; value: string };
  createdAt: string;
  attempts: number;
}

// ─── Queue I/O ────────────────────────────────────────────────────────────────

async function load(): Promise<QueuedMutation[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

async function save(queue: QueuedMutation[]): Promise<void> {
  try { await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue)); } catch (e) { log.warn('queue save failed:', e); }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function enqueue(
  mutation: Omit<QueuedMutation, 'id' | 'createdAt' | 'attempts'>,
): Promise<void> {
  const queue = await load();
  queue.push({
    ...mutation,
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    createdAt: new Date().toISOString(),
    attempts: 0,
  });
  await save(queue);
  EventBus.emit('mutation:queued', { table: mutation.table, operation: mutation.operation });
}

export async function processQueue(): Promise<{ processed: number; failed: number }> {
  const queue = await load();
  if (queue.length === 0) return { processed: 0, failed: 0 };

  let processed = 0;
  let failed = 0;
  const remaining: QueuedMutation[] = [];

  for (const mutation of queue) {
    if (mutation.attempts >= MAX_ATTEMPTS) { failed++; continue; }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const from = supabase.from(mutation.table as any);
      let error: unknown;

      if (mutation.operation === 'insert') {
        ({ error } = await from.insert(mutation.payload));
      } else if (mutation.operation === 'update' && mutation.filter) {
        ({ error } = await (from.update(mutation.payload) as any)
          .eq(mutation.filter.column, mutation.filter.value));
      } else if (mutation.operation === 'delete' && mutation.filter) {
        ({ error } = await (from.delete() as any)
          .eq(mutation.filter.column, mutation.filter.value));
      } else {
        continue; // malformed — drop
      }

      if (error) throw error;
      processed++;
    } catch {
      remaining.push({ ...mutation, attempts: mutation.attempts + 1 });
    }
  }

  await save(remaining);
  if (processed > 0) {
    EventBus.emit('mutation:processed', { processed, failed });
  }
  return { processed, failed };
}

export async function getQueueLength(): Promise<number> {
  return (await load()).length;
}

export async function clearQueue(): Promise<void> {
  await AsyncStorage.removeItem(QUEUE_KEY);
}
