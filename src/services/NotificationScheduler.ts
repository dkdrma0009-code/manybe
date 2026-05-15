import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { respectQuietHours } from './NotificationIntelligence';

// setNotificationHandler lives in useNotifications.ts — do not duplicate here.

const SCHEDULED_IDS_KEY = 'notif_scheduled_ids_v1';

// ─── Permission ───────────────────────────────────────────────────────────────

export async function requestNotificationPermission(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

// ─── Persistence helpers ──────────────────────────────────────────────────────

async function loadScheduledIds(): Promise<Record<string, string>> {
  try {
    const raw = await AsyncStorage.getItem(SCHEDULED_IDS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

async function saveScheduledIds(map: Record<string, string>): Promise<void> {
  try { await AsyncStorage.setItem(SCHEDULED_IDS_KEY, JSON.stringify(map)); } catch {}
}

// ─── Scheduling ───────────────────────────────────────────────────────────────

export interface DealForNotification {
  id: string;
  brand: string;
  title: string;
  status: string;
  end_date: string | null;
  created_at: string;
}

export async function scheduleDeadlineReminders(deals: DealForNotification[]): Promise<void> {
  const hasPermission = await requestNotificationPermission();
  if (!hasPermission) return;

  const scheduledMap = await loadScheduledIds();
  const now = Date.now();

  for (const deal of deals) {
    if (deal.status === 'settled') {
      // Cancel any existing notifications for settled deals
      await cancelDealNotifications(deal.id, scheduledMap);
      continue;
    }

    if (!deal.end_date) continue;
    const endMs = new Date(deal.end_date + 'T09:00:00').getTime();
    if (endMs <= now) continue; // already past

    // Cancel existing, then reschedule fresh
    await cancelDealNotifications(deal.id, scheduledMap);

    const reminders = [
      { daysBeforeKey: '3d', offset: 3, title: `⏰ ${deal.brand} 마감 3일 전이에요`, body: deal.title },
      { daysBeforeKey: '1d', offset: 1, title: `🔔 ${deal.brand} 내일이 마감일이에요`, body: deal.title },
      { daysBeforeKey: '0d', offset: 0, title: `‼️ ${deal.brand} 오늘이 마감일이에요`, body: `${deal.title} · 지금 업로드 상태를 업데이트하세요` },
    ];

    for (const r of reminders) {
      const fireMs = endMs - r.offset * 86400000;
      if (fireMs <= now) continue; // would fire in the past
      const fireDate = respectQuietHours(new Date(fireMs));
      try {
        const notifId = await Notifications.scheduleNotificationAsync({
          content: { title: r.title, body: r.body, data: { dealId: deal.id, type: 'deadline' } },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: fireDate },
        });
        scheduledMap[`${deal.id}_${r.daysBeforeKey}`] = notifId;
      } catch {}
    }

    // Settlement delay reminder: 14 days after creation if still 'uploaded'
    if (deal.status === 'uploaded') {
      const daysSince = Math.floor((now - new Date(deal.created_at).getTime()) / 86400000);
      if (daysSince < 14) {
        const fireMs = new Date(deal.created_at).getTime() + 14 * 86400000;
        if (fireMs > now) {
          const fireDate = respectQuietHours(new Date(fireMs));
          try {
            const notifId = await Notifications.scheduleNotificationAsync({
              content: {
                title: `💳 ${deal.brand} 정산 확인이 필요해요`,
                body: '업로드 완료 후 14일이 지났어요. 정산 요청을 확인하세요.',
                data: { dealId: deal.id, type: 'settlement_delay' },
              },
              trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: fireDate },
            });
            scheduledMap[`${deal.id}_settle_14`] = notifId;
          } catch {}
        }
      }
    }
  }

  await saveScheduledIds(scheduledMap);
}

export async function cancelDealNotifications(
  dealId: string,
  map?: Record<string, string>,
): Promise<void> {
  const scheduledMap = map ?? await loadScheduledIds();
  const keys = Object.keys(scheduledMap).filter((k) => k.startsWith(dealId));
  for (const key of keys) {
    try { await Notifications.cancelScheduledNotificationAsync(scheduledMap[key]); } catch {}
    delete scheduledMap[key];
  }
  if (!map) await saveScheduledIds(scheduledMap);
}

export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  await AsyncStorage.removeItem(SCHEDULED_IDS_KEY);
}
