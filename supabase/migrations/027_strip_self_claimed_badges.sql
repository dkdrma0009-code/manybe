-- 자기 선택이 가능했던 구독자 수·성장 뱃지(sub_100k/500k/1m, fast_growth)를
-- 기존 media_kits.badges에서 일괄 제거한다. 이 뱃지들은 이제 연동 채널
-- 데이터로만 자동 검증되며, 사용자가 미디어킷을 재저장하면 실측 기준으로
-- 다시 부여된다. (예: 26.8만 채널이 자기 선택한 '100만 구독' 허위 뱃지 정리)
UPDATE media_kits
SET badges = (
  SELECT COALESCE(array_agg(b), '{}')
  FROM unnest(badges) AS b
  WHERE b NOT IN ('sub_100k', 'sub_500k', 'sub_1m', 'fast_growth')
)
WHERE badges && ARRAY['sub_100k', 'sub_500k', 'sub_1m', 'fast_growth'];
