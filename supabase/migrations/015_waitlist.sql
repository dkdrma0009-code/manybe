CREATE TABLE IF NOT EXISTS waitlist (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email       text NOT NULL,
  role        text NOT NULL DEFAULT 'creator' CHECK (role IN ('creator', 'advertiser')),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS waitlist_email_idx ON waitlist (email);

ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

-- 누구나 INSERT 가능 (사전등록)
CREATE POLICY "anyone can join waitlist"
  ON waitlist FOR INSERT
  WITH CHECK (true);
