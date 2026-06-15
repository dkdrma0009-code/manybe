// 채널 지표 신선도 판정 — 광고주가 보는 데이터의 신뢰도 표시용.
// 자동 재동기화 배치(sync-channels)가 updated_at을 갱신하고, 갱신 실패 시
// needs_reauth를 세운다. 둘 중 하나라도 문제면 "오래된 데이터"로 표시한다.

const STALE_DAYS = 14;

export interface FreshnessInput {
  updated_at?: string | null;
  needs_reauth?: boolean | null;
}

/** 데이터가 오래됐거나 재인증이 필요하면 true */
export function isStaleChannel(ch: FreshnessInput): boolean {
  if (ch.needs_reauth) return true;
  if (!ch.updated_at) return true;
  const ageMs = Date.now() - new Date(ch.updated_at).getTime();
  return ageMs > STALE_DAYS * 86400 * 1000;
}

/** 신선도 배지 문구 (정상이면 null) */
export function freshnessLabel(ch: FreshnessInput): string | null {
  if (ch.needs_reauth) return '갱신 필요';
  if (!ch.updated_at) return '동기화 안 됨';
  const ageDays = Math.floor((Date.now() - new Date(ch.updated_at).getTime()) / 86400000);
  if (ageDays > STALE_DAYS) return `${ageDays}일 전 데이터`;
  return null;
}
