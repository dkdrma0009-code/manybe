// Supabase write 결과를 절대 조용히 삼키지 않게 하는 얇은 래퍼.
// 이번 프로젝트 버그의 큰 축이 "insert/update가 실패해도 아무도 모름"이었다.
// 모든 쓰기를 이 헬퍼로 감싸면 실패가 로그(프로덕션 포함)에 남고
// 호출부는 boolean/메시지로 결과를 받는다.
import type { PostgrestError } from '@supabase/supabase-js';
import { makeLogger } from '../utils/logger';

const log = makeLogger('mutate');

export interface MutationResult<T = unknown> {
  ok: boolean;
  error: PostgrestError | null;
  data: T | null;
}

/**
 * supabase 쓰기 빌더(thenable)를 받아 결과를 표준화한다.
 * 사용: const r = await runMutation('정산 기록', supabase.from('revenues').insert(...).select())
 *       if (!r.ok) showToast(friendlyMutationError(r.error));
 */
export async function runMutation<T = unknown>(
  label: string,
  builder: PromiseLike<{ data: T | null; error: PostgrestError | null }>,
): Promise<MutationResult<T>> {
  try {
    const { data, error } = await builder;
    if (error) {
      log.error(`${label} 실패:`, error.code, error.message);
      return { ok: false, error, data: null };
    }
    return { ok: true, error: null, data };
  } catch (e) {
    log.error(`${label} 예외:`, e);
    return { ok: false, error: e as PostgrestError, data: null };
  }
}

/** DB 에러를 사용자에게 보여줄 한국어 문구로 변환 (기술 용어 제거). */
export function friendlyMutationError(error: PostgrestError | null): string {
  if (!error) return '알 수 없는 오류가 발생했어요.';
  switch (error.code) {
    case '23505': return '이미 동일한 항목이 있어요.';
    case '23502': return '필수 정보가 빠졌어요. 입력값을 확인해주세요.';
    case '23503': return '연결된 데이터를 찾을 수 없어요.';
    case '42501': return '권한이 없어요. 로그아웃 후 다시 로그인해주세요.';
    default:      return '처리에 실패했어요. 잠시 후 다시 시도해주세요.';
  }
}
