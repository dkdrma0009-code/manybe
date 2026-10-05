-- ============================================================
-- Step 3: 광고 수신 가능 상태 · 마지막 확인일 · 가능 일정 (media_kits)
-- (원격 점검 2026-10-05 기준: 컬럼명 충돌 없음, 트리거 없음,
--  anon/authenticated 테이블 단위 SELECT 보유)
--
--  1) 컬럼 5개 추가 — 모두 NULL 시작, 백필 없음
--     (is_form_enabled=true 기존 사용자도 accepting으로 이관하지 않음)
--  2) 확인 시각은 서버 now()로만 기록 — availability 전용 BEFORE 트리거
--  3) 신규 5개 컬럼은 anon 비공개 (Step 4 비회원 공개 범위 확정 전, fail-closed)
--     기존 컬럼의 anon 공개는 그대로 유지. authenticated는 변경 없음(전체 SELECT).
-- 기존 데이터 변경·삭제 없음.
-- ============================================================

-- ── 1) 컬럼 ──────────────────────────────────────────────────
ALTER TABLE public.media_kits
  ADD COLUMN ad_availability              text        NULL,
  ADD COLUMN ad_availability_confirmed_at timestamptz NULL,
  ADD COLUMN available_from               date        NULL,
  ADD COLUMN available_until              date        NULL,
  ADD COLUMN availability_note            text        NULL;

ALTER TABLE public.media_kits
  ADD CONSTRAINT media_kits_ad_availability_check
    CHECK (ad_availability IN ('accepting', 'not_accepting')),
  ADD CONSTRAINT media_kits_available_range_check
    CHECK (available_until IS NULL OR available_from IS NULL OR available_until >= available_from),
  ADD CONSTRAINT media_kits_availability_note_length_check
    CHECK (availability_note IS NULL OR char_length(availability_note) <= 100);

COMMENT ON COLUMN public.media_kits.ad_availability IS
  '유료 광고 수신 의사: accepting | not_accepting | NULL(미확인). 신선도(30일)는 저장하지 않고 confirmed_at으로 계산';
COMMENT ON COLUMN public.media_kits.ad_availability_confirmed_at IS
  '마지막 수신 의사 확인 서버 시각 — 트리거가 now()로만 기록 (클라이언트 값 무시)';
COMMENT ON COLUMN public.media_kits.available_from    IS '가능 시작일. NULL = 지금부터';
COMMENT ON COLUMN public.media_kits.available_until   IS '가능 종료일. NULL = 종료일 없음';
COMMENT ON COLUMN public.media_kits.availability_note IS '일정 보충 메모 (최대 100자)';

-- ── 2) 확인 시각 서버 기록 트리거 ────────────────────────────
-- 상태·일정 4개 필드 중 하나라도 바뀌거나, 클라이언트가 confirmed_at을
-- "보냈다면"(재확인 요청) 서버 now()로 덮어쓴다. 그 외 수정(소개·단가 등)은 유지.
CREATE OR REPLACE FUNCTION public.media_kits_stamp_ad_availability()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.ad_availability IS NOT NULL
       OR NEW.available_from IS NOT NULL
       OR NEW.available_until IS NOT NULL
       OR NEW.availability_note IS NOT NULL
       OR NEW.ad_availability_confirmed_at IS NOT NULL THEN
      NEW.ad_availability_confirmed_at := pg_catalog.now();
    END IF;
  ELSIF NEW.ad_availability              IS DISTINCT FROM OLD.ad_availability
     OR NEW.available_from               IS DISTINCT FROM OLD.available_from
     OR NEW.available_until              IS DISTINCT FROM OLD.available_until
     OR NEW.availability_note            IS DISTINCT FROM OLD.availability_note
     OR NEW.ad_availability_confirmed_at IS DISTINCT FROM OLD.ad_availability_confirmed_at THEN
    NEW.ad_availability_confirmed_at := pg_catalog.now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER media_kits_stamp_ad_availability
  BEFORE INSERT OR UPDATE ON public.media_kits
  FOR EACH ROW EXECUTE FUNCTION public.media_kits_stamp_ad_availability();

-- ── 3) anon 공개 범위: 기존 컬럼 유지 + 신규 5개 비공개 ──────
-- 테이블 단위 SELECT를 회수하고, 적용 시점의 실제 컬럼 중 신규 5개를 뺀
-- 나머지를 컬럼 단위로 다시 부여한다 (원격 컬럼 목록을 추정하지 않기 위해 동적 처리).
-- 주의: 이후 media_kits에 추가되는 컬럼은 anon에 자동 공개되지 않는다 (명시 GRANT 필요).
REVOKE SELECT ON public.media_kits FROM anon;

DO $$
DECLARE cols text;
BEGIN
  SELECT string_agg(quote_ident(column_name), ', ' ORDER BY ordinal_position)
    INTO cols
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'media_kits'
    AND column_name NOT IN ('ad_availability', 'ad_availability_confirmed_at',
                            'available_from', 'available_until', 'availability_note');
  EXECUTE format('GRANT SELECT (%s) ON public.media_kits TO anon', cols);
END $$;
