-- YouTube Analytics OAuth 토큰 저장
ALTER TABLE social_channels
  ADD COLUMN IF NOT EXISTS youtube_access_token  TEXT,
  ADD COLUMN IF NOT EXISTS youtube_refresh_token TEXT,
  ADD COLUMN IF NOT EXISTS youtube_token_expires_at TIMESTAMPTZ;
