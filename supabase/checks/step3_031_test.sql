-- ============================================================
-- Step 3 / Migration 031 권한·제약 테스트
-- 실행: Supabase Dashboard > SQL Editor (031 적용 전·후 각각 실행해 비교)
--
-- 안전장치: 모든 시도는 서브트랜잭션 안에서 실행 후 "항상" 롤백한다.
-- 역할 전환: SET LOCAL ROLE + request.jwt.claims (PostgREST 요청과 동일 조건).
-- 샘플: media_kits를 가진 크리에이터 2명(A, B), media_kits가 없는 크리에이터 1명(C).
-- 031 적용 전에는 신규 컬럼이 없어 일부 항목이 FAIL(컬럼 없음)로 나오는 것이 정상.
-- ============================================================

DROP TABLE IF EXISTS pg_temp._step3_results;
CREATE TEMP TABLE _step3_results (seq serial, actor text, test text, expected text, result text);

CREATE OR REPLACE FUNCTION pg_temp.probe3(actor text, test text, expected text, as_role text, sub uuid, q text)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE n int; res text;
BEGIN
  IF as_role = 'authenticated' AND sub IS NULL THEN
    INSERT INTO _step3_results(actor, test, expected, result) VALUES (actor, test, expected, 'SKIP (샘플 사용자 없음)');
    RETURN;
  END IF;
  BEGIN
    PERFORM set_config('request.jwt.claims',
      CASE WHEN sub IS NULL THEN '{"role":"anon"}'
           ELSE json_build_object('sub', sub, 'role', 'authenticated')::text END, true);
    EXECUTE format('SET LOCAL ROLE %I', as_role);
    EXECUTE q;
    GET DIAGNOSTICS n = ROW_COUNT;
    res := 'ALLOWED (' || n || ' rows)';
    RAISE EXCEPTION USING ERRCODE = 'P0099';  -- 항상 롤백
  EXCEPTION
    WHEN SQLSTATE 'P0099' THEN NULL;
    WHEN OTHERS THEN res := 'DENIED [' || SQLSTATE || '] ' || left(SQLERRM, 90);
  END;
  INSERT INTO _step3_results(actor, test, expected, result) VALUES (actor, test, expected, res);
END $$;

DO $$
DECLARE
  a uuid := (SELECT k.user_id FROM public.media_kits k JOIN public.profiles p ON p.id = k.user_id
             WHERE p.role = 'creator' ORDER BY k.user_id LIMIT 1);
  b uuid := (SELECT k.user_id FROM public.media_kits k JOIN public.profiles p ON p.id = k.user_id
             WHERE p.role = 'creator' ORDER BY k.user_id OFFSET 1 LIMIT 1);
  c uuid := (SELECT p.id FROM public.profiles p WHERE p.role = 'creator'
             AND NOT EXISTS (SELECT 1 FROM public.media_kits k WHERE k.user_id = p.id) LIMIT 1);
  avail_cols text := 'ad_availability, ad_availability_confirmed_at, available_from, available_until, availability_note';
BEGIN
  -- ── anon: 기존 공개 페이지가 쓰는 컬럼은 유지 ──
  PERFORM pg_temp.probe3('anon', '/discover 조회 컬럼', 'ALLOWED', 'anon', NULL,
    'SELECT id, user_id, slug, bio, category, past_brands, pricing FROM public.media_kits WHERE is_form_enabled = true');
  PERFORM pg_temp.probe3('anon', '/[slug] 조회 컬럼 (명시 SELECT)', 'ALLOWED', 'anon', NULL,
    'SELECT id, user_id, slug, bio, pricing, past_brands, is_form_enabled, view_count, category, badges, theme, section_order, cover_image_url, highlights FROM public.media_kits');
  PERFORM pg_temp.probe3('anon', '/[slug]/inquiry 조회 컬럼', 'ALLOWED', 'anon', NULL,
    'SELECT id, user_id, is_form_enabled FROM public.media_kits');
  PERFORM pg_temp.probe3('anon', 'profiles 공개 읽기 (media_kits 참조 정책 평가)', 'ALLOWED', 'anon', NULL,
    'SELECT id, full_name FROM public.profiles');

  -- ── anon: 신규 availability 5개 비공개 ──
  PERFORM pg_temp.probe3('anon', 'ad_availability 읽기', 'DENIED', 'anon', NULL,
    'SELECT ad_availability FROM public.media_kits');
  PERFORM pg_temp.probe3('anon', '확인일·일정·메모 읽기', 'DENIED', 'anon', NULL,
    'SELECT ad_availability_confirmed_at, available_from, available_until, availability_note FROM public.media_kits');
  PERFORM pg_temp.probe3('anon', 'select=* (신규 컬럼 포함이라 거부되는 것이 정상)', 'DENIED', 'anon', NULL,
    'SELECT * FROM public.media_kits');
  PERFORM pg_temp.probe3('anon', '신규 컬럼 UPDATE', 'ALLOWED (0 rows)', 'anon', NULL,
    $q$UPDATE public.media_kits SET ad_availability = 'accepting'$q$);

  -- ── authenticated (owner A) ──
  PERFORM pg_temp.probe3('creator A', '본인 availability 읽기', 'ALLOWED (1 rows)', 'authenticated', a,
    format('SELECT %s FROM public.media_kits WHERE user_id = %L', avail_cols, a));
  PERFORM pg_temp.probe3('creator A', '타인 availability 읽기 (Step 3: authenticated 전체 허용)', 'ALLOWED', 'authenticated', a,
    format('SELECT %s FROM public.media_kits WHERE user_id <> %L', avail_cols, a));
  PERFORM pg_temp.probe3('creator A', '본인 상태+일정 저장 (+is_form_enabled 동기화)', 'ALLOWED (1 rows)', 'authenticated', a,
    format($q$UPDATE public.media_kits SET ad_availability = 'accepting', available_from = current_date,
              available_until = current_date + 30, availability_note = '주말 촬영 가능', is_form_enabled = true
              WHERE user_id = %L$q$, a));
  PERFORM pg_temp.probe3('creator A', 'not_accepting 저장 (일정 정리)', 'ALLOWED (1 rows)', 'authenticated', a,
    format($q$UPDATE public.media_kits SET ad_availability = 'not_accepting', available_from = NULL,
              available_until = NULL, availability_note = NULL, is_form_enabled = false WHERE user_id = %L$q$, a));
  PERFORM pg_temp.probe3('creator A', '재확인 (confirmed_at만 전송)', 'ALLOWED (1 rows)', 'authenticated', a,
    format('UPDATE public.media_kits SET ad_availability_confirmed_at = now() WHERE user_id = %L', a));
  PERFORM pg_temp.probe3('creator A', '소개만 수정 (기존 기능)', 'ALLOWED (1 rows)', 'authenticated', a,
    format($q$UPDATE public.media_kits SET bio = '__step3_probe__' WHERE user_id = %L$q$, a));
  PERFORM pg_temp.probe3('creator A', '타인 availability 수정', 'ALLOWED (0 rows)', 'authenticated', a,
    format($q$UPDATE public.media_kits SET ad_availability = 'accepting' WHERE user_id <> %L$q$, a));

  -- ── CHECK 제약 ──
  PERFORM pg_temp.probe3('creator A', 'CHECK: 허용되지 않은 상태값', 'DENIED', 'authenticated', a,
    format($q$UPDATE public.media_kits SET ad_availability = 'maybe' WHERE user_id = %L$q$, a));
  PERFORM pg_temp.probe3('creator A', 'CHECK: 종료일 < 시작일', 'DENIED', 'authenticated', a,
    format('UPDATE public.media_kits SET available_from = current_date, available_until = current_date - 1 WHERE user_id = %L', a));
  PERFORM pg_temp.probe3('creator A', 'CHECK: 메모 101자', 'DENIED', 'authenticated', a,
    format('UPDATE public.media_kits SET availability_note = repeat(''가'', 101) WHERE user_id = %L', a));
  PERFORM pg_temp.probe3('creator A', 'CHECK: 메모 100자 (경계값)', 'ALLOWED (1 rows)', 'authenticated', a,
    format('UPDATE public.media_kits SET availability_note = repeat(''가'', 100) WHERE user_id = %L', a));

  -- ── owner B 회귀, 신규 INSERT (C) ──
  PERFORM pg_temp.probe3('creator B', '본인 단가 수정 (기존 기능)', 'ALLOWED (1 rows)', 'authenticated', b,
    format($q$UPDATE public.media_kits SET pricing = '{"short_form": 100000}'::jsonb WHERE user_id = %L$q$, b));
  PERFORM pg_temp.probe3('creator C', '미디어킷 신규 생성 (기존 기능)', 'ALLOWED (1 rows)', 'authenticated', c,
    format($q$INSERT INTO public.media_kits (user_id, slug) VALUES (%L, '__step3_probe__')$q$, c));
  PERFORM pg_temp.probe3('creator C', '미디어킷 신규 생성 + availability', 'ALLOWED (1 rows)', 'authenticated', c,
    format($q$INSERT INTO public.media_kits (user_id, slug, ad_availability) VALUES (%L, '__step3_probe2__', 'accepting')$q$, c));
END $$;

SELECT actor, test, expected, result,
       CASE WHEN result LIKE 'SKIP%' THEN '–'
            WHEN expected = 'DENIED'  AND result LIKE 'DENIED%'  THEN 'PASS'
            WHEN expected LIKE 'ALLOWED (%' AND result = expected THEN 'PASS'
            WHEN expected = 'ALLOWED' AND result LIKE 'ALLOWED%' THEN 'PASS'
            ELSE 'FAIL' END AS verdict
FROM _step3_results ORDER BY seq;
