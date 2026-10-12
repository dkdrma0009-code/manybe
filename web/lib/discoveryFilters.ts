// 광고주 /discover 필터 엔진 — Step 4.
// 상태 해석·기본 제외·정렬은 ./adAvailability 를 그대로 재사용한다(새 규칙을 만들지 않음).
// (순수 함수만 둔다 — scripts/test-discovery-filters.mjs 에서 단독 테스트)
import type { MediaKitCategory } from "./categories";
import { evaluateAdAvailability, sortDiscoveryCandidates, totalAudience, type AdAvailability } from "./adAvailability";

export type DiscoveryPlatform = "youtube" | "instagram" | "tiktok"; // social_channels.platform 저장값

/** 기존 /discover 팔로워 규모 4단계(+전체) 숫자 그대로. 경계는 [min, max) — 경계값은 위 구간 */
export const AUDIENCE_RANGES = [
  { key: "nano",  label: "나노 (1만↓)",          min: 0,         max: 10_000 },
  { key: "micro", label: "마이크로 (1만~10만)",   min: 10_000,    max: 100_000 },
  { key: "mid",   label: "미드 (10만~100만)",     min: 100_000,   max: 1_000_000 },
  { key: "macro", label: "매크로 (100만↑)",       min: 1_000_000, max: Infinity },
] as const;

export type AudienceRangeKey = (typeof AUDIENCE_RANGES)[number]["key"];

/** 기존 /discover 조회 shape(media_kits + profiles.full_name + social_channels)에 맞춘 최소 후보 */
export interface DiscoveryFilterCandidate {
  user_id: string;
  slug: string;
  name: string | null;           // profiles.full_name
  bio: string | null;
  category: string | null;
  pricing: unknown;              // media_kits.pricing jsonb
  created_at: string | null;
  ad_availability: AdAvailability | null;
  ad_availability_confirmed_at: string | null;
  channels: { platform: string; subscriber_count: number | null }[];
}

export interface DiscoveryFilters {
  keyword?: string | null;
  category?: MediaKitCategory | null;
  platform?: DiscoveryPlatform | null;
  followerRange?: AudienceRangeKey | null;
  onlyAvailable?: boolean;
  maxRate?: number | null;       // 원 단위 (media_kits.pricing 과 동일)
}

/**
 * 입력된 유효 광고 단가 중 최소 금액(원). 없으면 null.
 * 유효 = 0보다 큰 숫자 또는 숫자만 있는 문자열(쉼표 허용). "협의"·"50만원" 같은 문구는 해석하지 않는다.
 */
export function getMinimumRate(pricing: unknown): number | null {
  if (!pricing || typeof pricing !== "object" || Array.isArray(pricing)) return null;
  let min: number | null = null;
  for (const v of Object.values(pricing)) {
    const n = typeof v === "number" ? v
      : typeof v === "string" && /^\d[\d,]*$/.test(v.trim()) ? Number(v.trim().replace(/,/g, ""))
      : NaN;
    if (Number.isFinite(n) && n > 0 && (min === null || n < min)) min = n;
  }
  return min;
}

/** 필터 기준 audience: 플랫폼 선택 시 해당 플랫폼 채널 합, 아니면 전체 채널 합 */
export function filterAudience(channels: DiscoveryFilterCandidate["channels"], platform?: DiscoveryPlatform | null): number {
  return totalAudience(platform ? channels.filter((c) => c.platform === platform) : channels);
}

/** "필터 N" 표시용. 검색어(keyword)는 일반 검색이라 세지 않는다 */
export function getActiveFilterCount(filters: DiscoveryFilters): number {
  return [
    !!filters.category,
    !!filters.platform,
    !!filters.followerRange,
    !!filters.onlyAvailable,
    filters.maxRate != null && Number.isFinite(filters.maxRate),
  ].filter(Boolean).length;
}

/**
 * 기본 제외(최근 거절) → 검색어(이름·소개) → 카테고리 → 플랫폼 → 규모 → 지금 가능만 → 최대 단가
 * → sortDiscoveryCandidates(B2 정렬). 입력 배열·객체는 바꾸지 않고, 결과에 totalAudience 를 붙인다.
 */
export function filterDiscoveryCandidates<T extends DiscoveryFilterCandidate>(
  candidates: T[],
  filters: DiscoveryFilters = {},
  now: number = Date.now(),
): (T & { totalAudience: number })[] {
  const keyword = filters.keyword?.trim().toLowerCase() ?? "";
  const range = filters.followerRange ? AUDIENCE_RANGES.find((r) => r.key === filters.followerRange) : undefined;
  const maxRate = filters.maxRate != null && Number.isFinite(filters.maxRate) ? filters.maxRate : null;

  const matched = candidates.filter((c) => {
    const group = evaluateAdAvailability(c.ad_availability, c.ad_availability_confirmed_at, now).group;
    if (group === "excluded") return false;
    if (keyword && !(c.name ?? "").toLowerCase().includes(keyword) && !(c.bio ?? "").toLowerCase().includes(keyword)) return false;
    if (filters.category && c.category !== filters.category) return false;
    if (filters.platform && !c.channels.some((ch) => ch.platform === filters.platform)) return false;
    if (range) {
      const audience = filterAudience(c.channels, filters.platform);
      if (audience < range.min || audience >= range.max) return false;
    }
    if (filters.onlyAvailable && group !== "available") return false;
    if (maxRate !== null) {
      const minRate = getMinimumRate(c.pricing);
      if (minRate === null || minRate > maxRate) return false;
    }
    return true;
  });

  return sortDiscoveryCandidates(matched.map((c) => ({ ...c, totalAudience: totalAudience(c.channels) })), now);
}
