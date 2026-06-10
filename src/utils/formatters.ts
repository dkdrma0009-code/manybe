// 공용 표시 포매터 — 화면별 중복 정의를 통합.
// 동작이 다른 변형(예: DealsScreen.formatWonShort, TaxFeeEngine.formatKRW)은
// 단일 사용이므로 각 파일에 그대로 둔다.

/** 1.2억원 / 350만원 / 9,000원 — 금액 (floor) */
export function formatWon(n: number): string {
  if (n >= 100_000_000) return `${Math.floor(n / 100_000_000)}억원`;
  if (n >= 10_000) return `${Math.floor(n / 10_000)}만원`;
  return n.toLocaleString('ko-KR') + '원';
}

/** 1.2억 / 350만원 / 9,000원 — 금액 (억은 소수 1자리) */
export function formatKRW(n: number): string {
  if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(1)}억`;
  if (n >= 10_000) return `${Math.floor(n / 10_000)}만원`;
  return n.toLocaleString('ko-KR') + '원';
}

/** 1.2억 / 3.5만 / 1.2K — 구독자·조회수 (크리에이터 화면) */
export function formatCount(n: number): string {
  if (n >= 100000000) return `${(n / 100000000).toFixed(1)}억`;
  if (n >= 10000) return `${(n / 10000).toFixed(1)}만`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

/** 3.5만 / 1.2천 — 구독자 수 (광고주 화면) */
export function formatCountKo(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}만`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}천`;
  return String(n);
}

/** 방금 / 5분 전 / 3시간 전 / 2일 전 — 분 단위 상대 시각 */
export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return '방금';
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

/** 오늘 / 어제 / N일 전 — 일 단위 상대 시각 */
export function daysAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const d = Math.floor(diff / 86_400_000);
  if (d === 0) return '오늘';
  if (d === 1) return '어제';
  return `${d}일 전`;
}
