// In-memory memoization for expensive intelligence computations.
// Keyed by CACHE_KEYS, TTL-based invalidation. No AsyncStorage — intentionally
// ephemeral so each session starts fresh (avoids stale intelligence on new data).

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

class IntelligenceCache {
  private readonly store = new Map<string, CacheEntry<unknown>>();

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.data as T;
  }

  set<T>(key: string, data: T, ttlMs: number): void {
    this.store.set(key, { data, expiresAt: Date.now() + ttlMs });
  }

  invalidate(key: string): void {
    this.store.delete(key);
  }

  invalidateAll(): void {
    this.store.clear();
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }
}

export const intelligenceCache = new IntelligenceCache();

export const CACHE_KEYS = {
  INTELLIGENCE:   'creator_intelligence',
  BRIEFING:       'morning_briefing',
  BUSINESS_GRAPH: 'business_graph',
  DECISION_ITEMS: 'decision_focus_items',
} as const;

export const CACHE_TTL = {
  INTELLIGENCE:   5  * 60 * 1000,  // 5 min
  BRIEFING:       60 * 60 * 1000,  // 1 hour (briefing is stable within a day)
  BUSINESS_GRAPH: 10 * 60 * 1000,  // 10 min
  DECISION_ITEMS:  2 * 60 * 1000,  // 2 min (high-churn, keep fresh)
} as const;
