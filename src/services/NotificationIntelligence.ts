/**
 * Cooldown + fatigue guard for smart notifications.
 * All smart reminders must pass through `canFire` before scheduling.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  COOLDOWN_KEY, DAILY_NOTIF_MAX, FATIGUE_KEY,
  NOTIF_COOLDOWNS, QUIET_HOUR_END, QUIET_HOUR_START,
  type NotifCategory,
} from '../types/notifications';

// ─── Cooldown ─────────────────────────────────────────────────────────────────

async function loadCooldowns(): Promise<Record<string, string>> {
  try {
    const raw = await AsyncStorage.getItem(COOLDOWN_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

async function saveCooldowns(map: Record<string, string>): Promise<void> {
  try { await AsyncStorage.setItem(COOLDOWN_KEY, JSON.stringify(map)); } catch {}
}

export async function isCoolingDown(category: NotifCategory): Promise<boolean> {
  const cooldownMs = NOTIF_COOLDOWNS[category];
  if (!cooldownMs) return false;
  const map = await loadCooldowns();
  const lastFired = map[category];
  if (!lastFired) return false;
  return Date.now() - new Date(lastFired).getTime() < cooldownMs;
}

export async function recordFired(category: NotifCategory): Promise<void> {
  const map = await loadCooldowns();
  map[category] = new Date().toISOString();
  await saveCooldowns(map);
}

// ─── Daily fatigue ────────────────────────────────────────────────────────────

interface FatigueRecord { date: string; count: number }

async function loadFatigue(): Promise<FatigueRecord> {
  try {
    const raw = await AsyncStorage.getItem(FATIGUE_KEY);
    if (!raw) return { date: '', count: 0 };
    return JSON.parse(raw);
  } catch { return { date: '', count: 0 }; }
}

export async function isDailyFatigued(): Promise<boolean> {
  const record = await loadFatigue();
  const today = new Date().toISOString().slice(0, 10);
  if (record.date !== today) return false;
  return record.count >= DAILY_NOTIF_MAX;
}

export async function incrementFatigueCount(): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  const record = await loadFatigue();
  const count = record.date === today ? record.count + 1 : 1;
  try {
    await AsyncStorage.setItem(FATIGUE_KEY, JSON.stringify({ date: today, count }));
  } catch {}
}

// ─── Composite guard ──────────────────────────────────────────────────────────

/** Returns true if this category is allowed to fire right now. */
export async function canFire(category: NotifCategory): Promise<boolean> {
  if (await isCoolingDown(category)) return false;
  // milestone_celebration bypasses daily fatigue (celebratory, not annoying)
  if (category !== 'milestone_celebration' && await isDailyFatigued()) return false;
  return true;
}

/** Call after successfully scheduling a smart notification. */
export async function onScheduled(category: NotifCategory): Promise<void> {
  await Promise.all([
    recordFired(category),
    incrementFatigueCount(),
  ]);
}

// ─── Quiet hours ──────────────────────────────────────────────────────────────

/**
 * Shift a fire date to respect quiet hours (22:00–08:00).
 * If in quiet hours: move to 09:00 of the next available morning.
 */
export function respectQuietHours(date: Date): Date {
  const h = date.getHours();
  const adjusted = new Date(date);
  if (h < QUIET_HOUR_END) {
    adjusted.setHours(9, 0, 0, 0);
  } else if (h >= QUIET_HOUR_START) {
    adjusted.setDate(adjusted.getDate() + 1);
    adjusted.setHours(9, 0, 0, 0);
  }
  return adjusted;
}

/** Next occurrence of a given weekday+hour (0=Sun, 1=Mon, …, 6=Sat). */
export function nextWeekdayAt(weekday: number, hour: number): Date {
  const now = new Date();
  const d = new Date(now);
  d.setHours(hour, 0, 0, 0);
  const daysUntil = (7 + weekday - now.getDay()) % 7 || 7;
  d.setDate(now.getDate() + daysUntil);
  return d;
}
