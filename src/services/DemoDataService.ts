import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ChartBar } from '../components/RevenueBarChart';

export type CreatorScale    = 'nano' | 'micro' | 'mid' | 'macro';
export type CreatorPlatform = 'youtube' | 'instagram' | 'tiktok' | 'blog' | 'other';
export type InquiryFreq     = 'none' | '1-2' | '3-5' | 'frequent';

export interface DemoProfile {
  scale:     CreatorScale;
  platform:  CreatorPlatform;
  frequency: InquiryFreq;
}

export interface DemoCoachMessage {
  icon:   string;
  title:  string;
  detail: string;
  color:  string;
}

export interface DemoIntelligence {
  healthScore:      number;
  trend:            'improving' | 'stable';
  chartBars:        ChartBar[];
  projectedRevenue: number;
  topBrand:         string;
  brandCount:       number;
  completionRate:   number;
  aiCoach:          DemoCoachMessage[];
  weeklyWin:        string;
  weeklyChallenge:  string;
}

// ─── Revenue ranges (KRW, per month) ─────────────────────────────────────────

const REVENUE_RANGE: Record<CreatorScale, [number, number]> = {
  nano:  [300_000,  1_500_000],
  micro: [1_500_000, 7_000_000],
  mid:   [7_000_000, 30_000_000],
  macro: [30_000_000, 150_000_000],
};

function lerp(min: number, max: number, t: number): number {
  return Math.round(min + (max - min) * t);
}

// Seeded pseudo-random based on scale string (stable across calls)
function stableRand(seed: string, offset = 0): number {
  let h = offset;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 997;
  return (h % 100) / 100;
}

function monthLabel(monthsAgo: number): string {
  const NAMES = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];
  const d = new Date();
  d.setMonth(d.getMonth() - monthsAgo);
  return NAMES[d.getMonth()];
}

// ─── Demo data generation ─────────────────────────────────────────────────────

export function generateDemoData(profile: DemoProfile): DemoIntelligence {
  const [min, max] = REVENUE_RANGE[profile.scale];
  const base = lerp(min, max, 0.35 + stableRand(profile.scale) * 0.3);

  // 6-month chart with gentle upward trend
  const chartBars: ChartBar[] = [];
  for (let i = 5; i >= 1; i--) {
    const growth = 1 + (5 - i) * 0.06;
    const noise  = 0.85 + stableRand(profile.scale, i) * 0.3;
    chartBars.push({
      label:          monthLabel(i),
      value:          Math.round(base * growth * noise),
      isCurrentMonth: false,
    });
  }
  // Current month (partial)
  chartBars.push({
    label:          monthLabel(0),
    value:          Math.round(base * 1.3 * 0.55),
    isCurrentMonth: true,
  });

  const projectedRevenue = Math.round(base * 1.3);
  const healthScore      = 58 + Math.round(stableRand(profile.scale, 7) * 22); // 58–80
  const completionRate   = 65 + Math.round(stableRand(profile.scale, 3) * 20); // 65–85

  const BRAND_NAMES: Record<CreatorPlatform, string[]> = {
    youtube:   ['삼성전자', '현대자동차', 'LG생활건강'],
    instagram: ['올리브영', '무신사', 'CJ제일제당'],
    tiktok:    ['배달의민족', '쿠팡', '네이버'],
    blog:      ['다이슨', 'SK-II', '에스티로더'],
    other:     ['카카오', '토스', '당근마켓'],
  };
  const brands = BRAND_NAMES[profile.platform];
  const topBrand = brands[Math.floor(stableRand(profile.scale, 2) * brands.length)];

  const brandCountMap: Record<CreatorScale, number> = { nano: 3, micro: 6, mid: 12, macro: 24 };
  const brandCount = brandCountMap[profile.scale];

  const aiCoach: DemoCoachMessage[] = [
    {
      icon:   '✅',
      title:  '협찬 완결률 양호',
      detail: `완결률 ${completionRate}%로 업계 평균 대비 우수합니다.`,
      color:  '#2E8C5D',
    },
    {
      icon:   '🎯',
      title:  '수익 다변화 추천',
      detail: profile.scale === 'nano' || profile.scale === 'micro'
        ? '브랜드 수를 늘리면 수익 안정성이 크게 높아집니다.'
        : '상위 3개 브랜드 의존도를 35% 이하로 낮추는 게 좋습니다.',
      color:  '#6E56F0',
    },
    {
      icon:   '📈',
      title:  '성장 모멘텀 확보',
      detail: '최근 3개월 수익 트렌드가 우상향입니다. 이 흐름을 유지하세요.',
      color:  '#3B6FD9',
    },
  ];

  const weeklyWinMap: Record<CreatorScale, string> = {
    nano:  '이번 주 첫 브랜드 협찬 문의가 도착했어요!',
    micro: `이번 주 ${topBrand} 협찬 정산이 완료되었어요.`,
    mid:   `${topBrand} 재협찬 제안이 들어왔어요. 단가 협상 기회입니다.`,
    macro: '3개 브랜드와 동시 진행 — 파이프라인 최고치를 기록했어요.',
  };

  const weeklyChallengeMap: Record<InquiryFreq, string> = {
    none:     '아직 문의가 없어도 괜찮아요. 미디어 키트를 완성해보세요.',
    '1-2':    '브랜드 응답 속도를 24시간 이내로 유지하면 재문의율이 높아집니다.',
    '3-5':    '현재 협찬 3건이 검토 단계에 머물고 있어요. 빠른 의사결정을 추천합니다.',
    frequent: '문의가 많아질수록 우선순위 관리가 중요해집니다.',
  };

  return {
    healthScore,
    trend: 'improving',
    chartBars,
    projectedRevenue,
    topBrand,
    brandCount,
    completionRate,
    aiCoach,
    weeklyWin:       weeklyWinMap[profile.scale],
    weeklyChallenge: weeklyChallengeMap[profile.frequency],
  };
}

// ─── Profile loader ───────────────────────────────────────────────────────────

const DEFAULT_PROFILE: DemoProfile = {
  scale:     'micro',
  platform:  'youtube',
  frequency: '1-2',
};

export async function loadDemoProfile(): Promise<DemoProfile> {
  try {
    const [scale, platform, frequency] = await Promise.all([
      AsyncStorage.getItem('creator_scale'),
      AsyncStorage.getItem('creator_platform'),
      AsyncStorage.getItem('inquiry_frequency'),
    ]);
    return {
      scale:     (scale as CreatorScale)    ?? DEFAULT_PROFILE.scale,
      platform:  (platform as CreatorPlatform) ?? DEFAULT_PROFILE.platform,
      frequency: (frequency as InquiryFreq) ?? DEFAULT_PROFILE.frequency,
    };
  } catch {
    return DEFAULT_PROFILE;
  }
}
