// ─── Categories & payloads ────────────────────────────────────────────────────

export type NotifCategory =
  | 'deadline'
  | 'settlement_delay'
  | 'overdue_escalation'
  | 'weekly_briefing'
  | 'activation_reminder'
  | 'inactivity'
  | 'milestone_celebration';

export interface NotifPayload {
  type: NotifCategory;
  dealId?:     string;
  milestone?:  string;
  urgency?:    'critical' | 'high' | 'medium' | 'low';
  [key: string]: unknown;
}

// ─── Intelligence config ──────────────────────────────────────────────────────

/** Minimum ms between firings of the same category (0 = no cooldown). */
export const NOTIF_COOLDOWNS: Record<NotifCategory, number> = {
  deadline:              0,
  settlement_delay:      14 * 86_400_000,
  overdue_escalation:    48 *  3_600_000,
  weekly_briefing:        6 * 86_400_000,
  activation_reminder:    2 * 86_400_000,
  inactivity:             7 * 86_400_000,
  milestone_celebration:  0,
};

export const DAILY_NOTIF_MAX   = 3;   // max smart reminders in a rolling 24h window
export const INACTIVITY_DAYS   = 7;   // days without open → inactivity reminder
export const QUIET_HOUR_START  = 22;  // 10 pm
export const QUIET_HOUR_END    = 8;   // 8 am

// ─── Storage keys ─────────────────────────────────────────────────────────────

export const COOLDOWN_KEY    = 'notif_cooldown_v1';   // Record<category, lastFiredISO>
export const FATIGUE_KEY     = 'notif_fatigue_v1';    // { date: YYYY-MM-DD, count: number }
export const SMART_IDS_KEY   = 'notif_smart_ids_v1'; // Record<smartKey, notifId>
export const LAST_ACTIVE_KEY = 'last_active_v1';      // ISO timestamp of last app open

// ─── Analytics event types ────────────────────────────────────────────────────

export type NotifAnalyticsEventType =
  | 'notification_scheduled'
  | 'notification_opened'
  | 'notification_dismissed'
  | 'notification_actioned';

export interface NotifAnalyticsEvent {
  type:     NotifAnalyticsEventType;
  category: NotifCategory | 'unknown';
  ts:       string;
  metadata?: Record<string, string | number | boolean>;
}
