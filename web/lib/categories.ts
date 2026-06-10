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
