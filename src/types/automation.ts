export type TriggerType =
  | 'deal_stale'
  | 'settlement_delayed'
  | 'inquiry_unread_duration'
  | 'upload_deadline_proximity'
  | 'brand_reengagement'
  | 'upload_cluster_warning';

export type RecommendationType =
  | 'stale_deal_followup'
  | 'settlement_request'
  | 'inquiry_response'
  | 'brand_reengagement'
  | 'upload_cluster_warning'
  | 'settlement_risk';

export interface SmartRecommendation {
  id: string;
  type: RecommendationType;
  title: string;
  body: string;
  cta: string;
  priority: 'critical' | 'high' | 'medium';
  entityId?: string;
  entityType?: 'deal' | 'brand' | 'inquiry';
  navigateTo?: 'deals' | 'revenue' | 'inquiries' | 'calendar' | 'brands';
  generatedAt: string;
  expiresAt: string;
  isActioned: boolean;
}

export interface AutomationState {
  /** key: ruleId_entityId → last fired ISO timestamp */
  executions: Record<string, string>;
}
