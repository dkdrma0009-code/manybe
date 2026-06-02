-- Supabase SQL Editor에서 실행
-- 1. highlights 컬럼 추가
ALTER TABLE media_kits ADD COLUMN IF NOT EXISTS highlights jsonb DEFAULT '[]'::jsonb;

-- 2. jiwoo-beauty 하이라이트 데이터 설정
UPDATE media_kits
SET highlights = '[
  {
    "id": "1",
    "title": "🔥 인기 영상 TOP 3",
    "items": [
      { "label": "스킨케어 루틴 공개 (feat. 이니스프리)", "value": "조회수 120만", "note": "좋아요 4.2만 · 댓글 2,800개" },
      { "label": "여름 선크림 4종 비교 리뷰", "value": "조회수 85만", "note": "좋아요 3.1만 · 구독자 급증 영상" },
      { "label": "무신사 콜라보 언박싱 + 메이크업", "value": "조회수 61만", "note": "브랜드 직접 협찬 제작" }
    ]
  },
  {
    "id": "2",
    "title": "🤝 주요 브랜드 협업 성과",
    "items": [
      { "label": "이니스프리 봄 캠페인", "value": "참여율 12.4%", "note": "뷰티 카테고리 평균 4배" },
      { "label": "닥터자르트 전용 할인코드", "value": "전환율 8.1%", "note": "2주간 누적 판매 340건" },
      { "label": "글로우랩 신제품 리뷰", "value": "조회수 42만", "note": "출시 3일 내 완판 기여" }
    ]
  },
  {
    "id": "3",
    "title": "📊 채널 핵심 지표",
    "items": [
      { "label": "평균 조회수", "value": "50만+", "note": "최근 6개월 기준" },
      { "label": "광고 평균 참여율", "value": "8.2%", "note": "업계 평균 2.8% 대비 3배" },
      { "label": "구독자 증가율", "value": "+15%/월", "note": "최근 3개월 연속 성장" },
      { "label": "광고 콘텐츠 재구매율", "value": "67%", "note": "협업 브랜드 중 재계약 비율" }
    ]
  }
]'::jsonb
WHERE slug = 'jiwoo-beauty';
