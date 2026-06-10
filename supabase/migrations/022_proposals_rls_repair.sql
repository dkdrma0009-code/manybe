-- ============================================================
-- advertiser_proposals RLS·Realtime 보수
-- 006/007이 대시보드 수동 실행 이력 때문에 원격에 부분 적용됐을 수
-- 있어(크리에이터가 받은 제안이 안 보이는 증상), 정책 전체를
-- 멱등하게 재적용하고 실시간 publication 등록을 보장한다.
-- ============================================================

ALTER TABLE advertiser_proposals ENABLE ROW LEVEL SECURITY;

-- 크리에이터: 자신에게 온 제안 조회
DROP POLICY IF EXISTS "proposals_select" ON advertiser_proposals;
CREATE POLICY "proposals_select" ON advertiser_proposals
  FOR SELECT USING (auth.uid() = creator_id);

-- 크리에이터: 수락/거절 상태 변경
DROP POLICY IF EXISTS "proposals_update" ON advertiser_proposals;
CREATE POLICY "proposals_update" ON advertiser_proposals
  FOR UPDATE USING (auth.uid() = creator_id)
  WITH CHECK (auth.uid() = creator_id);

-- 광고주: 본인 명의로만 제안 전송
DROP POLICY IF EXISTS "proposals_insert" ON advertiser_proposals;
CREATE POLICY "proposals_insert" ON advertiser_proposals
  FOR INSERT WITH CHECK (auth.uid() = advertiser_id);

-- 광고주: 자신이 보낸 제안 조회
DROP POLICY IF EXISTS "proposals_select_advertiser" ON advertiser_proposals;
CREATE POLICY "proposals_select_advertiser" ON advertiser_proposals
  FOR SELECT USING (auth.uid() = advertiser_id);

-- 실시간 구독(RealtimeContext proposalsVersion)을 위한 publication 등록
ALTER TABLE advertiser_proposals REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'advertiser_proposals'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE advertiser_proposals;
  END IF;
END $$;
