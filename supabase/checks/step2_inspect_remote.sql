-- ============================================================
-- Step 2 사전 점검 (읽기 전용 — 아무것도 변경하지 않음)
-- 실행: Supabase Dashboard > SQL Editor 에 전체 붙여넣고 Run
-- 결과 1개 JSON 셀을 그대로 복사해서 전달
-- ============================================================
SELECT jsonb_pretty(jsonb_build_object(

  -- 1) profiles 실제 컬럼 (코드가 참조하는 email·niche 존재 여부 확인)
  'profiles_columns', (
    SELECT jsonb_agg(column_name || ':' || data_type ORDER BY ordinal_position)
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles'
  ),

  -- 2) 대상 테이블 RLS 활성화 여부
  'rls_enabled', (
    SELECT jsonb_object_agg(relname, relrowsecurity)
    FROM pg_class
    WHERE relnamespace = 'public'::regnamespace
      AND relname IN ('profiles', 'media_kit_inquiries', 'social_channels', 'social_channel_tokens')
  ),

  -- 3) 대상 테이블의 모든 RLS 정책 (대시보드 수동 생성분 포함)
  'policies', (
    SELECT jsonb_agg(jsonb_build_object(
      'table', tablename, 'name', policyname, 'cmd', cmd,
      'roles', roles, 'using', qual, 'check', with_check
    ) ORDER BY tablename, cmd, policyname)
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('profiles', 'media_kit_inquiries', 'social_channels', 'social_channel_tokens')
  ),

  -- 4) profiles 테이블 단위 권한 (anon / authenticated)
  'profiles_table_grants', (
    SELECT jsonb_agg(grantee || ':' || privilege_type ORDER BY grantee, privilege_type)
    FROM information_schema.role_table_grants
    WHERE table_schema = 'public' AND table_name = 'profiles'
      AND grantee IN ('anon', 'authenticated')
  ),

  -- 5) profiles 컬럼 단위 권한이 이미 걸려 있는지
  'profiles_column_grants', (
    SELECT jsonb_agg(grantee || ':' || privilege_type || ':' || column_name ORDER BY grantee, column_name)
    FROM information_schema.column_privileges
    WHERE table_schema = 'public' AND table_name = 'profiles'
      AND grantee IN ('anon', 'authenticated')
      AND privilege_type = 'SELECT'
  ),

  -- 6) profiles를 참조하는 뷰·함수가 있는지 (권한 변경 영향 범위)
  'views_on_profiles', (
    SELECT jsonb_agg(DISTINCT v.table_name)
    FROM information_schema.view_table_usage v
    WHERE v.table_schema = 'public' AND v.table_name = 'profiles'
  ),

  -- 7) 다른 테이블 정책 중 profiles를 참조하는 것 (권한 변경 시 정책 평가 영향)
  'policies_referencing_profiles', (
    SELECT jsonb_agg(tablename || '.' || policyname)
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename <> 'profiles'
      AND (coalesce(qual, '') ILIKE '%profiles%' OR coalesce(with_check, '') ILIKE '%profiles%')
  ),

  -- 8) 민감 컬럼에 실제 값이 있는 행 수 (값 자체는 출력하지 않음)
  'sensitive_nonnull_counts', (
    SELECT jsonb_build_object(
      'total_profiles',        count(*),
      'push_token',            count(*) FILTER (WHERE push_token IS NOT NULL),
      'business_number',       count(*) FILTER (WHERE business_number IS NOT NULL)
    ) FROM public.profiles
  )
)) AS step2_inspection;
