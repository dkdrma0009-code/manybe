-- ============================================================
-- 미디어킷 공개 정책 정리 + 조회 기록 수집 허용
--
-- 1) 기존 media_kits 공개 SELECT가 is_form_enabled=true 조건이라
--    문의 폼을 끈(기본값) 크리에이터의 공개 링크가 404가 났다.
--    공개 여부는 slug 존재로 판단하고, is_form_enabled는
--    문의 폼 표시 여부만 제어하도록 분리한다.
-- 2) 웹 공개 페이지(anon)가 media_kit_views에 조회를 기록할 수
--    있도록 INSERT 정책을 연다 (집계용 익명 카운트 테이블).
-- ============================================================

DROP POLICY IF EXISTS "media_kits_public_select" ON media_kits;
CREATE POLICY "media_kits_public_select" ON media_kits
  FOR SELECT USING (slug IS NOT NULL);

DROP POLICY IF EXISTS "media_kit_views_public_insert" ON media_kit_views;
CREATE POLICY "media_kit_views_public_insert" ON media_kit_views
  FOR INSERT WITH CHECK (true);
