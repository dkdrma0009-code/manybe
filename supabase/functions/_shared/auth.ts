// 요청의 Authorization 헤더(로그인 사용자 JWT)로 현재 사용자를 판별한다.
// 요청 body의 userId는 위조 가능하므로 절대 신뢰하지 않는다.
// anon 키·만료·무효 토큰이면 null.

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

export async function getRequestUserId(req: Request, supabase: SupabaseClient): Promise<string | null> {
  const jwt = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '')
  if (!jwt) return null
  const { data, error } = await supabase.auth.getUser(jwt)
  if (error || !data.user) return null
  return data.user.id
}
