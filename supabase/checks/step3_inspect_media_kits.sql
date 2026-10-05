-- ============================================================
-- Step 3 사전 점검: media_kits (읽기 전용 — 아무것도 변경하지 않음)
-- 실행: Supabase Dashboard > SQL Editor 에 전체 붙여넣고 Run
-- 결과 1개 JSON 셀을 그대로 복사해서 전달
-- 개인정보·값 자체는 출력하지 않고 구조와 건수만 조회한다.
-- ============================================================
SELECT jsonb_pretty(jsonb_build_object(

  -- 1) 실제 컬럼 (타입·NULL 허용·기본값) — 새 컬럼명 충돌 여부, slug NOT NULL 확인
  'columns', (
    SELECT jsonb_agg(jsonb_build_object(
      'name', column_name, 'type', data_type,
      'nullable', is_nullable, 'default', column_default
    ) ORDER BY ordinal_position)
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'media_kits'
  ),

  -- 2) 추가 예정 컬럼명이 이미 있는지 (있으면 031 설계 변경 필요)
  'planned_column_conflicts', (
    SELECT jsonb_agg(column_name)
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'media_kits'
      AND column_name IN ('ad_availability', 'ad_availability_confirmed_at',
                          'available_from', 'available_until', 'availability_note')
  ),

  -- 3) 제약·인덱스 (user_id UNIQUE 여부 → 앱의 insert/update 방식과 upsert 가능 여부 판단)
  'constraints', (
    SELECT jsonb_agg(conname || ' [' || contype::text || '] ' || pg_get_constraintdef(oid) ORDER BY conname)
    FROM pg_constraint
    WHERE conrelid = 'public.media_kits'::regclass
  ),
  'indexes', (
    SELECT jsonb_agg(indexname || ': ' || indexdef ORDER BY indexname)
    FROM pg_indexes
    WHERE schemaname = 'public' AND tablename = 'media_kits'
  ),

  -- 4) RLS 활성화 + media_kits 정책 전체 (대시보드 수동 생성분 포함)
  'rls_enabled', (
    SELECT relrowsecurity FROM pg_class WHERE oid = 'public.media_kits'::regclass
  ),
  'policies', (
    SELECT jsonb_agg(jsonb_build_object(
      'name', policyname, 'cmd', cmd, 'roles', roles,
      'using', qual, 'check', with_check
    ) ORDER BY cmd, policyname)
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'media_kits'
  ),

  -- 5) anon / authenticated 테이블·컬럼 권한 (새 컬럼이 자동 공개되는지 판단)
  'table_grants', (
    SELECT jsonb_agg(grantee || ':' || privilege_type ORDER BY grantee, privilege_type)
    FROM information_schema.role_table_grants
    WHERE table_schema = 'public' AND table_name = 'media_kits'
      AND grantee IN ('anon', 'authenticated')
  ),
  'column_select_grants_count', (
    SELECT jsonb_object_agg(grantee, n) FROM (
      SELECT grantee, count(*) AS n
      FROM information_schema.column_privileges
      WHERE table_schema = 'public' AND table_name = 'media_kits'
        AND grantee IN ('anon', 'authenticated') AND privilege_type = 'SELECT'
      GROUP BY grantee
    ) g
  ),

  -- 6) 트리거 (updated_at 자동 갱신 등 — 확인일 서버 시각 처리 방식 판단)
  'triggers', (
    SELECT jsonb_agg(tgname || ': ' || pg_get_triggerdef(oid) ORDER BY tgname)
    FROM pg_trigger
    WHERE tgrelid = 'public.media_kits'::regclass AND NOT tgisinternal
  ),

  -- 7) media_kits를 참조하는 다른 테이블 정책·뷰 (컬럼 추가 영향 범위)
  'policies_referencing_media_kits', (
    SELECT jsonb_agg(tablename || '.' || policyname ORDER BY tablename, policyname)
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename <> 'media_kits'
      AND (coalesce(qual, '') || ' ' || coalesce(with_check, '')) ~* 'media_kits'
  ),
  'views_on_media_kits', (
    SELECT jsonb_agg(DISTINCT view_name)
    FROM information_schema.view_table_usage
    WHERE table_schema = 'public' AND table_name = 'media_kits'
  ),

  -- 8) 데이터 현황 (건수만) — 기존 데이터 영향·홈 카드 대상 규모 판단
  'counts', (
    SELECT jsonb_build_object(
      'media_kits_total',            (SELECT count(*) FROM public.media_kits),
      'is_form_enabled_true',        (SELECT count(*) FROM public.media_kits WHERE is_form_enabled IS TRUE),
      'pricing_set',                 (SELECT count(*) FROM public.media_kits WHERE pricing IS NOT NULL),
      'category_null',               (SELECT count(*) FROM public.media_kits WHERE category IS NULL),
      'user_id_null',                (SELECT count(*) FROM public.media_kits WHERE user_id IS NULL),
      'users_with_multiple_kits',    (SELECT count(*) FROM (SELECT user_id FROM public.media_kits
                                        WHERE user_id IS NOT NULL GROUP BY user_id HAVING count(*) > 1) d),
      'creators_total',              (SELECT count(*) FROM public.profiles WHERE role = 'creator'),
      'creators_without_kit',        (SELECT count(*) FROM public.profiles p WHERE p.role = 'creator'
                                        AND NOT EXISTS (SELECT 1 FROM public.media_kits k WHERE k.user_id = p.id))
    )
  )
)) AS step3_media_kits_inspection;
