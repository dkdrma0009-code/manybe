-- ============================================================
-- 🔴 보안 수정: YouTube OAuth 토큰을 소유자 전용 테이블로 분리
--
-- social_channels는 광고주 탐색(discover)을 위해 SELECT가 전체 공개
-- (USING true)인데, 같은 행에 youtube_access_token/refresh_token이 있어
-- anon 키로 누구나 남의 OAuth 토큰을 읽을 수 있었다(채널 탈취 위험).
-- PG RLS는 컬럼 단위 제어가 안 되므로 토큰을 별도 테이블로 옮기고
-- 소유자 전용 정책을 건다. 엣지 함수는 service_role이라 영향 없음.
-- ============================================================

CREATE TABLE IF NOT EXISTS social_channel_tokens (
  user_id                  uuid NOT NULL,
  platform                 text NOT NULL,
  youtube_access_token     text,
  youtube_refresh_token    text,
  youtube_token_expires_at timestamptz,
  updated_at               timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, platform)
);

ALTER TABLE social_channel_tokens ENABLE ROW LEVEL SECURITY;

-- 소유자만 자신의 토큰을 읽고 쓸 수 있다. 공개 SELECT 없음.
DROP POLICY IF EXISTS "tokens_owner_all" ON social_channel_tokens;
CREATE POLICY "tokens_owner_all" ON social_channel_tokens
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 기존 토큰 이전 (있을 경우)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'social_channels'
      AND column_name = 'youtube_access_token'
  ) THEN
    INSERT INTO social_channel_tokens
      (user_id, platform, youtube_access_token, youtube_refresh_token, youtube_token_expires_at)
    SELECT user_id, platform, youtube_access_token, youtube_refresh_token, youtube_token_expires_at
    FROM social_channels
    WHERE youtube_access_token IS NOT NULL
    ON CONFLICT (user_id, platform) DO NOTHING;

    ALTER TABLE social_channels DROP COLUMN youtube_access_token;
    ALTER TABLE social_channels DROP COLUMN youtube_refresh_token;
    ALTER TABLE social_channels DROP COLUMN youtube_token_expires_at;
  END IF;
END $$;
