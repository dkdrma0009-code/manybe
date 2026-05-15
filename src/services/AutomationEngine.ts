import AsyncStorage from '@react-native-async-storage/async-storage';
import { SmartRecommendation, AutomationState, RecommendationType } from '../types/automation';
import { EventBus } from './EventBus';

const STATE_KEY = 'automation_state_v1';
const RECS_KEY  = 'automation_recs_v1';
const REC_TTL_MS = 3 * 24 * 60 * 60 * 1000; // 3 days

// ─── Data shapes (minimal, engine-internal) ───────────────────────────────────

export interface AutomationDeal {
  id: string;
  brand: string;
  title: string;
  status: string;
  end_date: string | null;
  amount: number;
  created_at: string;
  updated_at?: string | null;
}

export interface AutomationInquiry {
  id: string;
  brand_name: string;
  created_at: string;
  is_read: boolean;
}

// ─── State persistence ────────────────────────────────────────────────────────

async function loadState(): Promise<AutomationState> {
  try {
    const raw = await AsyncStorage.getItem(STATE_KEY);
    return raw ? JSON.parse(raw) : { executions: {} };
  } catch { return { executions: {} }; }
}

async function saveState(state: AutomationState): Promise<void> {
  try { await AsyncStorage.setItem(STATE_KEY, JSON.stringify(state)); } catch {}
}

// ─── Recommendation persistence ───────────────────────────────────────────────

async function loadRecs(): Promise<SmartRecommendation[]> {
  try {
    const raw = await AsyncStorage.getItem(RECS_KEY);
    if (!raw) return [];
    const all: SmartRecommendation[] = JSON.parse(raw);
    const now = Date.now();
    return all.filter((r) => !r.isActioned && new Date(r.expiresAt).getTime() > now);
  } catch { return []; }
}

async function saveRecs(recs: SmartRecommendation[]): Promise<void> {
  try { await AsyncStorage.setItem(RECS_KEY, JSON.stringify(recs)); } catch {}
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isCooledDown(state: AutomationState, key: string, cooldownHours: number): boolean {
  const last = state.executions[key];
  if (!last) return false;
  return Date.now() - new Date(last).getTime() < cooldownHours * 3_600_000;
}

function markExecuted(state: AutomationState, key: string): void {
  state.executions[key] = new Date().toISOString();
}

function makeRec(
  id: string,
  type: RecommendationType,
  title: string,
  body: string,
  cta: string,
  priority: SmartRecommendation['priority'],
  opts: Partial<SmartRecommendation> = {},
): SmartRecommendation {
  return {
    id, type, title, body, cta, priority,
    generatedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + REC_TTL_MS).toISOString(),
    isActioned: false,
    ...opts,
  };
}

// ─── Decay: reduce priority of old unactioned recommendations ────────────────

function applyDecay(recs: SmartRecommendation[]): SmartRecommendation[] {
  const now = Date.now();
  return recs.map((r) => {
    const ageHours = (now - new Date(r.generatedAt).getTime()) / 3_600_000;
    if (ageHours < 48) return r;
    if (r.priority === 'critical' && ageHours >= 48) return { ...r, priority: 'high' as const };
    if (r.priority === 'high'     && ageHours >= 72) return { ...r, priority: 'medium' as const };
    return r;
  });
}

// ─── Engine ───────────────────────────────────────────────────────────────────

export async function runAutomation(
  _userId: string,
  deals: AutomationDeal[],
  inquiries: AutomationInquiry[],
): Promise<SmartRecommendation[]> {
  const state   = await loadState();
  const existing = await loadRecs();
  const now     = Date.now();
  const newRecs: SmartRecommendation[] = [];

  const activeDeals  = deals.filter((d) => d.status !== 'settled');
  const settledDeals = deals.filter((d) => d.status === 'settled');

  // ── Rule 1: Stale deal (no activity > 7 days in non-terminal status) ────────
  const STATUS_KO: Record<string, string> = {
    inquiry: '문의', reviewing: '검토 중', in_progress: '진행 중', uploaded: '업로드 완료',
  };
  for (const deal of activeDeals) {
    const lastActive = (deal.updated_at && deal.updated_at !== deal.created_at)
      ? deal.updated_at
      : deal.created_at;
    const daysSince = Math.floor((now - new Date(lastActive).getTime()) / 86_400_000);
    if (daysSince < 7) continue;
    const key = `stale_deal_${deal.id}`;
    if (isCooledDown(state, key, 48)) continue;

    const statusLabel = STATUS_KO[deal.status] ?? deal.status;
    newRecs.push(makeRec(
      key, 'stale_deal_followup',
      `${deal.brand} 협찬이 ${daysSince}일째 멈춰있어요`,
      `"${statusLabel}" 단계에서 진전이 없어요. 상태를 업데이트하거나 브랜드에 확인하세요.`,
      '상태 업데이트',
      daysSince > 14 ? 'critical' : 'high',
      { entityId: deal.id, entityType: 'deal', navigateTo: 'deals' },
    ));
    markExecuted(state, key);
    EventBus.emit('deal:stale_detected', { dealId: deal.id, brand: deal.brand, daysSince });
  }

  // ── Rule 2: Settlement request (uploaded > 14 days) ───────────────────────
  for (const deal of activeDeals) {
    if (deal.status !== 'uploaded') continue;
    const daysSince = Math.floor((now - new Date(deal.created_at).getTime()) / 86_400_000);
    if (daysSince < 14) continue;
    const key = `settlement_request_${deal.id}`;
    if (isCooledDown(state, key, 72)) continue;

    newRecs.push(makeRec(
      key, 'settlement_request',
      `${deal.brand} 정산 요청이 필요해요`,
      `업로드 완료 후 ${daysSince}일이 지났어요. 정산 절차를 시작하세요.`,
      '정산 요청하기',
      daysSince > 30 ? 'critical' : 'high',
      { entityId: deal.id, entityType: 'deal', navigateTo: 'revenue' },
    ));
    markExecuted(state, key);
    EventBus.emit('settlement:delayed', { dealId: deal.id, brand: deal.brand, daysSinceUpload: daysSince });
  }

  // ── Rule 3: Inquiry unread > 24 hours ─────────────────────────────────────
  for (const inquiry of inquiries) {
    if (inquiry.is_read) continue;
    const hoursOld = (now - new Date(inquiry.created_at).getTime()) / 3_600_000;
    if (hoursOld < 24) continue;
    const key = `inquiry_response_${inquiry.id}`;
    if (isCooledDown(state, key, 24)) continue;

    const ageLabel = hoursOld > 48 ? `${Math.floor(hoursOld / 24)}일` : `${Math.floor(hoursOld)}시간`;
    newRecs.push(makeRec(
      key, 'inquiry_response',
      `${inquiry.brand_name} 문의 미답변 ${ageLabel}`,
      '빠른 응답이 협찬 성사 가능성을 높여요. 지금 확인하세요.',
      '문의 확인하기',
      hoursOld > 48 ? 'critical' : 'high',
      { entityId: inquiry.id, entityType: 'inquiry', navigateTo: 'inquiries' },
    ));
    markExecuted(state, key);
    EventBus.emit('inquiry:unread_overtime', { inquiryId: inquiry.id, brandName: inquiry.brand_name });
  }

  // ── Rule 4: Brand reengagement (settled 60–365 days ago, no active deal) ──
  const activeBrands   = new Set(activeDeals.map((d) => d.brand));
  const processedBrands = new Set<string>();
  for (const deal of settledDeals) {
    if (activeBrands.has(deal.brand)) continue;
    if (processedBrands.has(deal.brand)) continue;
    const daysSince = Math.floor((now - new Date(deal.created_at).getTime()) / 86_400_000);
    if (daysSince < 60 || daysSince > 365) continue;
    processedBrands.add(deal.brand);

    const key = `brand_reengagement_${deal.brand.replace(/\s+/g, '_')}`;
    if (isCooledDown(state, key, 168)) continue; // 7 days

    newRecs.push(makeRec(
      key, 'brand_reengagement',
      `${deal.brand} 재협업 기회예요`,
      `마지막 협찬 이후 ${daysSince}일이 지났어요. 다시 협업을 제안해보세요.`,
      '브랜드 히스토리 보기',
      'medium',
      { entityType: 'brand', navigateTo: 'deals' },
    ));
    markExecuted(state, key);
    EventBus.emit('brand:repeat_opportunity', { brand: deal.brand, daysSince });
  }

  // ── Rule 5: Upload cluster (3+ active deals with end_date in same 14-day window) ──
  const upcoming = activeDeals
    .filter((d) => d.end_date)
    .map((d) => ({ ...d, endMs: new Date(d.end_date!).getTime() }))
    .filter((d) => d.endMs > now && d.endMs < now + 14 * 86_400_000)
    .sort((a, b) => a.endMs - b.endMs);

  if (upcoming.length >= 3) {
    const key = 'upload_cluster_warning';
    if (!isCooledDown(state, key, 48)) {
      newRecs.push(makeRec(
        key, 'upload_cluster_warning',
        `2주 안에 마감 ${upcoming.length}건이 몰려있어요`,
        '업로드 일정이 겹치면 품질이 떨어질 수 있어요. 미리 준비하거나 일정을 조정하세요.',
        '캘린더 확인',
        'medium',
        { navigateTo: 'calendar' },
      ));
      markExecuted(state, key);
    }
  }

  // ── Merge: deduplicate by id, filter actioned/expired ────────────────────
  const existingIds = new Set(existing.map((r) => r.id));
  const merged = applyDecay([
    ...existing,
    ...newRecs.filter((r) => !existingIds.has(r.id)),
  ]);

  // Prune stale execution timestamps > 30 days old to keep state lean
  const cutoff = new Date(Date.now() - 30 * 86_400_000).toISOString();
  for (const key of Object.keys(state.executions)) {
    if (state.executions[key] < cutoff) delete state.executions[key];
  }

  await saveRecs(merged);
  await saveState(state);

  const PRIORITY_ORDER: Record<SmartRecommendation['priority'], number> = { critical: 0, high: 1, medium: 2 };
  return merged.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
}

// ─── Public helpers ───────────────────────────────────────────────────────────

export async function loadRecommendations(): Promise<SmartRecommendation[]> {
  const recs = await loadRecs();
  const PRIORITY_ORDER = { critical: 0, high: 1, medium: 2 };
  return recs.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
}

export async function dismissRecommendation(id: string): Promise<void> {
  const recs = await loadRecs();
  await saveRecs(recs.map((r) => (r.id === id ? { ...r, isActioned: true } : r)));
}

export async function clearAutomationState(): Promise<void> {
  await AsyncStorage.multiRemove([STATE_KEY, RECS_KEY]);
}
