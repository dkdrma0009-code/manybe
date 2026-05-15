import { supabase } from '../api/supabase';
import type { CreatorNiche, PortfolioIntelligence } from '../types/mediaKit';

const NICHE_KEYWORDS: Record<CreatorNiche, string[]> = {
  beauty:    ['뷰티', '화장품', '스킨케어', '메이크업', '코스메틱', '향수', '헤어'],
  lifestyle: ['라이프스타일', '홈리빙', '인테리어', '데일리', '일상'],
  tech:      ['테크', 'IT', '가전', '앱', '소프트웨어', '스마트', '전자'],
  food:      ['푸드', '식품', '음식', '맛집', '레스토랑', '카페', '쿠킹', '요리'],
  travel:    ['여행', '호텔', '항공', '투어', '리조트'],
  fitness:   ['운동', '헬스', '피트니스', '다이어트', '스포츠', '요가'],
  gaming:    ['게임', '게이밍', '콘솔'],
  education: ['교육', '강의', '학습', '책', '독서', '영어'],
  finance:   ['금융', '투자', '주식', '보험', '재테크'],
  general:   [],
};

function detectNiche(texts: string[]): { niche: CreatorNiche; keywords: string[] } {
  const combined = texts.join(' ').toLowerCase();
  const scores: Record<CreatorNiche, number> = {
    beauty: 0, lifestyle: 0, tech: 0, food: 0, travel: 0,
    fitness: 0, gaming: 0, education: 0, finance: 0, general: 0,
  };
  const found: string[] = [];

  for (const [niche, kws] of Object.entries(NICHE_KEYWORDS) as [CreatorNiche, string[]][]) {
    for (const kw of kws) {
      if (combined.includes(kw)) {
        scores[niche]++;
        if (!found.includes(kw)) found.push(kw);
      }
    }
  }

  const top = (Object.entries(scores) as [CreatorNiche, number][])
    .sort((a, b) => b[1] - a[1])[0];

  return {
    niche: top[1] > 0 ? top[0] : 'general',
    keywords: found.slice(0, 5),
  };
}

export async function computePortfolioIntelligence(
  userId: string,
  manualBrands: string[],
): Promise<PortfolioIntelligence> {
  const { data: deals } = await supabase
    .from('deals')
    .select('id, brand, title, status, end_date')
    .eq('user_id', userId);

  const dealList = deals ?? [];
  const dealCount = dealList.length;
  const settledCount = dealList.filter((d) => d.status === 'settled').length;
  const completionRate = dealCount > 0 ? Math.round((settledCount / dealCount) * 100) : 0;

  // Reliability: settled / (settled + cancelled); defaults to 100 for new creators
  const finalized = dealList.filter(
    (d) => d.status === 'settled' || d.status === 'cancelled',
  );
  const reliabilityScore = finalized.length > 0
    ? Math.round((settledCount / finalized.length) * 100)
    : 100;

  // Top brands: combine deal brands + manual brands weighted by frequency
  const brandFreq: Record<string, number> = {};
  for (const d of dealList) {
    if (d.brand) brandFreq[d.brand] = (brandFreq[d.brand] ?? 0) + 1;
  }
  for (const b of manualBrands) {
    brandFreq[b] = (brandFreq[b] ?? 0) + 0.5;
  }
  const topBrands = Object.entries(brandFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([brand]) => brand);

  // Niche detection from deal brands + titles + manual brands
  const texts = [
    ...dealList.map((d) => `${d.brand ?? ''} ${d.title ?? ''}`),
    ...manualBrands,
  ];
  const { niche, keywords } = detectNiche(texts);

  return {
    topBrands,
    reliabilityScore,
    nicheKeywords: keywords,
    primaryNiche: niche,
    dealCount,
    settledCount,
    completionRate,
  };
}
