-- ══════════════════════════════════════════════════════════════════════════════
-- MANYBE 데모 계정 시드 데이터
--
-- ⚠️  두 단계로 나눠서 실행하세요 (PostgreSQL enum 제약):
--
-- [1단계] STEP 1 블록만 복사해서 Run
-- [2단계] STEP 2 블록만 복사해서 Run
--
-- 실행 전: Supabase Auth → Users 에서 demo@manybe.site / manybe2026! 생성 필요
-- ══════════════════════════════════════════════════════════════════════════════

-- ════════════════════════════════════════════════════════
-- STEP 1: enum 값 추가 (이것만 먼저 Run)
-- ════════════════════════════════════════════════════════
ALTER TYPE deal_status ADD VALUE IF NOT EXISTS 'reviewing';
ALTER TYPE deal_status ADD VALUE IF NOT EXISTS 'in_progress';
ALTER TYPE deal_status ADD VALUE IF NOT EXISTS 'uploaded';


-- ════════════════════════════════════════════════════════
-- STEP 2: 데모 데이터 삽입 (STEP 1 완료 후 이것만 Run)
-- ════════════════════════════════════════════════════════
DO $$
DECLARE
  demo_uid UUID;
  demo_email TEXT := 'demo@manybe.site';
BEGIN
  SELECT id INTO demo_uid FROM auth.users WHERE email = demo_email;

  IF demo_uid IS NULL THEN
    RAISE EXCEPTION '데모 계정(demo@manybe.site)이 없습니다. Supabase Auth에서 먼저 생성하세요.';
  END IF;

  DELETE FROM advertiser_proposals  WHERE creator_id = demo_uid;
  DELETE FROM revenues              WHERE user_id = demo_uid;
  DELETE FROM schedules             WHERE user_id = demo_uid;
  DELETE FROM deals                 WHERE user_id = demo_uid;
  DELETE FROM social_channels       WHERE user_id = demo_uid;
  DELETE FROM creator_profiles      WHERE user_id = demo_uid;
  DELETE FROM users                 WHERE id = demo_uid;
  DELETE FROM profiles              WHERE id = demo_uid;

  INSERT INTO profiles (id, role, display_name, created_at)
  VALUES (demo_uid, 'creator', '지우', now());

  INSERT INTO users (id, email, name, subscriber_count, plan, created_at)
  VALUES (demo_uid, demo_email, '지우', 352000, 'pro', now());

  INSERT INTO creator_profiles (id, user_id, handle, bio, category, media_kit_enabled, inbound_enabled, created_at)
  VALUES (
    demo_uid, demo_uid, 'jiwoo.daily',
    '뷰티·라이프스타일 크리에이터 | 진정성 있는 스킨케어 리뷰',
    ARRAY['뷰티', '스킨케어', '라이프스타일'],
    true, true, now()
  );

  INSERT INTO social_channels (user_id, platform, channel_name, handle, subscriber_count, created_at)
  VALUES
    (demo_uid, 'youtube',   '지우 데일리', 'jiwood.daily', 268000, now()),
    (demo_uid, 'instagram', '지우 일상',   'jiwoo.daily',   84000, now());

  INSERT INTO deals (user_id, brand, title, status, amount, end_date, created_at)
  VALUES
    (demo_uid, '글로우랩',  '4월 뷰티 캠페인',   'in_progress', 3500000, (now() + interval '4 days')::date,   now() - interval '10 days'),
    (demo_uid, '뮤트레인',  '3월 콘텐츠 협찬',   'uploaded',    2200000, (now() - interval '2 days')::date,   now() - interval '20 days'),
    (demo_uid, '비타케어',  '신규 제안',         'inquiry',     1500000, (now() + interval '14 days')::date,  now() - interval '2 days'),
    (demo_uid, '스킨포레',  '스킨케어 리뷰',     'reviewing',   1800000, (now() + interval '10 days')::date,  now() - interval '5 days'),
    (demo_uid, '카페모닝',  '라이프스타일 협찬', 'settled',     1200000, (now() - interval '15 days')::date,  now() - interval '40 days');

  INSERT INTO schedules (user_id, title, type, schedule_date, start_time, created_at)
  VALUES
    (demo_uid, '글로우랩 브랜드 미팅',     'meeting',  now()::date,                       now()::date + interval '10 hours 30 minutes', now()),
    (demo_uid, '스킨케어 촬영',            'content',  now()::date,                       now()::date + interval '14 hours',            now()),
    (demo_uid, 'YouTube 업로드 — 봄 루틴', 'content',  now()::date,                       now()::date + interval '18 hours',            now()),
    (demo_uid, '뮤트레인 협찬 원고 마감',  'deadline', now()::date,                       now()::date + interval '21 hours',            now()),
    (demo_uid, '비타케어 제안서 검토',     'meeting',  (now() + interval '1 day')::date,  now()::date + interval '1 day'  + interval '11 hours', now()),
    (demo_uid, '콘텐츠 기획 정리',         'other',    (now() + interval '2 days')::date, now()::date + interval '2 days' + interval '10 hours', now());

  INSERT INTO revenues (user_id, amount, category, date, title, description, created_at)
  VALUES
    (demo_uid, 3500000, 'sponsorship', (now() - interval '2 days')::date,  '글로우랩 캠페인',  '글로우랩 캠페인',  now()),
    (demo_uid, 2200000, 'sponsorship', (now() - interval '5 days')::date,  '뮤트레인 콘텐츠',  '뮤트레인 콘텐츠',  now()),
    (demo_uid, 450000,  'affiliate',   (now() - interval '8 days')::date,  '어필리에이트',      '어필리에이트',      now()),
    (demo_uid, 1200000, 'sponsorship', (now() - interval '25 days')::date, '카페모닝 협찬',     '카페모닝 협찬',     now()),
    (demo_uid, 320000,  'platform',    (now() - interval '30 days')::date, 'YouTube 광고수익',  'YouTube 광고수익',  now()),
    (demo_uid, 1800000, 'sponsorship', (now() - interval '45 days')::date, '스킨포레 리뷰',     '스킨포레 리뷰',     now()),
    (demo_uid, 280000,  'platform',    (now() - interval '60 days')::date, 'YouTube 광고수익',  'YouTube 광고수익',  now());

  INSERT INTO advertiser_proposals (creator_id, brand_name, message, amount, status, created_at)
  VALUES
    (demo_uid, '글로우랩',      '4월 캠페인 일정 확정 가능하실까요? 5월 초 촬영 일정 맞춰주실 수 있는지 여쭤봅니다.',  3500000, 'accepted', now() - interval '14 minutes'),
    (demo_uid, '뮤트레인',      '3월 콘텐츠 정산서 보내드렸습니다. 계좌 확인 후 이번 주 내 처리 예정입니다.',          2200000, 'accepted', now() - interval '2 hours'),
    (demo_uid, '카페모닝글로우', '브랜드 콜라보 가능하실지 여쭤봅니다. 음료 리뷰 콘텐츠 협업을 제안드리고 싶어요.',    800000,  'pending',  now() - interval '1 day'),
    (demo_uid, '비타케어',      '건강기능식품 협찬 제안드립니다. 자세한 내용은 첨부 파일 확인 부탁드립니다.',           1500000, 'pending',  now() - interval '2 days');

  RAISE NOTICE '데모 데이터 시드 완료: user_id = %', demo_uid;
END $$;
