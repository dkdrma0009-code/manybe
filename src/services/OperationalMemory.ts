import AsyncStorage from '@react-native-async-storage/async-storage';
import { makeLogger } from '../utils/logger';

const log = makeLogger('OperationalMemory');
const MEMORY_KEY = 'op_memory_v1';
const MAX_ENTRIES = 200;
const TTL_MS = 90 * 24 * 60 * 60 * 1000; // 90 days

export type MemoryEventType =
  | 'recommendation_actioned'
  | 'recommendation_dismissed'
  | 'deal_status_changed'
  | 'automation_fired';

export interface MemoryEntry {
  id: string;
  type: MemoryEventType;
  entityId?: string;
  metadata: Record<string, string | number | boolean>;
  timestamp: string;
}

export interface RecommendationEffectiveness {
  type: string;
  actionRate: number; // 0–1
  totalShown: number;
}

// ─── Persistence ──────────────────────────────────────────────────────────────

async function load(): Promise<MemoryEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(MEMORY_KEY);
    if (!raw) return [];
    const all: MemoryEntry[] = JSON.parse(raw);
    const cutoff = Date.now() - TTL_MS;
    return all.filter((e) => new Date(e.timestamp).getTime() > cutoff);
  } catch { return []; }
}

async function persist(entries: MemoryEntry[]): Promise<void> {
  try {
    // Keep only the most recent MAX_ENTRIES, deduplicate by (type + entityId) keeping latest
    const seen = new Map<string, MemoryEntry>();
    for (const e of entries) {
      const dedupeKey = `${e.type}_${e.entityId ?? ''}`;
      const existing = seen.get(dedupeKey);
      if (!existing || e.timestamp > existing.timestamp) seen.set(dedupeKey, e);
    }
    const pruned = [...seen.values()]
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
      .slice(-MAX_ENTRIES);
    await AsyncStorage.setItem(MEMORY_KEY, JSON.stringify(pruned));
  } catch (e) {
    log.warn('persist failed:', e);
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function recordEvent(
  type: MemoryEventType,
  opts: { entityId?: string; metadata?: Record<string, string | number | boolean> } = {},
): Promise<void> {
  const entries = await load();
  entries.push({
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
    type,
    entityId: opts.entityId,
    metadata: opts.metadata ?? {},
    timestamp: new Date().toISOString(),
  });
  await persist(entries);
}

export async function getEffectivenessScores(): Promise<RecommendationEffectiveness[]> {
  const entries = await load();
  const relevant = entries.filter(
    (e) => e.type === 'recommendation_actioned' || e.type === 'recommendation_dismissed',
  );

  const byType = new Map<string, { actioned: number; total: number }>();
  for (const entry of relevant) {
    const recType = (entry.metadata.recommendationType as string) ?? 'unknown';
    if (!byType.has(recType)) byType.set(recType, { actioned: 0, total: 0 });
    const counts = byType.get(recType)!;
    counts.total++;
    if (entry.type === 'recommendation_actioned') counts.actioned++;
  }

  return Array.from(byType.entries()).map(([type, { actioned, total }]) => ({
    type,
    actionRate: total > 0 ? actioned / total : 0,
    totalShown: total,
  }));
}

export async function getRecentEvents(limit = 50): Promise<MemoryEntry[]> {
  const entries = await load();
  return entries.slice(-limit).reverse();
}
