import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { supabase } from '../api/supabase';
import { scheduleDeadlineReminders, DealForNotification } from '../services/NotificationScheduler';
import { refreshSmartReminders } from '../services/SmartReminderEngine';
import { NotificationAnalytics } from '../services/NotificationAnalytics';
import type { NotifCategory } from '../types/notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function registerPushToken(userId: string) {
  if (!Device.isDevice) return;

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') return;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: '매니비 알림',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#6E56F0',
    });
  }

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync();
    await supabase
      .from('profiles')
      .update({ push_token: tokenData.data })
      .eq('id', userId);
  } catch {
    // 개발 환경 또는 실기기 없을 때 무시
  }
}

async function refreshAll(userId: string): Promise<void> {
  const { data } = await supabase
    .from('deals')
    .select('id, brand, title, status, end_date, created_at')
    .eq('user_id', userId)
    .neq('status', 'settled');

  await Promise.allSettled([
    data?.length ? scheduleDeadlineReminders(data as DealForNotification[]) : Promise.resolve(),
    refreshSmartReminders(userId),
  ]);
}

export function useNotifications(userId: string | undefined) {
  const receivedListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    if (!userId) return;

    registerPushToken(userId);
    refreshAll(userId);

    const appStateHandler = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next === 'active') refreshAll(userId);
    });

    receivedListener.current = Notifications.addNotificationReceivedListener((notif) => {
      const data = notif.request.content.data;
      const category = (data?.type as NotifCategory | undefined) ?? 'unknown';
      NotificationAnalytics.track('notification_opened', category);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      const category = (data?.type as NotifCategory | undefined) ?? 'unknown';
      const actionId = response.actionIdentifier;
      if (actionId === Notifications.DEFAULT_ACTION_IDENTIFIER) {
        NotificationAnalytics.opened(category, data?.dealId as string | undefined);
      } else {
        NotificationAnalytics.actioned(category, actionId);
      }
    });

    return () => {
      appStateHandler.remove();
      receivedListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [userId]);
}
