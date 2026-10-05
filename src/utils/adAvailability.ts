// 광고 수신 가능 상태(media_kits.ad_availability) 해석·검증 — Step 3.
// DB에는 크리에이터가 밝힌 상태와 서버 확인 시각만 저장하고,
// "확인 필요"(stale)는 저장하지 않고 여기서 현재 시각 기준으로 계산한다.
// 신선도 기준은 accepting·not_accepting 모두에 적용된다.
// (순수 함수만 둔다 — scripts/test-ad-availability.mjs 에서 단독 테스트)

export const AVAILABILITY_FRESH_DAYS = 30;
export const AVAILABILITY_NOTE_MAX = 100;

const DAY_MS = 86_400_000;
// 서버 시각(confirmed_at)과 기기 시계 차이 허용 범위. 이보다 미래면 비정상 값으로 보고 신선하지 않음 처리.
const CLOCK_SKEW_MS = 5 * 60_000;

export type AdAvailability = 'accepting' | 'not_accepting';

/** media_kits의 광고 수신 관련 5개 컬럼 */
export interface AvailabilityRow {
  ad_availability: AdAvailability | null;
  ad_availability_confirmed_at: string | null;
  available_from: string | null;
  available_until: string | null;
  availability_note: string | null;
}

/** 입력 폼 상태. from/until 모드가 'now'/'none'이면 저장 값은 NULL(지금부터 / 종료일 없음) */
export interface AvailabilityDraft {
  status: AdAvailability | null;
  fromMode: 'now' | 'date';
  from: string;
  untilMode: 'none' | 'date';
  until: string;
  note: string;
}

// 재확인 신호 — 이 값은 저장되지 않는다. 031 트리거가 confirmed_at 변경 요청을 감지해 서버 now()로 덮어쓴다.
export const RECONFIRM_SIGNAL = '1970-01-01T00:00:00Z';

export function toAvailabilityDraft(row: AvailabilityRow | null): AvailabilityDraft {
  return {
    status: row?.ad_availability ?? null,
    fromMode: row?.available_from ? 'date' : 'now',
    from: row?.available_from ?? '',
    untilMode: row?.available_until ? 'date' : 'none',
    until: row?.available_until ?? '',
    note: row?.availability_note ?? '',
  };
}

/**
 * 저장할 update 값. not_accepting이면 일정 3개를 NULL로 정리한다.
 * is_form_enabled는 Step 4 전까지 과도기 호환용 동기화 (Source of Truth는 ad_availability).
 * confirmed_at은 보내지 않는다 — 상태·일정 변경을 감지한 트리거가 서버 now()로 기록.
 */
export function toAvailabilityUpdate(draft: AvailabilityDraft & { status: AdAvailability }) {
  if (draft.status === 'accepting') {
    return {
      ad_availability: 'accepting' as const,
      available_from: draft.fromMode === 'date' ? draft.from.trim() : null,
      available_until: draft.untilMode === 'date' ? draft.until.trim() : null,
      availability_note: draft.note.trim() || null,
      is_form_enabled: true,
    };
  }
  return {
    ad_availability: 'not_accepting' as const,
    available_from: null,
    available_until: null,
    availability_note: null,
    is_form_enabled: false,
  };
}

/** 저장된 값과 다른 입력이 있는지 (상태 미선택이면 저장할 것이 없으므로 false) */
export function isAvailabilityDirty(draft: AvailabilityDraft, saved: AvailabilityRow | null): boolean {
  if (!draft.status) return false;
  const p = toAvailabilityUpdate({ ...draft, status: draft.status });
  return (
    p.ad_availability !== (saved?.ad_availability ?? null)
    || p.available_from !== (saved?.available_from ?? null)
    || p.available_until !== (saved?.available_until ?? null)
    || p.availability_note !== (saved?.availability_note ?? null)
  );
}

/** 화면 표시 상태: 미설정 / 수신 가능(최신) / 수신 안 함(최신) / 확인 필요 */
export type AvailabilityDisplayState = 'unset' | 'accepting' | 'not_accepting' | 'stale';

/** 확인 후 30일(경계 포함) 이내면 true. null·파싱 불가·비정상 미래 시각은 false. 실제 경과 시간(ms) 기준. */
export function isAvailabilityFresh(confirmedAt: string | null | undefined, now: number = Date.now()): boolean {
  if (!confirmedAt) return false;
  const t = Date.parse(confirmedAt);
  if (Number.isNaN(t)) return false;
  const age = now - t;
  if (age < -CLOCK_SKEW_MS) return false;
  return age <= AVAILABILITY_FRESH_DAYS * DAY_MS;
}

export function getAvailabilityDisplayState(
  status: AdAvailability | null | undefined,
  confirmedAt: string | null | undefined,
  now: number = Date.now(),
): AvailabilityDisplayState {
  if (!status) return 'unset';
  return isAvailabilityFresh(confirmedAt, now) ? status : 'stale';
}

/** "10월 5일" — 기기 현지 날짜. 확인 기록이 없거나 파싱 불가면 null */
export function formatConfirmedDate(confirmedAt: string | null | undefined): string | null {
  if (!confirmedAt) return null;
  const d = new Date(confirmedAt);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

/** 'YYYY-MM-DD' 형식이면서 실제 존재하는 날짜인지 (시간대 변환 없이 문자열·UTC로만 판정) */
export function isValidDateString(value: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d;
}

/** DB char_length와 같은 기준(코드 포인트 수)으로 센다 — 이모지 등에서 String.length와 다름 */
export function noteLength(note: string): number {
  return [...note].length;
}

/**
 * accepting 일정 입력 검증. 문제가 없으면 null, 있으면 사용자 안내 문구.
 * from/until은 null = 지금부터 / 종료일 없음. DB CHECK와 같은 규칙.
 */
export function validateAvailabilitySchedule(input: {
  from: string | null;
  until: string | null;
  note: string;
}): string | null {
  if (input.from !== null && !isValidDateString(input.from)) return '시작일을 YYYY-MM-DD 형식으로 입력해주세요.';
  if (input.until !== null && !isValidDateString(input.until)) return '종료일을 YYYY-MM-DD 형식으로 입력해주세요.';
  // 같은 형식의 날짜 문자열은 사전순 비교 = 날짜 비교
  if (input.from !== null && input.until !== null && input.until < input.from) {
    return '종료일은 시작일과 같거나 이후여야 해요.';
  }
  if (noteLength(input.note.trim()) > AVAILABILITY_NOTE_MAX) {
    return `일정 메모는 ${AVAILABILITY_NOTE_MAX}자까지 입력할 수 있어요.`;
  }
  return null;
}
