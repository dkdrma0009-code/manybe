-- schedules.deal_id가 원격에 수동 생성돼 있어 024의 ADD COLUMN이
-- 스킵됨 → REFERENCES ... ON DELETE CASCADE가 누락됐을 수 있다.
-- FK 제약을 멱등하게 보장한다 (협찬 삭제 시 관련 일정 자동 정리).

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'schedules'
      AND constraint_type = 'FOREIGN KEY'
      AND constraint_name = 'schedules_deal_id_fkey'
  ) THEN
    -- 기존 데이터에 존재하지 않는 deal을 가리키는 행이 있으면 NULL 처리 후 제약 추가
    UPDATE schedules s SET deal_id = NULL
    WHERE deal_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM deals d WHERE d.id = s.deal_id);

    ALTER TABLE schedules
      ADD CONSTRAINT schedules_deal_id_fkey
      FOREIGN KEY (deal_id) REFERENCES deals(id) ON DELETE CASCADE;
  END IF;
END $$;
