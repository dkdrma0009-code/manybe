// 크리에이터 카테고리 — media_kits.category 저장값 SSOT (Step 4-A 확정, 단일 선택).
// value = DB 저장값(기존 운영 데이터 9종 포함, 이관 없음), label = 화면 표시.
// 웹은 별도 패키지라 web/lib/categories.ts 의 MEDIA_KIT_CATEGORIES 가 같은 값을 갖는다
// (scripts/test-creator-categories.mjs 가 두 목록의 일치를 검사한다).

export const CREATOR_CATEGORIES = [
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

export type CreatorCategory = (typeof CREATOR_CATEGORIES)[number]['value'];

export function isCreatorCategory(value: string | null | undefined): value is CreatorCategory {
  return !!value && CREATOR_CATEGORIES.some((c) => c.value === value);
}

/** DB 값 ↔ 화면 상태 정규화. 빈 문자열/공백은 미설정(null), 목록 밖 레거시 값은 그대로 보존 */
export function normalizeCategory(value: string | null | undefined): string | null {
  return value?.trim() || null;
}

/** 저장값 → 화면 라벨. 목록 밖(레거시) 값은 원문 그대로, 미설정은 null */
export function creatorCategoryLabel(value: string | null | undefined): string | null {
  if (!value) return null;
  return CREATOR_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}
