import AsyncStorage from '@react-native-async-storage/async-storage';
import type { NotifAnalyticsEvent, NotifAnalyticsEventType, NotifCategory } from '../types/notifications';

const STORAGE_KEY = 'notif_analytics_v1';
const MAX_EVENTS  = 100;

async function append(event: NotifAnalyticsEvent): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const events: NotifAnalyticsEvent[] = raw ? JSON.parse(raw) : [];
    events.push(event);
    if (events.length > MAX_EVENTS) events.splice(0, events.length - MAX_EVENTS);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  } catch {
    // non-fatal
  }
}

export const NotificationAnalytics = {
  track(
    type:     NotifAnalyticsEventType,
    category: NotifCategory | 'unknown' = 'unknown',
    metadata?: Record<string, string | number | boolean>,
  ) {
    append({ type, category, ts: new Date().toISOString(), metadata });
  },

  scheduled(category: NotifCategory, key: string) {
    this.track('notification_scheduled', category, { key });
  },
  opened(category: NotifCategory | 'unknown', dealId?: string) {
    this.track('notification_opened', category, dealId ? { dealId } : undefined);
  },
  dismissed(category: NotifCategory | 'unknown') {
    this.track('notification_dismissed', category);
  },
  actioned(category: NotifCategory | 'unknown', action: string) {
    this.track('notification_actioned', category, { action });
  },

  async getAll(): Promise<NotifAnalyticsEvent[]> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  },
};
