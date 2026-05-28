-- 기존 샘플 데이터 정리
DELETE FROM media_kits WHERE slug IN (
  'yuna-beauty','dohyun-game','minji-food','junho-tech','seoyeon-life',
  'jiwoo-travel','sungmin-fit','nayeon-edu','hyunseok-tv','yeeun-beauty'
);
DELETE FROM social_channels WHERE user_id IN (
  SELECT id FROM auth.users WHERE email LIKE 'sample_c%@manybe.site'
);
DELETE FROM profiles WHERE id IN (
  SELECT id FROM auth.users WHERE email LIKE 'sample_c%@manybe.site'
);
-- auth.users FK 없는 고아 profiles 정리
DELETE FROM profiles WHERE id NOT IN (SELECT id FROM auth.users);
DELETE FROM auth.users WHERE email LIKE 'sample_c%@manybe.site';

-- UUID 임시 테이블
CREATE TEMP TABLE _seed_ids AS
SELECT
  gs.i,
  gen_random_uuid() AS id,
  'sample_c' || gs.i || '@manybe.site' AS email
FROM generate_series(1, 10) AS gs(i);

-- auth.users 삽입
INSERT INTO auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data, is_super_admin
)
SELECT
  id, '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated',
  email, '', now(), now(), now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{}'::jsonb, false
FROM _seed_ids;

-- profiles (트리거가 자동 생성하므로 UPDATE로 업데이트)
UPDATE profiles p SET full_name = n.name, role = 'creator'
FROM _seed_ids s
JOIN (VALUES
  (1,'최유나'),(2,'김도현'),(3,'박민지'),(4,'이준호'),(5,'정서연'),
  (6,'한지우'),(7,'윤성민'),(8,'장나연'),(9,'오현석'),(10,'신예은')
) AS n(i, name) ON s.i = n.i
WHERE p.id = s.id;

-- social_channels
INSERT INTO social_channels (user_id, platform, channel_name, handle, subscriber_count, view_count, video_count)
SELECT s.id, c.platform, c.channel_name, c.handle, c.subs, c.views, c.videos
FROM _seed_ids s
JOIN (VALUES
  (1,'youtube',  '유나뷰티',       'yuna_beauty',  520000,28000000,230),
  (1,'instagram','유나 일상',       'yuna.daily',   190000,0,0),
  (2,'youtube',  '도현 게임채널',   'dohyun_game',  380000,45000000,410),
  (2,'tiktok',   '도현_게임',       'dohyun.game',  720000,0,0),
  (3,'youtube',  '민지의 맛집투어', 'minji_food',   215000,18000000,320),
  (3,'instagram','민지 맛집',       'minji.food',   130000,0,0),
  (4,'youtube',  '준호테크',        'junho_tech',   890000,62000000,185),
  (4,'instagram','준호 IT',         'junho.tech',    45000,0,0),
  (5,'youtube',  '서연의 하루',     'seoyeon_life', 165000,9800000,280),
  (5,'instagram','서연 브이로그',   'seoyeon.log',  310000,0,0),
  (6,'youtube',  '지우 여행기',     'jiwoo_travel', 430000,33000000,150),
  (6,'instagram','지우 트래블',     'jiwoo.travel', 280000,0,0),
  (7,'youtube',  '성민 운동채널',   'sungmin_fit',  340000,21000000,200),
  (7,'tiktok',   '성민_피트니스',   'sungmin.fit',  550000,0,0),
  (8,'youtube',  '나연쌤',          'nayeon_edu',   760000,55000000,420),
  (8,'instagram','나연쌤 일상',     'nayeon.edu',    88000,0,0),
  (9,'youtube',  '현석TV',          'hyunseok_tv', 1200000,98000000,340),
  (9,'tiktok',   '현석_엔터',       'hyunseok.ent', 430000,0,0),
  (10,'instagram','예은 스킨케어',  'yeeun_skin',   620000,0,0),
  (10,'tiktok',  '예은뷰티',        'yeeun.beauty', 890000,0,0)
) AS c(i, platform, channel_name, handle, subs, views, videos) ON s.i = c.i;

-- media_kits
INSERT INTO media_kits (user_id, slug, bio, category, is_form_enabled, past_brands, pricing)
SELECT s.id, m.slug, m.bio, m.category, true, m.brands::jsonb, m.pricing::jsonb
FROM _seed_ids s
JOIN (VALUES
  (1,'yuna-beauty','52만 구독자 뷰티 크리에이터. 스킨케어부터 메이크업까지 직접 써본 제품만 리뷰합니다.','뷰티/패션','["라네즈","헤라","에스티로더","맥"]','{"short_form":2000000,"long_form":5000000,"story":800000}'),
  (2,'dohyun-game','게임 리뷰·공략 전문. 유튜브 38만 + 틱톡 72만. RPG부터 FPS까지.','게임','["넥슨","넷마블","크래프톤"]','{"short_form":1500000,"long_form":4000000,"mention":800000}'),
  (3,'minji-food','전국 맛집 탐방 크리에이터. 솔직한 리뷰와 레시피로 소통합니다.','음식/요리','["마켓컬리","오뚜기","GS25"]','{"short_form":1200000,"long_form":3000000,"story":500000}'),
  (4,'junho-tech','89만 구독자 테크 유튜버. 스마트폰·노트북·가전 전문 리뷰.','테크/IT','["삼성","LG","애플","소니","다이슨"]','{"short_form":3000000,"long_form":8000000,"mention":2000000}'),
  (5,'seoyeon-life','일상 브이로그 크리에이터. 인스타 31만 팔로워와 함께하는 감성 라이프스타일.','라이프스타일','["무신사","29CM","오늘의집"]','{"short_form":1000000,"long_form":2500000,"story":600000}'),
  (6,'jiwoo-travel','43만 구독자 여행 크리에이터. 국내외 감성 여행 브이로그.','여행','["야놀자","에어비앤비","대한항공"]','{"short_form":2000000,"long_form":5000000,"dedicated":8000000}'),
  (7,'sungmin-fit','피트니스 전문. 유튜브 34만 + 틱톡 55만. 홈트레이닝·식단 관리.','스포츠','["나이키","언더아머","뉴발란스"]','{"short_form":1500000,"long_form":3500000,"mention":1000000}'),
  (8,'nayeon-edu','76만 구독자 교육 크리에이터. 수학·영어·코딩을 쉽고 재미있게.','교육','["교원","EBS","클래스101"]','{"short_form":2500000,"long_form":6000000,"dedicated":10000000}'),
  (9,'hyunseok-tv','120만 구독자 엔터테인먼트 크리에이터. 예능·토크·챌린지 전문.','엔터테인먼트','["삼성화재","현대카드","카카오","배민"]','{"short_form":5000000,"long_form":12000000,"dedicated":15000000}'),
  (10,'yeeun-beauty','인스타 62만 + 틱톡 89만 뷰티 인플루언서. 스킨케어·메이크업 숏폼 전문.','뷰티/패션','["롬앤","클리오","토니모리"]','{"story":1500000,"short_form":2500000,"mention":1000000}')
) AS m(i, slug, bio, category, brands, pricing) ON s.i = m.i;

DROP TABLE _seed_ids;

SELECT '완료: 크리에이터 10명 삽입' AS result;
