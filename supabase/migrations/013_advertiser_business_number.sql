-- ============================================================
-- 광고주 사업자등록번호 컬럼 추가
-- ============================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS business_number text,
  ADD COLUMN IF NOT EXISTS company_name text;

-- 광고주 온보딩 완료 여부 (앱에서 AsyncStorage로도 관리하지만 DB도 기록)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS advertiser_onboarding_done boolean NOT NULL DEFAULT false;
