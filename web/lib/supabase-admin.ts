import { createClient } from "@supabase/supabase-js";

// 서버 전용 service-role 클라이언트 — RLS를 우회하므로
// 반드시 owner 게이트(requireOwner) 뒤에서만 사용한다.
export function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export const OWNER_EMAIL = "eficar@eficar.co.kr";
