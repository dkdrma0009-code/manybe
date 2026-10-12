// ── media_kits.category 저장값 SSOT (Step 4-A 확정) ──────────────────────────
// 앱 src/constants/creatorCategories.ts 의 CREATOR_CATEGORIES 와 같은 값이어야 한다
// (scripts/test-creator-categories.mjs 가 일치를 검사). value = DB 저장값, label = 화면 표시.
export const MEDIA_KIT_CATEGORIES = [
  { value: '뷰티/패션',    label: '뷰티/패션' },
  { value: '음식/요리',    label: '푸드/요리' },
  { value: '라이프스타일', label: '라이프스타일' },
  { value: '테크/IT',      label: '테크/IT' },
  { value: '게임',         label: '게임' },
  { value: '여행',         label: '여행' },
  { value: '스포츠',       label: '스포츠/피트니스' },
  { value: '교육',         label: '교육/자기계발' },
  { value: '엔터테인먼트', label: '엔터테인먼트' },
  { value: '육아/가족',    label: '육아/가족' },
  { value: '반려동물',     label: '반려동물' },
  { value: '경제/재테크',  label: '경제/재테크' },
  { value: '기타',         label: '기타' },
] as const;

export type MediaKitCategory = typeof MEDIA_KIT_CATEGORIES[number]['value'];

// ── (레거시) 숨김 크리에이터 웹의 영문 key 체계 — 단가 계산기(cpv)용, 호환 위해 유지 ──
// 아래 LEGACY_CATEGORY_KEY_TO_VALUE 로 저장값 체계와 대응한다.
export const CREATOR_CATEGORIES = [
  { key: 'lifestyle', label: '라이프스타일', emoji: '🌟', cpv: 85 },
  { key: 'beauty',    label: '뷰티/패션',    emoji: '💄', cpv: 125 },
  { key: 'food',      label: '음식/먹방',    emoji: '🍜', cpv: 80 },
  { key: 'tech',      label: '테크/IT',      emoji: '💻', cpv: 165 },
  { key: 'finance',   label: '금융/재테크',  emoji: '📈', cpv: 205 },
  { key: 'game',      label: '게임',         emoji: '🎮', cpv: 68 },
  { key: 'travel',    label: '여행/브이로그', emoji: '✈️', cpv: 105 },
  { key: 'edu',       label: '교육/자기계발', emoji: '📚', cpv: 140 },
  { key: 'sports',    label: '스포츠/피트니스', emoji: '💪', cpv: 95 },
  { key: 'enter',     label: '엔터테인먼트', emoji: '🎭', cpv: 78 },
] as const;

export type CategoryKey = typeof CREATOR_CATEGORIES[number]['key'];

export function getCategoryMeta(key: string | null | undefined) {
  return CREATOR_CATEGORIES.find(c => c.key === key) ?? CREATOR_CATEGORIES[0];
}

/** 레거시 영문 key → media_kits.category 저장값 */
export const LEGACY_CATEGORY_KEY_TO_VALUE: Record<CategoryKey, MediaKitCategory> = {
  lifestyle: '라이프스타일',
  beauty:    '뷰티/패션',
  food:      '음식/요리',
  tech:      '테크/IT',
  finance:   '경제/재테크',
  game:      '게임',
  travel:    '여행',
  edu:       '교육',
  sports:    '스포츠',
  enter:     '엔터테인먼트',
};
