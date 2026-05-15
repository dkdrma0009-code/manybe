export type TimelineEventType =
  | 'overdue'
  | 'deadline_today'
  | 'deadline_week'
  | 'settlement_delay'
  | 'settlement_completed'
  | 'inquiry_received'
  | 'deal_created'
  | 'schedule_today';

export type TimelineSeverity = 'critical' | 'warning' | 'info' | 'success';

export type TimelineNavTarget =
  | { screen: 'deals' }
  | { screen: 'inquiries' }
  | { screen: 'calendar' }
  | { screen: 'revenue' }
  | { screen: 'BrandDetail'; brand: string };

export interface TimelineItem {
  id: string;
  type: TimelineEventType;
  severity: TimelineSeverity;
  title: string;
  subtitle: string;
  /** ISO timestamp — used for grouping and sorting */
  timestamp: string;
  icon: string;
  color: string;
  bg: string;
  entityId?: string;
  entityType?: 'deal' | 'inquiry' | 'schedule' | 'revenue';
  navigateTo?: TimelineNavTarget;
  cta?: string;
  isRead: boolean;
}

export interface TimelineGroup {
  label: '오늘' | '이번 주' | '이전';
  items: TimelineItem[];
}

// Severity → visual priority for sort ordering
export const SEVERITY_ORDER: Record<TimelineSeverity, number> = {
  critical: 0,
  warning:  1,
  info:     2,
  success:  3,
};
