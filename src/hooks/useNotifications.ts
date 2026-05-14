import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { supabase } from '../api/supabase';

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

async function scheduleDealDeadlineNotifications(userId: string) {
  await Notifications.cancelAllScheduledNotificationsAsync();

  const now = new Date();
  const inSevenDays = new Date(now);
  inSevenDays.setDate(inSevenDays.getDate() + 7);

  const { data: deals } = await supabase
    .from('deals')
    .select('id, brand, title, end_date')
    .eq('user_id', userId)
    .in('status', ['inquiry', 'reviewing', 'in_progress'])
    .gte('end_date', now.toISOString().split('T')[0])
    .lte('end_date', inSevenDays.toISOString().split('T')[0]);

  if (!deals?.length) return;

  for (const deal of deals) {
    const deadlineDate = new Date(deal.end_date);
    deadlineDate.setHours(9, 0, 0, 0);

    const name = deal.brand || deal.title || '협찬';

    // D-3 알림
    const d3Date = new Date(deadlineDate);
    d3Date.setDate(d3Date.getDate() - 3);
    if (d3Date > now) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `⏰ 협찬 마감 D-3`,
          body: `${name} 협찬 마감 3일 전입니다`,
          sound: true,
          data: { dealId: deal.id, type: 'deal_deadline' },
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: d3Date },
      });
    }

    // D-0 알림 (당일)
    if (deadlineDate > now) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `🔔 협찬 마감 D-0`,
          body: `${name} 협찬이 오늘 마감됩니다`,
          sound: true,
          data: { dealId: deal.id, type: 'deal_deadline' },
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: deadlineDate },
      });
    }
  }
}

export function useNotifications(userId: string | undefined) {
  const receivedListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    if (!userId) return;

    registerPushToken(userId);
    scheduleDealDeadlineNotifications(userId);

    receivedListener.current = Notifications.addNotificationReceivedListener(() => {});
    responseListener.current = Notifications.addNotificationResponseReceivedListener(() => {});

    return () => {
      receivedListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [userId]);
}
