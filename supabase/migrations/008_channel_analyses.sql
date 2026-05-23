-- ============================================================
-- channel_analyses: Claude API 채널 분석 결과 캐시
-- ============================================================

CREATE TABLE channel_analyses (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel_id      TEXT        NOT NULL,
  sentiment_score INT         NOT NULL DEFAULT 50,
  sentiment_label TEXT        NOT NULL DEFAULT '중립적',
  audience_keywords TEXT[]    NOT NULL DEFAULT '{}',
  ad_ratio        INT         NOT NULL DEFAULT 0,
  insights        JSONB       NOT NULL DEFAULT '[]',
  sample_size     INT         NOT NULL DEFAULT 0,
  computed_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, channel_id)
);

ALTER TABLE channel_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "channel_analyses_own" ON channel_analyses
  FOR ALL USING (auth.uid() = user_id);
