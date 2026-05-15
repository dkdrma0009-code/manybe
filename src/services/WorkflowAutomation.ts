// Pure computation — stateless, no async.

export interface DealForAutomation {
  id: string;
  brand: string;
  title: string;
  status: string;
  end_date: string | null;
  amount: number;
  created_at: string;
  updated_at?: string | null;
}

export interface AutoSuggestion {
  dealId: string;
  brand: string;
  currentStatus: string;
  suggestedStatus: string;
  reason: string;
  confidence: 'high' | 'medium';
  triggerCondition: string;
}

export interface FollowUpSuggestion {
  brand: string;
  dealId: string;
  suggestedDate: string; // YYYY-MM-DD
  reason: string;
}

export interface WorkloadBalance {
  isOverloaded: boolean;
  activeCount: number;
  suggestion: string;
  lowValueDealIds: string[];
  schedulingConflicts: Array<{ dealIds: string[]; windowDays: number }>;
}

// ─── Auto status suggestions ──────────────────────────────────────────────────

export function computeAutoSuggestions(deals: DealForAutomation[]): AutoSuggestion[] {
  const suggestions: AutoSuggestion[] = [];
  const now      = Date.now();
  const todayStr = new Date().toISOString().split('T')[0];

  for (const deal of deals) {
    if (deal.status === 'settled') continue;

    // end_date passed + still in active stage → suggest 'uploaded'
    if (
      deal.end_date &&
      deal.end_date < todayStr &&
      ['in_progress', 'reviewing', 'inquiry'].includes(deal.status)
    ) {
      suggestions.push({
        dealId: deal.id,
        brand: deal.brand,
        currentStatus: deal.status,
        suggestedStatus: 'uploaded',
        reason: `마감일(${deal.end_date})이 지났어요. 업로드 완료 상태로 이동하세요.`,
        confidence: 'high',
        triggerCondition: 'end_date_passed',
      });
    }

    // Uploaded > 45 days → suggest settled
    if (deal.status === 'uploaded') {
      const days = Math.floor((now - new Date(deal.created_at).getTime()) / 86_400_000);
      if (days >= 45) {
        suggestions.push({
          dealId: deal.id,
          brand: deal.brand,
          currentStatus: 'uploaded',
          suggestedStatus: 'settled',
          reason: `업로드 완료 후 ${days}일이 지났어요. 정산 완료로 표시하거나 수익을 기록하세요.`,
          confidence: days >= 60 ? 'high' : 'medium',
          triggerCondition: 'long_upload_delay',
        });
      }
    }
  }

  return suggestions;
}

// ─── Follow-up timing ─────────────────────────────────────────────────────────

export function computeFollowUpSuggestions(deals: DealForAutomation[]): FollowUpSuggestion[] {
  const result: FollowUpSuggestion[] = [];
  const now = Date.now();

  for (const deal of deals) {
    if (!['inquiry', 'reviewing'].includes(deal.status)) continue;
    const lastActive = deal.updated_at && deal.updated_at !== deal.created_at
      ? deal.updated_at
      : deal.created_at;
    const days = Math.floor((now - new Date(lastActive).getTime()) / 86_400_000);
    if (days < 5) continue;

    const suggestedDate = new Date(now + 86_400_000).toISOString().split('T')[0];
    result.push({
      brand: deal.brand,
      dealId: deal.id,
      suggestedDate,
      reason: `마지막 활동 ${days}일 전. 내일 팔로업하면 좋아요.`,
    });
  }

  return result;
}

// ─── Workload analysis ────────────────────────────────────────────────────────

export function analyzeWorkload(deals: DealForAutomation[]): WorkloadBalance {
  const active   = deals.filter((d) => d.status !== 'settled');
  const now      = Date.now();
  const avgAmount = active.length > 0
    ? active.reduce((s, d) => s + d.amount, 0) / active.length
    : 0;

  const lowValueDealIds = active
    .filter((d) => d.amount > 0 && d.amount < avgAmount * 0.3)
    .map((d) => d.id);

  // Find scheduling conflicts: 3+ deals ending in a 7-day window
  const upcoming = active
    .filter((d) => d.end_date)
    .map((d) => ({ id: d.id, endMs: new Date(d.end_date!).getTime() }))
    .filter((d) => d.endMs > now && d.endMs < now + 14 * 86_400_000)
    .sort((a, b) => a.endMs - b.endMs);

  const conflicts: WorkloadBalance['schedulingConflicts'] = [];
  if (upcoming.length >= 3) {
    const first = upcoming[0].endMs;
    const last  = upcoming[upcoming.length - 1].endMs;
    const windowDays = Math.ceil((last - first) / 86_400_000);
    if (windowDays <= 7) {
      conflicts.push({ dealIds: upcoming.map((d) => d.id), windowDays });
    }
  }

  const isOverloaded = active.length >= 5 || conflicts.length > 0;
  const suggestion   = !isOverloaded
    ? '현재 워크로드가 적정 수준이에요.'
    : active.length >= 5
      ? `동시 진행 ${active.length}건으로 집중력이 분산될 수 있어요. 저수익 협찬의 우선순위를 낮추세요.`
      : '마감 일정이 집중돼 있어요. 캘린더를 정리하거나 일정을 분산시키세요.';

  return { isOverloaded, activeCount: active.length, suggestion, lowValueDealIds, schedulingConflicts: conflicts };
}
