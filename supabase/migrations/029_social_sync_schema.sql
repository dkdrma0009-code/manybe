-- ============================================================
-- 소셜 토큰 갱신·지표 재동기화 체계: 스키마
-- (028에서 만든 social_channel_tokens 패턴을 Instagram으로 확장)
-- ============================================================

-- 1) Instagram long-lived 토큰 저장 컬럼 (소유자 전용 테이블)
--    Instagram은 refresh_token이 없고 ig_refresh_token 그랜트로 같은 토큰을
--    60일씩 연장하므로 refresh_token 컬럼 불필요.
ALTER TABLE social_channel_tokens
  ADD COLUMN IF NOT EXISTS instagram_access_token     text,
  ADD COLUMN IF NOT EXISTS instagram_token_expires_at timestamptz;

-- 2) 동기화 실패(권한 해제 등) 표시 — 광고주 노출 데이터에서 구분 가능하게
ALTER TABLE social_channels
  ADD COLUMN IF NOT EXISTS needs_reauth boolean NOT NULL DEFAULT false;
