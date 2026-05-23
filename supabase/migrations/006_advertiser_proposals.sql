-- ============================================================
-- advertiser_proposals: 광고주가 크리에이터에게 보내는 협찬 제안
-- ============================================================

CREATE TABLE advertiser_proposals (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id  UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  brand_name  TEXT        NOT NULL,
  message     TEXT        NOT NULL,
  amount      BIGINT      NOT NULL DEFAULT 0,
  status      TEXT        NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── RLS ──────────────────────────────────────────────────────
ALTER TABLE advertiser_proposals ENABLE ROW LEVEL SECURITY;

-- 크리에이터: 자신에게 온 제안 조회
CREATE POLICY "proposals_select" ON advertiser_proposals
  FOR SELECT USING (auth.uid() = creator_id);

-- 크리에이터: 수락/거절 상태 변경
CREATE POLICY "proposals_update" ON advertiser_proposals
  FOR UPDATE USING (auth.uid() = creator_id)
  WITH CHECK (auth.uid() = creator_id);

-- 광고주(anon 포함): 제안 전송
CREATE POLICY "proposals_insert" ON advertiser_proposals
  FOR INSERT WITH CHECK (true);

-- ── Realtime ─────────────────────────────────────────────────
ALTER TABLE advertiser_proposals REPLICA IDENTITY FULL;

-- ── Auto-update timestamp ────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER proposals_updated_at
  BEFORE UPDATE ON advertiser_proposals
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
