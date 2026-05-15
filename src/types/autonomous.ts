export type ActionType =
  | 'schedule_reminder'
  | 'suppress_notification'
  | 'draft_followup_message'
  | 'draft_settlement_request'
  | 'draft_inquiry_response'
  | 'draft_reengagement_pitch'
  | 'escalate_overdue'
  | 'suggest_calendar_adjust';

export type RiskLevel = 'none' | 'low' | 'medium' | 'high';
export type BriefingMode = 'critical' | 'stable' | 'growth';

export interface AutonomousAction {
  id: string;
  type: ActionType;
  entityId?: string;
  entityType?: 'deal' | 'inquiry' | 'brand';
  payload: Record<string, string | number | boolean>;
  confidence: number;
  risk: RiskLevel;
  requiresApproval: boolean;
  idempotencyKey: string;
  chainId?: string;
  chainStep?: number;
  status: 'pending' | 'approved' | 'executed' | 'rejected' | 'failed';
  createdAt: string;
  executedAt?: string;
}

export interface ActionChain {
  id: string;
  trigger: string;
  triggerEntityId?: string;
  steps: AutonomousAction[];
  status: 'running' | 'completed' | 'failed' | 'awaiting_approval';
  startedAt: string;
}

export interface ChainExecutionResult {
  chain: ActionChain;
  executedCount: number;
  pendingApproval: number;
  skippedCount: number;
}

export interface BriefingItem {
  priority: number;
  text: string;
  navigateTo?: string;
  urgency: 'critical' | 'normal';
}

export interface BriefingRisk {
  type: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
}

export interface MorningBriefing {
  date: string;
  mode: BriefingMode;
  headline: string;
  subheadline: string;
  priorities: BriefingItem[];
  risks: BriefingRisk[];
  revenueInsight: string;
  brandAlert?: string;
  generatedAt: string;
}

export interface WeeklyReview {
  weekStart: string;
  topBrand: string;
  topBrandRevenue: number;
  overdueCount: number;
  completionRate: number;
  burnoutRisk: boolean;
  aiSummary: string;
  actionableInsight: string;
}
