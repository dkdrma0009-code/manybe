CREATE TABLE feedback (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  category   TEXT        NOT NULL CHECK (category IN ('버그', '개선', '기타')),
  content    TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "feedback_insert" ON feedback
  FOR INSERT WITH CHECK (auth.uid() = user_id);
