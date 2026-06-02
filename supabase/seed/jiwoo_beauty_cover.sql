-- Supabase SQL Editor에서 실행
-- 1. 컬럼 추가
ALTER TABLE media_kits ADD COLUMN IF NOT EXISTS cover_image_url text DEFAULT NULL;

-- 2. jiwoo-beauty 커버 이미지 설정
UPDATE media_kits
SET cover_image_url = 'https://export-download.canva.com/s6lrI/DAHLZXs6lrI/-1/0/0001-7024994631233485697.jpg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAQYCGKMUH5AO7UJ26%2F20260601%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20260601T060009Z&X-Amz-Expires=89275&X-Amz-Signature=ec984f6edf5101548c2f59163fac60330dabd34dd554df7b2e7eb1450d318f9f&X-Amz-SignedHeaders=host%3Bx-amz-expected-bucket-owner&response-expires=Tue%2C%2002%20Jun%202026%2006%3A48%3A04%20GMT'
WHERE slug = 'jiwoo-beauty';
