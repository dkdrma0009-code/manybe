import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PremiumFeature } from '../types/subscription';

type MonetizationEvent =
  | { type: 'paywall_impression'; feature: PremiumFeature; ts: string }
  | { type: 'upgrade_tap';        source: string;          ts: string }
  | { type: 'purchase_completed'; productId: string;       ts: string }
  | { type: 'purchase_failed';    productId: string; error: string; ts: string }
  | { type: 'restore_completed';  ts: string }
  | { type: 'trial_started';      productId: string; ts: string };

const STORAGE_KEY = 'mon_events_v1';
const MAX_EVENTS  = 100;

async function append(event: MonetizationEvent): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const events: MonetizationEvent[] = raw ? JSON.parse(raw) : [];
    events.push(event);
    if (events.length > MAX_EVENTS) events.splice(0, events.length - MAX_EVENTS);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  } catch {
    // non-fatal
  }
}

export const MonetizationAnalytics = {
  paywallImpression(feature: PremiumFeature) {
    append({ type: 'paywall_impression', feature, ts: new Date().toISOString() });
  },
  upgradeTap(source: string) {
    append({ type: 'upgrade_tap', source, ts: new Date().toISOString() });
  },
  purchaseCompleted(productId: string) {
    append({ type: 'purchase_completed', productId, ts: new Date().toISOString() });
  },
  purchaseFailed(productId: string, error: string) {
    append({ type: 'purchase_failed', productId, error, ts: new Date().toISOString() });
  },
  restoreCompleted() {
    append({ type: 'restore_completed', ts: new Date().toISOString() });
  },
  trialStarted(productId: string) {
    append({ type: 'trial_started', productId, ts: new Date().toISOString() });
  },

  async getAll(): Promise<MonetizationEvent[]> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },
};
