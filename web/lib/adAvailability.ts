// 광고주 탐색·프로필용 광고 수신 상태 규칙 — Step 4.
// 신선도 판정은 앱 src/utils/adAvailability.ts 의 isAvailabilityFresh 가 기준(canonical)이다.
// 웹은 별도 패키지라 같은 계약으로 복제하고, scripts/test-discovery-rules.mjs 가
// 같은 입력에 두 구현이 같은 결과를 내는지 검사한다. 한쪽을 바꾸면 반드시 다른 쪽도 바꿀 것.
// (순수 함수만 둔다 — import 없이 Node 테스트에서 단독 실행 가능해야 함)

export const AVAILABILITY_FRESH_DAYS = 30;

const DAY_MS = 86_400_000;
// 서버 시각(confirmed_at)과 시계 차이 허용 범위. 이보다 미래면 비정상 값으로 보고 신선하지 않음 처리.
const CLOCK_SKEW_MS = 5 * 60_000;

export type AdAvailability = "accepting" | "not_accepting";

/** 앱과 동일: 확인 후 30일(경계 포함) 이내면 true. null·파싱 불가·5분 넘는 미래 시각은 false. */
export function isAvailabilityFresh(confirmedAt: string | null | undefined, now: number = Date.now()): boolean {
  if (!confirmedAt) return false;
  const t = Date.parse(confirmedAt);
  if (Number.isNaN(t)) return false;
  const age = now - t;
  if (age < -CLOCK_SKEW_MS) return false;
  return age <= AVAILABILITY_FRESH_DAYS * DAY_MS;
}

/** 원시 상태 해석 결과 (안정적인 코드 — 화면 문구는 아래 AVAILABILITY_COPY 에서 매핑) */
export type AvailabilityReason =
  | "accepting_fresh"
  | "accepting_stale"      // confirmed_at 없음·30일 초과·비정상 미래 포함
  | "unset"                // ad_availability NULL
  | "not_accepting_fresh"
  | "not_accepting_stale"; // 30일 넘은 거절은 현재 의사로 신뢰하지 않음

export type DiscoveryGroup = "available" | "needs_confirmation" | "excluded";
export type ProposalPermission = "allow" | "allow_with_warning" | "block";

export interface AvailabilityEvaluation {
  reason: AvailabilityReason;
  group: DiscoveryGroup;
  proposal: ProposalPermission;
  /** anon 공개 가능한 유일한 파생 정보 ("지금 협업 가능") */
  publiclyAvailable: boolean;
}

const RULES: Record<AvailabilityReason, Omit<AvailabilityEvaluation, "reason">> = {
  accepting_fresh:     { group: "available",          proposal: "allow",              publiclyAvailable: true },
  accepting_stale:     { group: "needs_confirmation", proposal: "allow_with_warning", publiclyAvailable: false },
  unset:               { group: "needs_confirmation", proposal: "allow_with_warning", publiclyAvailable: false },
  not_accepting_fresh: { group: "excluded",           proposal: "block",              publiclyAvailable: false },
  not_accepting_stale: { group: "needs_confirmation", proposal: "allow_with_warning", publiclyAvailable: false },
};

export function getAvailabilityReason(
  status: AdAvailability | null | undefined,
  confirmedAt: string | null | undefined,
  now: number = Date.now(),
): AvailabilityReason {
  if (!status) return "unset";
  const fresh = isAvailabilityFresh(confirmedAt, now);
  if (status === "accepting") return fresh ? "accepting_fresh" : "accepting_stale";
  return fresh ? "not_accepting_fresh" : "not_accepting_stale";
}

export function evaluateAdAvailability(
  status: AdAvailability | null | undefined,
  confirmedAt: string | null | undefined,
  now: number = Date.now(),
): AvailabilityEvaluation {
  const reason = getAvailabilityReason(status, confirmedAt, now);
  return { reason, ...RULES[reason] };
}

/** 향후 공개 View(034) 기대 동작과 같은 판정: accepting + fresh 만 true */
export function isPubliclyAvailable(
  status: AdAvailability | null | undefined,
  confirmedAt: string | null | undefined,
  now: number = Date.now(),
): boolean {
  return evaluateAdAvailability(status, confirmedAt, now).publiclyAvailable;
}

// ── 화면 문구 (광고주 로그인 화면용. anon에는 publiclyAvailable 외 정보를 내보내지 않는다) ──
const STALE_WARNING = "최근 30일 내 광고 수신 의사 확인 기록이 없어요.\n응답이 늦을 수 있어요.";

export const AVAILABILITY_COPY: Record<AvailabilityReason, { badge: string; warning?: string; blocked?: string }> = {
  accepting_fresh:     { badge: "지금 협업 가능" },
  accepting_stale:     { badge: "상태 확인 필요", warning: STALE_WARNING },
  unset:               { badge: "상태 확인 필요", warning: "아직 광고 수신 여부를 설정하지 않은 크리에이터예요." },
  not_accepting_fresh: { badge: "광고 제안 받지 않음", blocked: "현재 광고 제안을 받지 않는 크리에이터입니다." },
  not_accepting_stale: { badge: "상태 확인 필요", warning: STALE_WARNING },
};

/** "광고 수신 중 · 10월 12일 확인" — 서버(UTC)에서도 한국 날짜로 표시. accepting_fresh 외에는 null */
export function getAvailabilityDetail(reason: AvailabilityReason, confirmedAt: string | null | undefined): string | null {
  if (reason !== "accepting_fresh" || !confirmedAt) return null;
  const t = Date.parse(confirmedAt);
  if (Number.isNaN(t)) return null;
  const kst = new Date(t + 9 * 3_600_000);
  return `광고 수신 중 · ${kst.getUTCMonth() + 1}월 ${kst.getUTCDate()}일 확인`;
}

// ── 기본 탐색 정렬 ──

/** 채널 구독자/팔로워 합계. NULL·음수·비정상 값은 0 */
export function totalAudience(channels: { subscriber_count: number | null | undefined }[] | null | undefined): number {
  return (channels ?? []).reduce((sum, c) => {
    const n = c.subscriber_count;
    return sum + (typeof n === "number" && Number.isFinite(n) && n > 0 ? n : 0);
  }, 0);
}

export interface DiscoveryCandidate {
  slug: string;
  created_at: string | null;
  ad_availability: AdAvailability | null;
  ad_availability_confirmed_at: string | null;
  totalAudience: number;
}

const GROUP_RANK: Record<DiscoveryGroup, number> = { available: 0, needs_confirmation: 1, excluded: 2 };

// 정렬용 시각: 파싱 불가·허용 범위 넘는 미래 값은 NULL 취급(가장 뒤)
function sortTime(value: string | null, now: number): number | null {
  if (!value) return null;
  const t = Date.parse(value);
  if (Number.isNaN(t) || t - now > CLOCK_SKEW_MS) return null;
  return t;
}

function compareDesc(a: number | null, b: number | null): number {
  if (a === b) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return b - a;
}

/**
 * 기본 탐색 결과: excluded(최근 거절) 제거 후
 * 그룹(available → needs_confirmation) → confirmed_at 최신 → 총 audience 많은 순
 * → media kit created_at 최신 → slug 사전순. NULL 시각은 각 단계에서 가장 뒤.
 */
export function sortDiscoveryCandidates<T extends DiscoveryCandidate>(items: T[], now: number = Date.now()): T[] {
  return items
    .map((item) => ({ item, group: evaluateAdAvailability(item.ad_availability, item.ad_availability_confirmed_at, now).group }))
    .filter((x) => x.group !== "excluded")
    .sort((x, y) =>
      GROUP_RANK[x.group] - GROUP_RANK[y.group]
      || compareDesc(sortTime(x.item.ad_availability_confirmed_at, now), sortTime(y.item.ad_availability_confirmed_at, now))
      || y.item.totalAudience - x.item.totalAudience
      || compareDesc(sortTime(x.item.created_at, now), sortTime(y.item.created_at, now))
      || (x.item.slug < y.item.slug ? -1 : x.item.slug > y.item.slug ? 1 : 0))
    .map((x) => x.item);
}
