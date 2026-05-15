import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  CreatorNiche, CreatorBadge, CollaborationPitch,
  MediaKitIntelligence, PortfolioIntelligence,
} from '../types/mediaKit';

type Scale = 'nano' | 'micro' | 'mid' | 'macro';

async function getCreatorScale(): Promise<Scale> {
  try {
    const v = await AsyncStorage.getItem('creator_scale');
    return (v as Scale) ?? 'micro';
  } catch { return 'micro'; }
}

const SUBSCRIBER_RANGES: Record<Scale, string> = {
  nano:  '1만~10만',
  micro: '10만~50만',
  mid:   '50만~200만',
  macro: '200만 이상',
};

export const NICHE_LABELS: Record<CreatorNiche, string> = {
  beauty:    '뷰티',
  lifestyle: '라이프스타일',
  tech:      '테크',
  food:      '푸드',
  travel:    '여행',
  fitness:   '피트니스',
  gaming:    '게이밍',
  education: '교육',
  finance:   '재테크',
  general:   '크리에이터',
};

function buildBio(scale: Scale, niche: CreatorNiche, topBrands: string[]): string {
  const nicheLabel = NICHE_LABELS[niche];
  const subs = SUBSCRIBER_RANGES[scale];
  const brandSuffix = topBrands.length > 0
    ? ` ${topBrands.slice(0, 2).join(', ')} 등 ${topBrands.length}개 브랜드와 협업`
    : '';

  const templates: Record<Scale, string> = {
    nano:  `${nicheLabel} 크리에이터 | 구독자 ${subs} | 진정성 있는 리뷰로 소통합니다${brandSuffix}.`,
    micro: `${nicheLabel} 전문 크리에이터 | 구독자 ${subs} | 높은 참여율과 신뢰도로 브랜드 가치를 전달합니다${brandSuffix}.`,
    mid:   `${nicheLabel} 인플루언서 | 구독자 ${subs} | 검증된 콘텐츠 파워로 브랜드 캠페인을 성공적으로 운영합니다${brandSuffix}.`,
    macro: `대형 ${nicheLabel} 크리에이터 | 구독자 ${subs} | 탁월한 도달력과 풍부한 파트너십 경험으로 최상의 결과를 제공합니다${brandSuffix}.`,
  };
  return templates[scale];
}

function buildPitch(
  scale: Scale,
  niche: CreatorNiche,
  topBrands: string[],
  reliabilityScore: number,
): CollaborationPitch {
  const nicheLabel = NICHE_LABELS[niche];
  const subs = SUBSCRIBER_RANGES[scale];
  const brandLine = topBrands.length > 0
    ? `${topBrands.slice(0, 2).join(', ')} 등 다수 브랜드와 협업한 경험이 있으며`
    : '다양한 브랜드와 협업한 경험이 있으며';

  const short =
    `안녕하세요, 구독자 ${subs} ${nicheLabel} 크리에이터입니다. 협업에 관심 있으시면 연락 주세요!`;

  const long =
    `안녕하세요, 저는 ${subs} 구독자를 보유한 ${nicheLabel} 전문 크리에이터입니다. ` +
    `${brandLine} 협찬 완료율 ${reliabilityScore}%의 신뢰할 수 있는 파트너입니다. ` +
    `브랜드의 가치를 진정성 있게 전달하는 콘텐츠로 실질적인 성과를 만들어 드립니다. ` +
    `협업 제안이나 문의는 언제든지 환영합니다.`;

  return { short, long, generatedAt: new Date().toISOString() };
}

function buildBadges(portfolio: PortfolioIntelligence, scale: Scale): CreatorBadge[] {
  const badges: CreatorBadge[] = [];

  if (portfolio.dealCount > 0) {
    badges.push({
      type: 'deal_count',
      label: '협업 실적',
      value: `${portfolio.dealCount}건`,
      color: '#6E56F0',
      bgColor: '#F0EFFE',
    });
  }

  if (portfolio.reliabilityScore >= 70) {
    badges.push({
      type: 'reliability',
      label: '완료율',
      value: `${portfolio.reliabilityScore}%`,
      color: '#059669',
      bgColor: '#D1FAE5',
    });
  }

  const scaleMap: Record<Scale, string> = {
    nano:  '나노',
    micro: '마이크로',
    mid:   '미드',
    macro: '매크로',
  };
  badges.push({
    type: 'scale',
    label: '인플루언서',
    value: scaleMap[scale],
    color: '#B45309',
    bgColor: '#FEF3C7',
  });

  if (portfolio.primaryNiche !== 'general') {
    badges.push({
      type: 'niche_expert',
      label: '전문 분야',
      value: NICHE_LABELS[portfolio.primaryNiche],
      color: '#0369A1',
      bgColor: '#E0F2FE',
    });
  }

  return badges;
}

export async function generateMediaKitIntelligence(
  portfolio: PortfolioIntelligence,
): Promise<MediaKitIntelligence> {
  const scale = await getCreatorScale();
  const aiGeneratedBio = buildBio(scale, portfolio.primaryNiche, portfolio.topBrands);
  const pitch = buildPitch(scale, portfolio.primaryNiche, portfolio.topBrands, portfolio.reliabilityScore);
  const badges = buildBadges(portfolio, scale);

  return {
    portfolio,
    pitch,
    badges,
    aiGeneratedBio,
    generatedAt: new Date().toISOString(),
  };
}
