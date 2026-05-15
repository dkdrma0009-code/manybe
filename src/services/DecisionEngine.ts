// Pure computation — stateless, no async.

export interface DealForDecision {
  id: string;
  brand: string;
  title: string;
  status: string;
  end_date: string | null;
  amount: number;
  created_at: string;
  updated_at?: string | null;
}

export interface InquiryForDecision {
  id: string;
  brand_name: string;
  created_at: string;
  is_read: boolean;
}

export interface FocusItem {
  id: string;
  icon: string;
  urgency: 'critical' | 'high' | 'medium';
  title: string;
  subtitle: string;
  explanation: string;
  dataReason: string;
  expectedOutcome: string;
  score: number;
  cta: string;
  navigateTo: 'deals' | 'revenue' | 'inquiries' | 'calendar';
  dealId?: string;
}

// ─── Priority scoring ─────────────────────────────────────────────────────────

interface ScoreFactors {
  urgency: number;           // 0–40
  revenueImpact: number;     // 0–30
  relationshipValue: number; // 0–20
  riskLevel: number;         // 0–10
}

function score(f: ScoreFactors): number {
  return f.urgency + f.revenueImpact + f.relationshipValue + f.riskLevel;
}

function fmtKRW(n: number): string {
  if (n >= 10_000) return `${Math.floor(n / 10_000)}만원`;
  return n.toLocaleString('ko-KR') + '원';
}

// ─── Engine ───────────────────────────────────────────────────────────────────

export function computeFocusItems(
  deals: DealForDecision[],
  inquiries: InquiryForDecision[],
): FocusItem[] {
  const items: FocusItem[] = [];
  const now       = Date.now();
  const todayStr  = new Date().toISOString().split('T')[0];
  const active    = deals.filter((d) => d.status !== 'settled');
  const settled   = deals.filter((d) => d.status === 'settled');
  const avgAmount = active.length > 0
    ? active.reduce((s, d) => s + d.amount, 0) / active.length : 0;

  // Settled counts per brand (relationship value proxy)
  const brandSettled = new Map<string, number>();
  for (const d of settled) brandSettled.set(d.brand, (brandSettled.get(d.brand) ?? 0) + 1);

  const revFactor = (amount: number) =>
    Math.round(Math.min((amount / Math.max(avgAmount, 1)) * 25, 30));
  const relFactor = (brand: string) => {
    const n = brandSettled.get(brand) ?? 0;
    return n >= 3 ? 20 : n >= 2 ? 15 : n >= 1 ? 10 : 5;
  };

  // ── Overdue deals ─────────────────────────────────────────────────────────
  for (const deal of active) {
    if (!deal.end_date || deal.end_date >= todayStr) continue;
    const daysOver = Math.floor((now - new Date(deal.end_date).getTime()) / 86_400_000);
    items.push({
      id: `focus_overdue_${deal.id}`,
      icon: '🔴',
      urgency: 'critical',
      title: `${deal.brand} 마감 D+${daysOver}`,
      subtitle: deal.title,
      explanation: `마감일이 ${daysOver}일 지났어요. 빠른 처리가 브랜드 신뢰도를 보호합니다.`,
      dataReason: `마감일 ${deal.end_date} · 현재 상태 ${deal.status}`,
      expectedOutcome: '브랜드 신뢰도 유지 + 정산 지연 예방',
      score: score({ urgency: Math.min(40, 28 + daysOver * 2), revenueImpact: revFactor(deal.amount), relationshipValue: relFactor(deal.brand), riskLevel: daysOver > 7 ? 10 : 7 }),
      cta: '상태 업데이트',
      navigateTo: 'deals',
      dealId: deal.id,
    });
  }

  // ── Today deadlines ───────────────────────────────────────────────────────
  for (const deal of active) {
    if (deal.end_date !== todayStr) continue;
    items.push({
      id: `focus_today_${deal.id}`,
      icon: '⏰',
      urgency: 'critical',
      title: `${deal.brand} 오늘 마감`,
      subtitle: deal.title,
      explanation: '오늘이 마감일이에요. 업로드 완료 상태로 업데이트하고 콘텐츠를 확인하세요.',
      dataReason: `마감일 ${deal.end_date} · 현재 ${deal.status}`,
      expectedOutcome: '정시 납품 + 브랜드 신뢰도 확보',
      score: score({ urgency: 36, revenueImpact: revFactor(deal.amount), relationshipValue: relFactor(deal.brand), riskLevel: 8 }),
      cta: '상태 이동',
      navigateTo: 'deals',
      dealId: deal.id,
    });
  }

  // ── Settlement delays ─────────────────────────────────────────────────────
  for (const deal of active) {
    if (deal.status !== 'uploaded') continue;
    const days = Math.floor((now - new Date(deal.created_at).getTime()) / 86_400_000);
    if (days < 14) continue;
    items.push({
      id: `focus_settle_${deal.id}`,
      icon: '💳',
      urgency: days > 30 ? 'critical' : 'high',
      title: `${deal.brand} 정산 ${days}일째`,
      subtitle: deal.amount > 0 ? `${fmtKRW(deal.amount)} 미수령` : '금액 미정',
      explanation: `업로드 완료 후 ${days}일이 지났어요. 지금이 정산 요청 타이밍입니다.`,
      dataReason: `업로드일 ${deal.created_at.split('T')[0]} · 금액 ${deal.amount > 0 ? fmtKRW(deal.amount) : '미정'}`,
      expectedOutcome: deal.amount > 0 ? `${fmtKRW(deal.amount)} 수령` : '정산 절차 개시',
      score: score({ urgency: Math.min(38, 18 + Math.floor(days / 3)), revenueImpact: Math.round(revFactor(deal.amount) * 1.2), relationshipValue: relFactor(deal.brand), riskLevel: days > 30 ? 10 : 5 }),
      cta: '정산 기록하기',
      navigateTo: 'revenue',
      dealId: deal.id,
    });
  }

  // ── Unread inquiries > 24h ────────────────────────────────────────────────
  for (const inq of inquiries) {
    const hours = (now - new Date(inq.created_at).getTime()) / 3_600_000;
    if (hours < 24) continue;
    const label = hours > 48 ? `${Math.floor(hours / 24)}일` : `${Math.floor(hours)}시간`;
    items.push({
      id: `focus_inq_${inq.id}`,
      icon: '📬',
      urgency: hours > 48 ? 'critical' : 'high',
      title: `${inq.brand_name} 문의 ${label} 미답변`,
      subtitle: '새 협찬 기회를 놓치지 마세요',
      explanation: '24시간 내 응답 시 협찬 전환율이 3배 높아요. 빠른 답변이 신뢰를 만듭니다.',
      dataReason: `문의일 ${inq.created_at.split('T')[0]} · 미답변 ${label}`,
      expectedOutcome: '신규 협찬 전환 가능성 확보',
      score: score({ urgency: Math.min(30, 18 + Math.floor(hours / 12)), revenueImpact: 18, relationshipValue: 10, riskLevel: hours > 72 ? 8 : 4 }),
      cta: '문의 확인',
      navigateTo: 'inquiries',
    });
  }

  // ── Reengagement opportunities (60–180 day sweet spot) ───────────────────
  const activeBrands = new Set(active.map((d) => d.brand));
  const seen = new Set<string>();
  for (const deal of settled) {
    if (activeBrands.has(deal.brand) || seen.has(deal.brand)) continue;
    const days = Math.floor((now - new Date(deal.created_at).getTime()) / 86_400_000);
    if (days < 60 || days > 180) continue;
    seen.add(deal.brand);
    const repeatCount = brandSettled.get(deal.brand) ?? 0;
    items.push({
      id: `focus_reeng_${deal.brand.replace(/\s/g, '_')}`,
      icon: '🤝',
      urgency: 'medium',
      title: `${deal.brand} 재협업 제안 시기`,
      subtitle: `${repeatCount + 1}번째 협업 기회`,
      explanation: `마지막 협찬 ${days}일 후, 지금이 재제안 최적 타이밍이에요. 브랜드가 당신을 기억하는 골든타임입니다.`,
      dataReason: `마지막 협찬 ${deal.created_at.split('T')[0]} · 이전 협업 ${repeatCount}건`,
      expectedOutcome: '장기 파트너십 구축 + 안정적 수익원 확보',
      score: score({ urgency: 15, revenueImpact: revFactor(deal.amount), relationshipValue: relFactor(deal.brand), riskLevel: 0 }),
      cta: '브랜드 히스토리',
      navigateTo: 'deals',
    });
  }

  // Sort by score descending, return top 5
  return items.sort((a, b) => b.score - a.score).slice(0, 5);
}
