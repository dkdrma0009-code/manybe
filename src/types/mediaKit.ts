export type CreatorNiche =
  | 'beauty' | 'lifestyle' | 'tech' | 'food' | 'travel'
  | 'fitness' | 'gaming' | 'education' | 'finance' | 'general';

export interface CreatorBadge {
  type: 'deal_count' | 'reliability' | 'scale' | 'niche_expert';
  label: string;
  value: string;
  color: string;
  bgColor: string;
}

export interface PortfolioIntelligence {
  topBrands: string[];
  reliabilityScore: number;   // 0-100
  nicheKeywords: string[];
  primaryNiche: CreatorNiche;
  dealCount: number;
  settledCount: number;
  completionRate: number;     // 0-100
}

export interface CollaborationPitch {
  short: string;   // ~80 chars for DM/SNS
  long: string;    // ~250 chars for email
  generatedAt: string;
}

export interface MediaKitIntelligence {
  portfolio: PortfolioIntelligence;
  pitch: CollaborationPitch;
  badges: CreatorBadge[];
  aiGeneratedBio: string;
  generatedAt: string;
}

// ── 크리에이터 선택 뱃지 ─────────────────────────────────────────

export type BadgeId =
  | 'sub_100k' | 'sub_500k' | 'sub_1m'
  | 'high_engagement' | 'fast_growth' | 'viral'
  | 'reliable' | 'on_time' | 'good_comm' | 'creative' | 'data_driven' | 'long_term'
  | 'food' | 'travel' | 'beauty' | 'tech' | 'fashion' | 'fitness'
  | 'family' | 'education' | 'entertainment' | 'gaming' | 'finance' | 'pet' | 'kids'
  | 'studio' | 'overseas' | 'multi_platform' | 'brand_safe';

export const BADGE_CATALOG: Record<BadgeId, { emoji: string; label: string; category: string }> = {
  // 성과
  sub_100k:        { emoji: '🔥', label: '10만 구독',       category: '성과' },
  sub_500k:        { emoji: '⚡', label: '50만 구독',       category: '성과' },
  sub_1m:          { emoji: '💎', label: '100만 구독',      category: '성과' },
  high_engagement: { emoji: '📈', label: '높은 참여율',     category: '성과' },
  fast_growth:     { emoji: '🚀', label: '빠른 성장',       category: '성과' },
  viral:           { emoji: '🌊', label: '바이럴 경험',     category: '성과' },
  // 협업 스타일
  reliable:        { emoji: '✅', label: '신뢰할 수 있는 파트너', category: '협업 스타일' },
  on_time:         { emoji: '⏰', label: '기한 엄수',       category: '협업 스타일' },
  good_comm:       { emoji: '💬', label: '소통 잘됨',       category: '협업 스타일' },
  creative:        { emoji: '🎨', label: '크리에이티브',    category: '협업 스타일' },
  data_driven:     { emoji: '📊', label: '데이터 중심',     category: '협업 스타일' },
  long_term:       { emoji: '🤝', label: '장기 협업 선호',  category: '협업 스타일' },
  // 분야
  food:            { emoji: '🍔', label: '푸드',            category: '분야' },
  travel:          { emoji: '✈️', label: '여행',            category: '분야' },
  beauty:          { emoji: '💄', label: '뷰티',            category: '분야' },
  tech:            { emoji: '💻', label: '테크',            category: '분야' },
  fashion:         { emoji: '👗', label: '패션',            category: '분야' },
  fitness:         { emoji: '🏋️', label: '피트니스',        category: '분야' },
  family:          { emoji: '👨‍👩‍👧', label: '가족 콘텐츠',    category: '분야' },
  education:       { emoji: '📚', label: '교육',            category: '분야' },
  entertainment:   { emoji: '😂', label: '엔터테인먼트',    category: '분야' },
  gaming:          { emoji: '🎮', label: '게이밍',          category: '분야' },
  finance:         { emoji: '💰', label: '경제/재테크',     category: '분야' },
  pet:             { emoji: '🐾', label: '반려동물',        category: '분야' },
  kids:            { emoji: '👶', label: '키즈',            category: '분야' },
  // 특이점
  studio:          { emoji: '🎬', label: '스튜디오 보유',   category: '특이점' },
  overseas:        { emoji: '🌏', label: '해외 거주',       category: '특이점' },
  multi_platform:  { emoji: '📱', label: '멀티 플랫폼',     category: '특이점' },
  brand_safe:      { emoji: '🛡️', label: '브랜드 세이프',   category: '특이점' },
};

export const BADGE_CATEGORIES = ['성과', '협업 스타일', '분야', '특이점'] as const;

// 연동 채널 데이터로 자동 검증되는 뱃지 — 사용자가 임의 선택할 수 없다(허위 방지).
// 나머지(협업 스타일/분야/특이점)는 자기 서술 속성이라 수동 선택 유지.
export const AUTO_VERIFIED_BADGES: BadgeId[] = ['sub_100k', 'sub_500k', 'sub_1m', 'fast_growth'];

/** 연동 채널의 구독자 수·성장 이력으로 검증 뱃지를 산출한다. */
export function computeVerifiedBadges(channels: Array<{
  subscriber_count?: number | null;
  subscriber_history?: Array<{ date: string; count: number }> | null;
}>): BadgeId[] {
  const result: BadgeId[] = [];
  const maxSubs = Math.max(0, ...channels.map((c) => c.subscriber_count ?? 0));

  if (maxSubs >= 1_000_000) result.push('sub_1m');
  else if (maxSubs >= 500_000) result.push('sub_500k');
  else if (maxSubs >= 100_000) result.push('sub_100k');

  // 빠른 성장: 어느 채널이든 최근 3개월 구독자 +20% 이상
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - 3);
  for (const c of channels) {
    const hist = c.subscriber_history ?? [];
    const cur = c.subscriber_count ?? 0;
    if (!hist.length || cur <= 0) continue;
    const old = hist
      .filter((h) => new Date(h.date) <= cutoff)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
    if (old && old.count > 0 && (cur - old.count) / old.count >= 0.2) {
      result.push('fast_growth');
      break;
    }
  }
  return result;
}

// ── 테마 ─────────────────────────────────────────────────────────

export type MediaKitTheme = 'indigo' | 'rose' | 'emerald' | 'amber' | 'slate';

export const THEME_CATALOG: Record<MediaKitTheme, { label: string; primary: string; bg: string; accent: string }> = {
  indigo:  { label: '인디고',   primary: '#5566DF', bg: '#F0EFFE', accent: '#E8E4FF' },
  rose:    { label: '로즈',     primary: '#E11D48', bg: '#FFF1F2', accent: '#FFE4E6' },
  emerald: { label: '에메랄드', primary: '#059669', bg: '#ECFDF5', accent: '#D1FAE5' },
  amber:   { label: '앰버',     primary: '#D97706', bg: '#FFFBEB', accent: '#FEF3C7' },
  slate:   { label: '다크',     primary: '#334155', bg: '#F1F5F9', accent: '#E2E8F0' },
};

export const THEME_IDS: MediaKitTheme[] = ['indigo', 'rose', 'emerald', 'amber', 'slate'];

// ── 섹션 ─────────────────────────────────────────────────────────

export type SectionId = 'channels' | 'pricing' | 'brands';

export const SECTION_CATALOG: Record<SectionId, { label: string; icon: string }> = {
  channels: { label: '채널 성과',   icon: '📊' },
  pricing:  { label: '협찬 단가',   icon: '💰' },
  brands:   { label: '협업 브랜드', icon: '🤝' },
};

export const DEFAULT_SECTION_ORDER: SectionId[] = ['channels', 'pricing', 'brands'];

// ── 하이라이트 ────────────────────────────────────────────────────

export interface HighlightItem {
  label: string;
  value: string;
  note?: string;
  thumbnail?: string; // 이미지 URL (YouTube 썸네일 등)
}

export function extractYoutubeThumbnail(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (match) return `https://img.youtube.com/vi/${match[1]}/mqdefault.jpg`;
  return null;
}

export interface HighlightSection {
  id: string;
  title: string;
  items: HighlightItem[];
}
