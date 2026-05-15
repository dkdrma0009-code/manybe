// Detects triggers from live deal/inquiry data, builds workflow chains,
// auto-executes safe actions (notifications, event emissions), and queues
// risky actions for approval. All actions are idempotency-keyed so the engine
// can run on every foreground resume without double-firing.

import * as Notifications from 'expo-notifications';
import { AutomationDeal, AutomationInquiry } from './AutomationEngine';
import { AutonomousAction, ActionChain, ChainExecutionResult } from '../types/autonomous';
import { isAlreadyExecuted, markAsExecuted, enqueueForApproval, pruneStaleActions } from './ActionQueue';
import { recordEvent } from './OperationalMemory';
import { EventBus } from './EventBus';

// ─── Action scoring ───────────────────────────────────────────────────────────

function scoreAction(type: AutonomousAction['type']): Pick<AutonomousAction, 'confidence' | 'risk' | 'requiresApproval'> {
  switch (type) {
    case 'schedule_reminder':         return { confidence: 90, risk: 'none', requiresApproval: false };
    case 'suppress_notification':     return { confidence: 95, risk: 'none', requiresApproval: false };
    case 'draft_followup_message':    return { confidence: 75, risk: 'low',  requiresApproval: true };
    case 'draft_settlement_request':  return { confidence: 80, risk: 'low',  requiresApproval: true };
    case 'draft_inquiry_response':    return { confidence: 70, risk: 'low',  requiresApproval: true };
    case 'draft_reengagement_pitch':  return { confidence: 65, risk: 'low',  requiresApproval: true };
    case 'escalate_overdue':          return { confidence: 85, risk: 'low',  requiresApproval: false };
    case 'suggest_calendar_adjust':   return { confidence: 70, risk: 'low',  requiresApproval: false };
    default:                          return { confidence: 60, risk: 'medium', requiresApproval: true };
  }
}

// ─── Action factory ───────────────────────────────────────────────────────────

function makeAction(
  chainId: string,
  step: number,
  type: AutonomousAction['type'],
  entityId: string,
  entityType: AutonomousAction['entityType'],
  payload: Record<string, string | number | boolean>,
): AutonomousAction {
  const key = `${chainId}_s${step}`;
  return {
    id: key,
    type,
    entityId,
    entityType,
    payload,
    ...scoreAction(type),
    idempotencyKey: key,
    chainId,
    chainStep: step,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
}

// ─── Side-effect executors ────────────────────────────────────────────────────

async function executeAction(action: AutonomousAction): Promise<boolean> {
  try {
    switch (action.type) {
      case 'schedule_reminder':
        await Notifications.scheduleNotificationAsync({
          content: {
            title: String(action.payload.title),
            body:  String(action.payload.body),
            data:  { entityId: action.entityId, type: 'autonomous_reminder' },
          },
          trigger: { seconds: Number(action.payload.delaySeconds) || 3600, type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL },
        });
        break;
      case 'escalate_overdue':
        EventBus.emit('deal:escalated', {
          dealId:    action.entityId ?? '',
          brand:     String(action.payload.brand),
          daysSince: Number(action.payload.daysSince),
        });
        break;
      default:
        EventBus.emit('autonomous:action_executed', { type: action.type, entityId: action.entityId ?? '' });
        break;
    }
    await markAsExecuted(action.idempotencyKey);
    await recordEvent('automation_fired', {
      entityId: action.entityId,
      metadata: { actionType: action.type },
    });
    return true;
  } catch {
    return false;
  }
}

// ─── Chain executor ───────────────────────────────────────────────────────────

async function executeChain(chain: ActionChain): Promise<ChainExecutionResult> {
  let executedCount   = 0;
  let pendingApproval = 0;
  let skippedCount    = 0;

  for (const action of chain.steps) {
    if (await isAlreadyExecuted(action.idempotencyKey)) {
      skippedCount++;
      continue;
    }
    if (action.requiresApproval) {
      await enqueueForApproval(action);
      pendingApproval++;
    } else {
      const ok = await executeAction(action);
      if (ok) executedCount++;
      else skippedCount++;
    }
  }

  const status: ActionChain['status'] =
    pendingApproval > 0 ? 'awaiting_approval' :
    executedCount   > 0 ? 'completed' : 'running';

  return { chain: { ...chain, status }, executedCount, pendingApproval, skippedCount };
}

// ─── Chain builders ───────────────────────────────────────────────────────────

function buildStaleDealChain(deal: AutomationDeal, daysSince: number): ActionChain {
  const chainId = `stale_deal_chain_${deal.id}`;
  const steps: AutonomousAction[] = [
    makeAction(chainId, 1, 'schedule_reminder', deal.id, 'deal', {
      title: `${deal.brand} 협찬 팔로업 알림`,
      body:  `${daysSince}일째 진행이 없어요. 상태를 업데이트하거나 브랜드에 확인하세요.`,
      delaySeconds: 3600,
    }),
    makeAction(chainId, 2, 'draft_followup_message', deal.id, 'deal', {
      brand: deal.brand,
      draft: `안녕하세요, ${deal.brand} 담당자님. ${deal.title} 협찬 진행 상황을 확인하고 싶어 연락드립니다.`,
    }),
  ];

  if (daysSince > 14) {
    steps.push(makeAction(chainId, 3, 'escalate_overdue', deal.id, 'deal', {
      brand:     deal.brand,
      daysSince,
      message:   `${daysSince}일 정체 — 에스컬레이션 필요`,
    }));
  }

  return { id: chainId, trigger: 'stale_deal', triggerEntityId: deal.id, steps, status: 'running', startedAt: new Date().toISOString() };
}

function buildUnreadInquiryChain(inquiry: AutomationInquiry, hoursOld: number): ActionChain {
  const chainId = `unread_inq_chain_${inquiry.id}`;
  const steps: AutonomousAction[] = [
    makeAction(chainId, 1, 'schedule_reminder', inquiry.id, 'inquiry', {
      title: `${inquiry.brand_name} 미답변 문의`,
      body:  `${Math.floor(hoursOld)}시간 동안 답변이 없어요. 지금 확인하세요.`,
      delaySeconds: 1800,
    }),
  ];

  if (hoursOld > 48) {
    steps.push(makeAction(chainId, 2, 'escalate_overdue', inquiry.id, 'inquiry', {
      brand:     inquiry.brand_name,
      daysSince: Math.floor(hoursOld / 24),
      message:   '2일 이상 미답변 — 브랜드 관계 위험',
    }));
  }

  return { id: chainId, trigger: 'unread_inquiry', triggerEntityId: inquiry.id, steps, status: 'running', startedAt: new Date().toISOString() };
}

function buildSettlementRequestChain(deal: AutomationDeal, daysSinceUpload: number): ActionChain {
  const chainId = `settlement_chain_${deal.id}`;
  const steps: AutonomousAction[] = [
    makeAction(chainId, 1, 'draft_settlement_request', deal.id, 'deal', {
      brand: deal.brand,
      title: deal.title,
      daysSinceUpload,
      amount: deal.amount,
    }),
  ];
  return { id: chainId, trigger: 'settlement_delayed', triggerEntityId: deal.id, steps, status: 'running', startedAt: new Date().toISOString() };
}

function buildUploadClusterChain(dealIds: string[], count: number): ActionChain {
  const chainId = `upload_cluster_${dealIds.slice(0, 3).join('_')}`;
  const steps: AutonomousAction[] = [
    makeAction(chainId, 1, 'suggest_calendar_adjust', dealIds[0], 'deal', {
      affectedCount: count,
      message:       `2주 안에 ${count}건의 마감이 몰려있어요. 캘린더를 조정하세요.`,
    }),
    makeAction(chainId, 2, 'schedule_reminder', dealIds[0], 'deal', {
      title:        '마감 일정 분산 필요',
      body:         `${count}개 협찬 마감이 2주 안에 집중돼 있어요. 지금 캘린더를 확인하세요.`,
      delaySeconds: 7200,
    }),
  ];
  return { id: chainId, trigger: 'upload_cluster', steps, status: 'running', startedAt: new Date().toISOString() };
}

// ─── Main engine ──────────────────────────────────────────────────────────────

export async function runAutonomousEngine(
  _userId: string,
  deals: AutomationDeal[],
  inquiries: AutomationInquiry[],
): Promise<{ chains: ActionChain[]; executedCount: number; pendingApproval: number }> {
  // Prune stale queue entries on each run (lightweight maintenance)
  pruneStaleActions().catch(() => {});

  const now         = Date.now();
  const activeDeals = deals.filter((d) => d.status !== 'settled');
  const chains: ActionChain[] = [];
  let executedCount   = 0;
  let pendingApproval = 0;

  // ── Stale deal chains ──────────────────────────────────────────────────────
  for (const deal of activeDeals) {
    const last = deal.updated_at ?? deal.created_at;
    const days = Math.floor((now - new Date(last).getTime()) / 86_400_000);
    if (days < 7) continue;
    const result = await executeChain(buildStaleDealChain(deal, days));
    chains.push(result.chain);
    executedCount   += result.executedCount;
    pendingApproval += result.pendingApproval;
  }

  // ── Settlement request chains (uploaded > 30 days) ────────────────────────
  for (const deal of deals.filter((d) => d.status === 'uploaded')) {
    const daysSince = Math.floor((now - new Date(deal.created_at).getTime()) / 86_400_000);
    if (daysSince < 30) continue;
    const result = await executeChain(buildSettlementRequestChain(deal, daysSince));
    chains.push(result.chain);
    executedCount   += result.executedCount;
    pendingApproval += result.pendingApproval;
  }

  // ── Unread inquiry chains ──────────────────────────────────────────────────
  for (const inquiry of inquiries) {
    if (inquiry.is_read) continue;
    const hours = (now - new Date(inquiry.created_at).getTime()) / 3_600_000;
    if (hours < 24) continue;
    const result = await executeChain(buildUnreadInquiryChain(inquiry, hours));
    chains.push(result.chain);
    executedCount   += result.executedCount;
    pendingApproval += result.pendingApproval;
  }

  // ── Upload cluster chain ───────────────────────────────────────────────────
  const upcoming = activeDeals.filter((d) => {
    if (!d.end_date) return false;
    const ms = new Date(d.end_date).getTime();
    return ms > now && ms < now + 14 * 86_400_000;
  });
  if (upcoming.length >= 3) {
    const result = await executeChain(buildUploadClusterChain(upcoming.map((d) => d.id), upcoming.length));
    chains.push(result.chain);
    executedCount   += result.executedCount;
    pendingApproval += result.pendingApproval;
  }

  return { chains, executedCount, pendingApproval };
}
