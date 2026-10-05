-- ============================================================
-- Step 2 보안 테스트 — anon / creator / advertiser 권한 검증
-- 실행: Supabase Dashboard > SQL Editor (Migration 030 적용 전·후 각각 실행해 비교)
--
-- 안전장치: 모든 시도는 서브트랜잭션 안에서 실행 후 "항상" 롤백한다.
--   (쓰기 테스트가 허용돼도 흔적이 남지 않음 — 적용 전 실행해도 안전)
-- 역할 전환: SET LOCAL ROLE + request.jwt.claims 로 PostgREST 요청과 동일한 조건 재현.
-- 샘플 사용자: role별 가장 오래된 profiles 행 1개 (값은 출력하지 않음)
-- ============================================================

DROP TABLE IF EXISTS pg_temp._step2_results;
CREATE TEMP TABLE _step2_results (seq serial, actor text, test text, expected text, result text);

CREATE OR REPLACE FUNCTION pg_temp.probe(actor text, test text, expected text, as_role text, sub uuid, q text)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE n int; res text;
BEGIN
  IF as_role = 'authenticated' AND sub IS NULL THEN
    INSERT INTO _step2_results(actor, test, expected, result) VALUES (actor, test, expected, 'SKIP (해당 role 사용자 없음)');
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
    RAISE EXCEPTION USING ERRCODE = 'P0099';  -- 항상 롤백 (역할 전환·쓰기 모두 되돌림)
  EXCEPTION
    WHEN SQLSTATE 'P0099' THEN NULL;
    WHEN OTHERS THEN res := 'DENIED [' || SQLSTATE || '] ' || left(SQLERRM, 90);
  END;
  INSERT INTO _step2_results(actor, test, expected, result) VALUES (actor, test, expected, res);
END $$;

DO $$
DECLARE
  creator_id    uuid := (SELECT id FROM public.profiles WHERE role = 'creator'    ORDER BY created_at NULLS LAST LIMIT 1);
  advertiser_id uuid := (SELECT id FROM public.profiles WHERE role = 'advertiser' ORDER BY created_at NULLS LAST LIMIT 1);
BEGIN
  -- ── anon (비로그인 방문자 / anon 키 보유자) ──
  PERFORM pg_temp.probe('anon', 'profiles.push_token 읽기',      'DENIED',  'anon', NULL, 'SELECT push_token FROM public.profiles');
  PERFORM pg_temp.probe('anon', 'profiles.business_number 읽기', 'DENIED',  'anon', NULL, 'SELECT business_number FROM public.profiles');
  PERFORM pg_temp.probe('anon', 'profiles select=* 읽기',        'DENIED',  'anon', NULL, 'SELECT * FROM public.profiles');
  PERFORM pg_temp.probe('anon', 'profiles 공개 컬럼(id,full_name,avatar_url)', 'ALLOWED', 'anon', NULL, 'SELECT id, full_name, avatar_url FROM public.profiles');
  PERFORM pg_temp.probe('anon', 'profiles.role 읽기',            'DENIED',  'anon', NULL, 'SELECT role FROM public.profiles');
  PERFORM pg_temp.probe('anon', 'media_kit_inquiries INSERT',    'DENIED',  'anon', NULL,
    $q$INSERT INTO public.media_kit_inquiries (brand_name, contact_email) VALUES ('__step2_probe__', 'probe@example.com')$q$);
  PERFORM pg_temp.probe('anon', 'social_channel_tokens 읽기 (기존 보호 회귀 확인)', 'ALLOWED (0 rows)', 'anon', NULL, 'SELECT * FROM public.social_channel_tokens');

  -- ── creator (로그인 크리에이터) ──
  PERFORM pg_temp.probe('creator', '타인 profiles.push_token 읽기',     'DENIED',  'authenticated', creator_id,
    format('SELECT push_token FROM public.profiles WHERE id <> %L', creator_id));
  PERFORM pg_temp.probe('creator', '타인 profiles.business_number 읽기', 'DENIED', 'authenticated', creator_id,
    format('SELECT business_number FROM public.profiles WHERE id <> %L', creator_id));
  PERFORM pg_temp.probe('creator', '광고주 회사명 읽기 (받은 제안 화면)', 'ALLOWED', 'authenticated', creator_id,
    'SELECT id, full_name, company_name FROM public.profiles WHERE role = ''advertiser''');
  PERFORM pg_temp.probe('creator', '본인 push_token 갱신 (푸시 등록)',   'ALLOWED (1 rows)', 'authenticated', creator_id,
    format('UPDATE public.profiles SET push_token = ''ExponentPushToken[__step2_probe__]'' WHERE id = %L', creator_id));
  PERFORM pg_temp.probe('creator', '본인 이름 수정 (프로필 편집)',        'ALLOWED (1 rows)', 'authenticated', creator_id,
    format('UPDATE public.profiles SET full_name = ''__step2_probe__'' WHERE id = %L', creator_id));
  PERFORM pg_temp.probe('creator', 'media_kit_inquiries INSERT',         'DENIED',  'authenticated', creator_id,
    $q$INSERT INTO public.media_kit_inquiries (brand_name, contact_email) VALUES ('__step2_probe__', 'probe@example.com')$q$);
  PERFORM pg_temp.probe('creator', '본인 문의 읽기 (기존 기능 유지)',     'ALLOWED', 'authenticated', creator_id,
    'SELECT id FROM public.media_kit_inquiries');
  PERFORM pg_temp.probe('creator', '타인 social_channel_tokens 읽기',    'ALLOWED (0 rows)', 'authenticated', creator_id,
    format('SELECT * FROM public.social_channel_tokens WHERE user_id <> %L', creator_id));

  -- ── advertiser (로그인 광고주, 웹) ──
  PERFORM pg_temp.probe('advertiser', '본인 role·full_name 읽기 (웹 세션 판별)', 'ALLOWED (1 rows)', 'authenticated', advertiser_id,
    format('SELECT role, full_name FROM public.profiles WHERE id = %L', advertiser_id));
  PERFORM pg_temp.probe('advertiser', '크리에이터 이름 읽기 (탐색·대시보드)', 'ALLOWED', 'authenticated', advertiser_id,
    'SELECT id, full_name FROM public.profiles WHERE role = ''creator''');
  PERFORM pg_temp.probe('advertiser', '타인 push_token 읽기',              'DENIED',  'authenticated', advertiser_id,
    format('SELECT push_token FROM public.profiles WHERE id <> %L', advertiser_id));
  PERFORM pg_temp.probe('advertiser', '본인 business_number 갱신 (가입)',  'ALLOWED (1 rows)', 'authenticated', advertiser_id,
    format('UPDATE public.profiles SET business_number = ''0000000000'' WHERE id = %L', advertiser_id));
  PERFORM pg_temp.probe('advertiser', 'media_kit_inquiries INSERT',        'DENIED',  'authenticated', advertiser_id,
    $q$INSERT INTO public.media_kit_inquiries (brand_name, contact_email) VALUES ('__step2_probe__', 'probe@example.com')$q$);
END $$;

SELECT actor, test, expected, result,
       CASE WHEN result LIKE 'SKIP%' THEN '–'
            WHEN expected = 'DENIED'  AND result LIKE 'DENIED%'  THEN 'PASS'
            WHEN expected LIKE 'ALLOWED (%' AND result = expected THEN 'PASS'
            WHEN expected = 'ALLOWED' AND result LIKE 'ALLOWED%' THEN 'PASS'
            ELSE 'FAIL' END AS verdict
FROM _step2_results ORDER BY seq;
