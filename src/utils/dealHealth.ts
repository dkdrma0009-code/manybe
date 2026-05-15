import { BrandStats } from '../hooks/useBrandHistory';

export type HealthLevel = 'healthy' | 'attention' | 'overdue' | 'risky';

export interface DealHealthResult {
  level: HealthLevel;
  label: string;
  emoji: string;
  color: string;
  bg: string;
  insights: string[];
}

export interface DealHealthInput {
  status: string;
  endDate: string | null | undefined;
  amount: number;
  createdAt: string;
}

const LEVEL_CONFIG: Record<HealthLevel, Omit<DealHealthResult, 'level' | 'insights'>> = {
  healthy:   { label: '안정적',   emoji: '🟢', color: '#2E8C5D', bg: '#DEEFE5' },
  attention: { label: '주의 필요', emoji: '🟡', color: '#C68318', bg: '#FBF1DC' },
  overdue:   { label: '기한 초과', emoji: '🔴', color: '#C13C3C', bg: '#FBE5E5' },
  risky:     { label: '지연 위험', emoji: '⚠️', color: '#EA580C', bg: '#FFF1E8' },
};

export function computeDealHealth(
  input: DealHealthInput,
  brandStats?: BrandStats | null,
): DealHealthResult {
  const { status, endDate, amount, createdAt } = input;

  if (status === 'settled') {
    return { level: 'healthy', ...LEVEL_CONFIG.healthy, insights: [] };
  }

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const daysSinceCreated = Math.floor((now.getTime() - new Date(createdAt).getTime()) / 86400000);

  const endDateStr = endDate?.slice(0, 10) ?? null;
  const daysUntilDeadline = endDateStr !== null
    ? Math.ceil((new Date(endDateStr).getTime() - new Date(todayStr).getTime()) / 86400000)
    : null;
  const isOverdue = daysUntilDeadline !== null && daysUntilDeadline < 0;
  const daysOverdue = isOverdue ? Math.abs(daysUntilDeadline!) : 0;

  // Settlement delay proxy: days since deal was created (no uploaded_at in schema)
  const isLongUploaded = status === 'uploaded' && daysSinceCreated > 30;
  const isMediumUploaded = status === 'uploaded' && daysSinceCreated > 14;
  const brandHasSlowSettlement = brandStats?.hasStaleUploaded ?? false;

  let level: HealthLevel = 'healthy';

  if (isOverdue) {
    level = 'overdue';
  } else if (isLongUploaded || (isMediumUploaded && brandHasSlowSettlement)) {
    level = 'risky';
  } else if (
    (daysUntilDeadline !== null && daysUntilDeadline <= 7) ||
    isMediumUploaded ||
    amount >= 1_000_000
  ) {
    level = 'attention';
  }

  const insights: string[] = [];

  // Deadline insights
  if (isOverdue) {
    insights.push(`마감일이 ${daysOverdue}일 지났어요`);
  } else if (daysUntilDeadline !== null) {
    if (daysUntilDeadline === 0) insights.push('오늘이 마감일이에요');
    else if (daysUntilDeadline <= 3) insights.push(`업로드 마감이 임박했어요 · D-${daysUntilDeadline}`);
    else if (daysUntilDeadline <= 7) insights.push(`마감까지 ${daysUntilDeadline}일 남았어요`);
  }

  // Settlement delay insights
  if (status === 'uploaded') {
    if (daysSinceCreated > 14) {
      insights.push(`업로드 후 ${daysSinceCreated}일째 정산 대기 중이에요`);
    }
    if (brandHasSlowSettlement) {
      insights.push('이 브랜드는 정산이 늦어지는 경향이 있어요');
    }
  }

  // Amount insight
  if (amount >= 1_000_000) {
    insights.push('고액 협찬이에요 · 정산까지 꼼꼼히 관리하세요');
  }

  // Brand relationship insights
  if (brandStats) {
    if (brandStats.totalCount >= 3 && brandStats.completionRate >= 80 && !brandHasSlowSettlement) {
      insights.push('이 브랜드는 정산이 빠른 편이에요');
    } else if (brandStats.totalCount >= 2 && !brandHasSlowSettlement && level === 'healthy') {
      insights.push('이전 협찬도 모두 문제없이 완료됐어요');
    }
    if (brandStats.relationshipLevel === 'new') {
      insights.push('첫 번째 협업이에요 · 계약 조건을 꼭 확인하세요');
    }
    if (brandStats.totalCount >= 2 && brandStats.totalCount < 4 && level === 'healthy') {
      insights.push(`이 브랜드와 ${brandStats.totalCount}번째 협업이에요`);
    }
  }

  return { level, ...LEVEL_CONFIG[level], insights };
}

// Lightweight version without brand stats — for list-level computation in hooks
export function computeDealHealthSimple(input: DealHealthInput): HealthLevel {
  return computeDealHealth(input).level;
}
