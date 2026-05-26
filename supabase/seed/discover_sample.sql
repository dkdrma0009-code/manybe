-- ══════════════════════════════════════════════════════════════════════════════
-- Discover 페이지 샘플 크리에이터 데이터
--
-- 실행 전 준비:
-- Supabase Auth → Users에서 아래 계정 3개 생성 (이메일/비밀번호 방식)
--   creator1@manybe.site / manybe2026!
--   creator2@manybe.site / manybe2026!
--   creator3@manybe.site / manybe2026!
-- 생성 후 이 SQL 실행하세요.
-- ══════════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  uid1 UUID;
  uid2 UUID;
  uid3 UUID;
BEGIN
  SELECT id INTO uid1 FROM auth.users WHERE email = 'creator1@manybe.site';
  SELECT id INTO uid2 FROM auth.users WHERE email = 'creator2@manybe.site';
  SELECT id INTO uid3 FROM auth.users WHERE email = 'creator3@manybe.site';

  IF uid1 IS NULL OR uid2 IS NULL OR uid3 IS NULL THEN
    RAISE EXCEPTION 'Auth에서 3개 계정을 먼저 생성하세요 (creator1~3@manybe.site)';
  END IF;

  -- ── profiles ─────────────────────────────────────────────────────────────
  INSERT INTO profiles (id, full_name, role) VALUES
    (uid1, '김지우', 'creator'),
    (uid2, '박서준', 'creator'),
    (uid3, '이하은', 'creator')
  ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, role = 'creator';

  -- ── social_channels ──────────────────────────────────────────────────────
  DELETE FROM social_channels WHERE user_id IN (uid1, uid2, uid3);

  INSERT INTO social_channels (user_id, platform, channel_name, handle, subscriber_count, view_count, video_count) VALUES
    (uid1, 'youtube',   '김지우 뷰티',    'jiwoo_beauty',   268000, 12000000, 180),
    (uid1, 'instagram', '지우 일상',      'jiwoo.daily',     84000,        0,   0),
    (uid2, 'youtube',   '박서준 테크',    'seojun_tech',    142000,  8500000, 95),
    (uid2, 'instagram', '서준 IT리뷰',    'seojun.tech',     38000,        0,   0),
    (uid3, 'youtube',   '하은이의 일상',  'haeun_life',      95000,  4200000, 210),
    (uid3, 'instagram', '하은 라이프',    'haeun.life',     112000,        0,   0);

  -- ── media_kits ───────────────────────────────────────────────────────────
  DELETE FROM media_kits WHERE user_id IN (uid1, uid2, uid3);

  INSERT INTO media_kits (user_id, slug, bio, category, is_form_enabled, past_brands, pricing) VALUES
    (
      uid1, 'jiwoo-beauty',
      '뷰티·스킨케어 전문 크리에이터입니다. 진정성 있는 리뷰로 구독자와 소통합니다. 협찬 문의 환영해요!',
      '뷰티/패션',
      true,
      '["글로우랩", "이니스프리", "닥터자르트"]'::jsonb,
      '{"youtube": "150만원~", "instagram": "50만원~"}'
    ),
    (
      uid2, 'seojun-tech',
      '테크·IT 리뷰 유튜버. 스마트폰, 노트북, 가전제품 솔직 리뷰. 광고는 실제로 써본 제품만 합니다.',
      '테크/IT',
      true,
      '["삼성전자", "LG전자", "애플코리아"]'::jsonb,
      '{"youtube": "200만원~", "instagram": "80만원~"}'
    ),
    (
      uid3, 'haeun-life',
      '라이프스타일·음식 크리에이터. 일상 브이로그와 맛집 리뷰를 주로 올립니다. 진심 담은 콘텐츠!',
      '라이프스타일',
      true,
      '["카페모닝", "마켓컬리"]'::jsonb,
      '{"youtube": "100만원~", "instagram": "70만원~"}'
    );

  RAISE NOTICE '샘플 크리에이터 데이터 삽입 완료';
END $$;
