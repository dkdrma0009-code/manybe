-- ============================================================
-- Step 2 추가 점검 (읽기 전용 — 아무것도 변경하지 않음)
-- 1차 점검에서 'profiles'를 참조하는 것으로 잡힌 정책 8개의 실제 정의 확인.
-- ('creator_profiles' 같은 이름도 함께 걸렸을 수 있어, public.profiles를
--  실제로 읽는 정책이 있는지 판별해야 030의 영향 범위가 확정된다)
-- + 제안 철회(DELETE) 알려진 이슈 확인용으로 advertiser_proposals 정책도 조회.
-- ============================================================
SELECT jsonb_pretty(jsonb_build_object(

  'policies_referencing_profiles_detail', (
    SELECT jsonb_agg(jsonb_build_object(
      'table', tablename, 'name', policyname, 'cmd', cmd, 'roles', roles,
      'using', qual, 'check', with_check
    ) ORDER BY tablename, policyname)
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename <> 'profiles'
      AND (coalesce(qual, '') ILIKE '%profiles%' OR coalesce(with_check, '') ILIKE '%profiles%')
  ),

  -- 위 정책 중 public.profiles 를 직접 참조하는 것만 (creator_profiles 등 제외)
  'policies_reading_public_profiles', (
    SELECT jsonb_agg(tablename || '.' || policyname)
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename <> 'profiles'
      AND (coalesce(qual, '') || ' ' || coalesce(with_check, '')) ~* '(^|[^a-z_])profiles([^a-z_]|$)'
  ),

  'advertiser_proposals_policies', (
    SELECT jsonb_agg(jsonb_build_object(
      'name', policyname, 'cmd', cmd, 'roles', roles, 'using', qual, 'check', with_check
    ) ORDER BY cmd, policyname)
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'advertiser_proposals'
  )
)) AS step2_inspection_2;
