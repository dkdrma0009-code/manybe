export type ActivationMilestone =
  | 'onboarding_complete'
  | 'channel_connected'
  | 'first_deal_added'
  | 'first_revenue_recorded'
  | 'first_insight_viewed';

export interface MilestoneMeta {
  title: string;
  description: string;
  icon: string;
  navigateTo: 'deals' | 'revenue' | 'channel' | 'insights' | null;
  ctaLabel: string;
}

export const MILESTONE_META: Record<ActivationMilestone, MilestoneMeta> = {
  onboarding_complete: {
    title: '온보딩 완료',
    description: '프로필 설정을 마쳤어요',
    icon: '🎉',
    navigateTo: null,
    ctaLabel: '완료',
  },
  channel_connected: {
    title: '채널 연동',
    description: 'YouTube 채널을 연결해 구독자를 확인하세요',
    icon: '📺',
    navigateTo: 'channel',
    ctaLabel: '채널 연동하기',
  },
  first_deal_added: {
    title: '첫 협찬 추가',
    description: '진행 중인 협찬을 등록해보세요',
    icon: '🤝',
    navigateTo: 'deals',
    ctaLabel: '협찬 추가하기',
  },
  first_revenue_recorded: {
    title: '첫 수익 기록',
    description: '수익을 기록하면 AI 분석이 시작됩니다',
    icon: '💰',
    navigateTo: 'revenue',
    ctaLabel: '수익 기록하기',
  },
  first_insight_viewed: {
    title: 'AI 인사이트 확인',
    description: '인사이트 탭에서 AI 분석을 확인해보세요',
    icon: '🧠',
    navigateTo: 'insights',
    ctaLabel: '인사이트 보기',
  },
};

export const MILESTONE_ORDER: ActivationMilestone[] = [
  'onboarding_complete',
  'channel_connected',
  'first_deal_added',
  'first_revenue_recorded',
  'first_insight_viewed',
];

export interface FunnelEvent {
  type: string;
  ts: string;
  metadata?: Record<string, string | number | boolean>;
}

export interface ActivationState {
  completed: Partial<Record<ActivationMilestone, string>>; // milestone → ISO timestamp
  funnelEvents: FunnelEvent[];
}

export const EMPTY_ACTIVATION_STATE: ActivationState = {
  completed: {},
  funnelEvents: [],
};
