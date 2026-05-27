export type SubscriptionTier = 'free' | 'premium';

export type PremiumFeature =
  | 'ai_coach'
  | 'forecast_intelligence'
  | 'brand_risk'
  | 'revenue_stability'
  | 'trend_intelligence'
  | 'advanced_analytics'
  | 'autonomous_recommendations'
  | 'unlimited_deals'
  | 'channel_analysis';

export interface PremiumFeatureMeta {
  title: string;
  description: string;
  icon: string;
  requiresPremium: boolean;
}

export const PREMIUM_FEATURE_META: Record<PremiumFeature, PremiumFeatureMeta> = {
  ai_coach: {
    title: 'AI 코치 & 주간 리뷰',
    description: '매주 AI가 분석한 코칭 인사이트와 액션 플랜을 받아보세요.',
    icon: '🧠',
    requiresPremium: true,
  },
  forecast_intelligence: {
    title: '예측 인텔리전스',
    description: '다음 달 수익 예측과 불확실성 범위를 확인하세요.',
    icon: '🔮',
    requiresPremium: true,
  },
  brand_risk: {
    title: '브랜드 리스크 분석',
    description: '브랜드 의존도 위험과 다변화 기회를 파악하세요.',
    icon: '🎯',
    requiresPremium: true,
  },
  revenue_stability: {
    title: '수익 안정성 분석',
    description: '수익 변동성과 안정성 점수를 심층 분석합니다.',
    icon: '📈',
    requiresPremium: true,
  },
  trend_intelligence: {
    title: '트렌드 인텔리전스',
    description: '번아웃 위험, 응답 속도, 브랜드 집중도를 추적합니다.',
    icon: '📊',
    requiresPremium: true,
  },
  advanced_analytics: {
    title: 'AI 분석 설명',
    description: 'AI가 헬스 점수를 계산하는 방식과 근거를 확인하세요.',
    icon: '🤖',
    requiresPremium: true,
  },
  autonomous_recommendations: {
    title: 'AI 추천 액션',
    description: 'AI가 우선순위를 정해주는 자동화 추천을 받으세요.',
    icon: '⚡',
    requiresPremium: true,
  },
  unlimited_deals: {
    title: '무제한 협찬 관리',
    description: '협찬 등록 제한 없이 모든 프로젝트를 관리하세요.',
    icon: '🤝',
    requiresPremium: false, // free tier includes this
  },
  channel_analysis: {
    title: '채널 AI 심화분석',
    description: '유튜브 댓글 감성 분석, 타겟 오디언스, 광고 비율을 파악하세요.',
    icon: '📊',
    requiresPremium: true,
  },
};

export interface Product {
  identifier: string;
  title: string;
  description: string;
  priceString: string;
  price: number;
  currencyCode: string;
  period: 'monthly' | 'annual';
}

export interface SubscriptionState {
  tier: SubscriptionTier;
  expiresAt: string | null;
  productId: string | null;
  cachedAt: string;
}

export const DEFAULT_SUB_STATE: SubscriptionState = {
  tier: 'free',
  expiresAt: null,
  productId: null,
  cachedAt: new Date(0).toISOString(),
};

// Product identifiers (must match App Store Connect / Google Play)
export const PRODUCT_IDS = {
  MONTHLY: 'manybe_pro_monthly',
  ANNUAL:  'manybe_pro_annual',
} as const;

// Revenue Cat entitlement ID
export const RC_ENTITLEMENT = 'premium';

// Subscription state cache TTL (24 hours in ms)
export const SUB_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
export const SUB_CACHE_KEY = 'sub_state_v1';
