-- revenues.title은 초기 수동 스키마의 잔재 — 모바일 앱 데이터 모델은
-- category + description만 사용한다. NOT NULL 제약 때문에 앱의 모든
-- 수익 insert(수동 추가, 정산 자동 기록)가 조용히 실패하고 있었다.
ALTER TABLE revenues ALTER COLUMN title DROP NOT NULL;
