/**
 * Smart Reminder Engine — generates intelligent notification triggers
 * beyond simple deal deadlines. Runs on every app foreground event.
 *
 * Responsibilities:
 *  - Inactivity reminder (reschedule 7-day wake-up on every open)
 *  - Weekly AI briefing (next Monday 9am)
 *  - Activation reminders (no deal after D+1, D+3 of onboarding)
 *  - Overdue deal escalation (D+3, D+7)
 *  - Milestone celebration (immediate local notification)
 *  - last_active_v1 timestamp management
 */
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../api/supabase';
import {
  canFire, onScheduled, respectQuietHours, nextWeekdayAt,
} from './NotificationIntelligence';
import { NotificationAnalytics } from './NotificationAnalytics';
import { loadActivationState } from './ActivationService';
import {
  SMART_IDS_KEY, LAST_ACTIVE_KEY,
  type NotifCategory,
} from '../types/notifications';
import { makeLogger } from '../utils/logger';

const log = makeLogger('SmartReminderEngine');

// ─── Storage helpers ──────────────────────────────────────────────────────────

async function loadSmartIds(): Promise<Record<string, string>> {
  try {
    const raw = await AsyncStorage.getItem(SMART_IDS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

async function saveSmartIds(map: Record<string, string>): Promise<void> {
  try { await AsyncStorage.setItem(SMART_IDS_KEY, JSON.stringify(map)); } catch (e) { log.warn('saveSmartIds failed:', e); }
}

async function cancelSmartNotif(key: string, map: Record<string, string>): Promise<void> {
  if (map[key]) {
    try { await Notifications.cancelScheduledNotificationAsync(map[key]); } catch (e) { log.warn(`cancel ${key} failed:`, e); }
    delete map[key];
  }
}

async function scheduleAt(
  key:      string,
  title:    string,
  body:     string,
  fireDate: Date,
  data:     Record<string, unknown>,
  category: NotifCategory,
  map:      Record<string, string>,
): Promise<void> {
  const adjusted = respectQuietHours(fireDate);
  if (adjusted.getTime() <= Date.now()) return;
  try {
    const id = await Notifications.scheduleNotificationAsync({
      content: { title, body, data: { ...data, type: category } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: adjusted },
    });
    map[key] = id;
    NotificationAnalytics.scheduled(category, key);
    await onScheduled(category);
  } catch (e) {
    log.error(`scheduleAt(${key}) failed — reminder will not fire:`, e);
  }
}

// ─── Notification copy (creator profile aware) ────────────────────────────────

type Scale = 'nano' | 'micro' | 'mid' | 'macro';

async function getCreatorScale(): Promise<Scale> {
  try {
    const v = await AsyncStorage.getItem('creator_scale');
    return (v as Scale) ?? 'micro';
  } catch { return 'micro'; }
}

const INACTIVITY_COPY: Record<Scale, { title: string; body: string }> = {
  nano:  { title: '🌱 매니비가 기다리고 있어요', body: '첫 협찬을 기록하고 AI 분석을 시작해봐요.' },
  micro: { title: '📬 협찬 현황을 확인해보세요', body: '한동안 오지 않았네요. 운영 현황을 체크해볼까요?' },
  mid:   { title: '📊 파이프라인 점검이 필요해요', body: '7일째 로그인이 없었어요. 정체된 협찬이 있을 수 있습니다.' },
  macro: { title: '⚡ 협찬 파이프라인 상태를 확인하세요', body: '매니비에 정체된 항목이 있을 수 있습니다.' },
};

const ACTIVATION_COPY: Record<'d1' | 'd3', Record<Scale, { title: string; body: string }>> = {
  d1: {
    nano:  { title: '🌱 첫 협찬을 추가해볼까요?', body: '협찬 1건만 입력하면 AI 분석이 시작됩니다.' },
    micro: { title: '🤝 첫 협찬을 등록해보세요', body: '진행 중인 협찬을 하나만 추가하면 매니비가 분석을 시작해요.' },
    mid:   { title: '📋 첫 협찬을 등록하세요', body: '협찬을 등록하면 파이프라인 관리가 시작됩니다.' },
    macro: { title: '⚡ 협찬 파이프라인을 시작하세요', body: '협찬을 등록하고 AI 인사이트를 확인하세요.' },
  },
  d3: {
    nano:  { title: '✨ AI 분석까지 협찬 1개면 충분해요', body: '지금 추가하면 주간 리뷰 + AI 코치가 활성화됩니다.' },
    micro: { title: '🧠 AI 코치 활성화까지 한 걸음이에요', body: '협찬을 추가하면 AI가 운영을 분석하기 시작합니다.' },
    mid:   { title: '📊 협찬 데이터를 추가해주세요', body: '매니비 AI 인텔리전스를 사용하려면 협찬이 필요합니다.' },
    macro: { title: '⚡ 파이프라인 입력이 필요합니다', body: '협찬 데이터를 등록하고 AI 분석을 시작하세요.' },
  },
};

// ─── Core scheduling functions ────────────────────────────────────────────────

async function refreshInactivityReminder(map: Record<string, string>): Promise<void> {
  // Always cancel and reschedule — this is the heartbeat pattern
  await cancelSmartNotif('inactivity_7d', map);
  const scale = await getCreatorScale();
  const copy  = INACTIVITY_COPY[scale];
  const fireDate = new Date(Date.now() + 7 * 86_400_000);
  await scheduleAt('inactivity_7d', copy.title, copy.body, fireDate,
    { urgency: 'medium' }, 'inactivity', map);
}

async function refreshWeeklyBriefing(map: Record<string, string>): Promise<void> {
  // Only reschedule if not already queued for this week
  if (map['weekly_briefing_mon']) return;
  if (!(await canFire('weekly_briefing'))) return;

  const nextMonday = nextWeekdayAt(1, 9); // Monday 9:00
  const scale = await getCreatorScale();
  const body = scale === 'nano' || scale === 'micro'
    ? '이번 주 AI 분석을 확인해보세요. 협찬 현황이 업데이트됐어요.'
    : '주간 파이프라인 리뷰 + AI 코치 인사이트가 준비됐어요.';

  await scheduleAt(
    'weekly_briefing_mon',
    '📊 매니비 주간 AI 브리핑',
    body,
    nextMonday,
    { urgency: 'low' },
    'weekly_briefing',
    map,
  );
}

async function refreshActivationReminders(map: Record<string, string>): Promise<void> {
  const activation = await loadActivationState();
  const onboardingTs = activation.completed.onboarding_complete;
  const dealDone     = Boolean(activation.completed.first_deal_added);

  // Cancel if deal is already done
  if (dealDone) {
    await cancelSmartNotif('activation_d1', map);
    await cancelSmartNotif('activation_d3', map);
    return;
  }

  if (!onboardingTs) return;
  const onboardingMs = new Date(onboardingTs).getTime();
  const now = Date.now();
  const scale = await getCreatorScale();

  // D+1 reminder
  const d1Fire = new Date(onboardingMs + 1 * 86_400_000);
  if (!map['activation_d1'] && d1Fire.getTime() > now && (await canFire('activation_reminder'))) {
    const copy = ACTIVATION_COPY.d1[scale];
    await scheduleAt('activation_d1', copy.title, copy.body, d1Fire,
      { urgency: 'medium' }, 'activation_reminder', map);
  }

  // D+3 reminder
  const d3Fire = new Date(onboardingMs + 3 * 86_400_000);
  if (!map['activation_d3'] && d3Fire.getTime() > now && (await canFire('activation_reminder'))) {
    const copy = ACTIVATION_COPY.d3[scale];
    await scheduleAt('activation_d3', copy.title, copy.body, d3Fire,
      { urgency: 'medium' }, 'activation_reminder', map);
  }
}

async function refreshOverdueEscalation(
  userId: string,
  map: Record<string, string>,
): Promise<void> {
  const { data } = await supabase
    .from('deals')
    .select('id, brand, title, end_date, status')
    .eq('user_id', userId)
    .in('status', ['inquiry', 'reviewing', 'in_progress', 'uploaded'])
    .not('end_date', 'is', null);

  if (!data?.length) return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const deal of data) {
    if (!deal.end_date) continue;
    const endDay = new Date(deal.end_date + 'T00:00:00');
    if (endDay >= today) continue; // not overdue

    const overdueDays = Math.floor((today.getTime() - endDay.getTime()) / 86_400_000);

    // D+3 escalation
    const key3 = `overdue_${deal.id}_3d`;
    if (!map[key3] && overdueDays >= 3 && (await canFire('overdue_escalation'))) {
      await scheduleAt(
        key3,
        `🔴 ${deal.brand} 마감 ${overdueDays}일 초과`,
        `${deal.title} — 상태를 업데이트하거나 마감일을 조정하세요.`,
        new Date(Date.now() + 30_000), // fires in 30s (near-immediate)
        { dealId: deal.id, urgency: 'high' },
        'overdue_escalation',
        map,
      );
    }

    // D+7 escalation (stronger)
    const key7 = `overdue_${deal.id}_7d`;
    if (!map[key7] && overdueDays >= 7 && (await canFire('overdue_escalation'))) {
      await scheduleAt(
        key7,
        `‼️ ${deal.brand} 협찬 1주일 이상 지연`,
        `지금 처리하지 않으면 수익 기회를 잃을 수 있어요.`,
        new Date(Date.now() + 60_000), // fires in 1min (stagger with 3d)
        { dealId: deal.id, urgency: 'critical' },
        'overdue_escalation',
        map,
      );
    }
  }
}

// ─── Milestone celebration (immediate) ───────────────────────────────────────

const CELEBRATION_COPY: Partial<Record<string, { title: string; body: string }>> = {
  first_deal_added:       { title: '🎉 첫 협찬이 추가됐어요!', body: 'AI 분석이 시작됩니다. 인사이트 탭을 확인해보세요.' },
  first_revenue_recorded: { title: '💰 첫 수익이 기록됐어요!', body: '수익 트렌드 분석과 AI 예측이 활성화됩니다.' },
  channel_connected:      { title: '📺 채널이 연동됐어요!', body: '구독자 현황이 홈 화면에 표시됩니다.' },
  first_insight_viewed:   { title: '🧠 AI 인사이트를 처음 열었어요!', body: '계속 협찬을 기록할수록 분석이 정교해집니다.' },
};

export async function celebrateMilestone(milestone: string): Promise<void> {
  const copy = CELEBRATION_COPY[milestone];
  if (!copy) return;
  try {
    await Notifications.scheduleNotificationAsync({
      content: { title: copy.title, body: copy.body, data: { type: 'milestone_celebration', milestone } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 2, repeats: false },
    });
    NotificationAnalytics.scheduled('milestone_celebration', `milestone_${milestone}`);
  } catch (e) {
    log.error(`milestone celebration (${milestone}) failed:`, e);
  }
}

// ─── Main refresh ─────────────────────────────────────────────────────────────

/** Call on every app foreground. Updates last_active and reschedules all smart reminders. */
export async function refreshSmartReminders(userId: string): Promise<void> {
  // 1. Stamp last-active for inactivity tracking
  try { await AsyncStorage.setItem(LAST_ACTIVE_KEY, new Date().toISOString()); } catch (e) { log.warn('last_active stamp failed:', e); }

  const map = await loadSmartIds();

  // 2. Run all reminder refreshes in parallel (each is independently guarded)
  await Promise.allSettled([
    refreshInactivityReminder(map),
    refreshWeeklyBriefing(map),
    refreshActivationReminders(map),
    refreshOverdueEscalation(userId, map),
  ]);

  await saveSmartIds(map);
}
