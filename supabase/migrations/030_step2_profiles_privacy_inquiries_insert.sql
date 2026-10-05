-- ============================================================
-- Step 2 보안 수정 (원격 점검 2026-10-05 기준 확정)
--
--  1) profiles: anon/authenticated에 컬럼 단위 SELECT만 허용해
--     push_token·business_number 등 비공개 컬럼을 API에서 차단한다.
--     (PG RLS는 행 단위라 컬럼을 못 가린다 → 컬럼 권한으로 해결.
--      기존 행 공개 SELECT 정책들은 그대로 두어 기존 조회는 유지)
--     다른 테이블 정책 중 public.profiles를 읽는 것은 없음을 확인함.
--  2) media_kit_inquiries: 익명/일반 INSERT 정책 제거 (MVP 미사용 기능).
--     테이블·데이터·SELECT 정책은 유지.
-- 기존 데이터 변경·삭제 없음. service_role(엣지 함수·관리자)은 영향 없음.
-- ============================================================

-- ── 1) profiles 컬럼 단위 공개 ───────────────────────────────
-- 테이블 단위 SELECT 회수 (컬럼 단위 SELECT도 함께 회수됨).
-- INSERT/UPDATE 권한은 건드리지 않음 — 본인 행 쓰기는 기존 RLS 정책대로 유지.
REVOKE SELECT ON public.profiles FROM anon, authenticated;

-- 비로그인: 탐색·공개 미디어킷에 필요한 최소 정보
GRANT SELECT (id, full_name, avatar_url) ON public.profiles TO anon;

-- 로그인 사용자: + 역할(광고주 세션 판별·크리에이터 필터), 광고주 회사명(크리에이터가 받은 제안에서 표시)
-- 비공개 유지: push_token, business_number, display_name, advertiser_onboarding_done, created_at, updated_at
GRANT SELECT (id, full_name, avatar_url, role, company_name) ON public.profiles TO authenticated;

-- ── 2) media_kit_inquiries 익명/일반 INSERT 차단 ─────────────
-- 원격에 실제 존재하는 INSERT 정책 2개
DROP POLICY IF EXISTS "Anyone can insert inquiries" ON public.media_kit_inquiries;
DROP POLICY IF EXISTS "Public insert inquiries"     ON public.media_kit_inquiries;
-- 마이그레이션 004의 정책명 (원격엔 없음 — 방어적 DROP)
DROP POLICY IF EXISTS "inquiries_insert"            ON public.media_kit_inquiries;
