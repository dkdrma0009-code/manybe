export type AppEventType =
  | 'deal:status_changed'
  | 'deal:overdue_detected'
  | 'deal:deadline_approaching'
  | 'deal:stale_detected'
  | 'deal:created'
  | 'settlement:delayed'
  | 'settlement:completed'
  | 'inquiry:received'
  | 'inquiry:unread_overtime'
  | 'brand:repeat_opportunity'
  | 'automation:recommendation_generated'
  | 'mutation:queued'
  | 'mutation:processed'
  | 'subscription:reconnected'
  | 'subscription:error';

export interface AppEvent<T = unknown> {
  type: AppEventType;
  payload: T;
  timestamp: string;
  source: 'user' | 'system' | 'realtime';
}

export interface DealStatusChangedPayload {
  dealId: string;
  brand: string;
  fromStatus: string;
  toStatus: string;
}

export interface DealOverduePayload {
  dealId: string;
  brand: string;
  daysOverdue: number;
}

export interface SettlementDelayedPayload {
  dealId: string;
  brand: string;
  daysSinceUpload: number;
}

export interface InquiryReceivedPayload {
  inquiryId: string;
  brandName: string;
}

export interface RecommendationGeneratedPayload {
  recommendationId: string;
  type: string;
  priority: string;
}
