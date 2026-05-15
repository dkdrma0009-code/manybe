// Scale-aware, context-aware draft generation for creator workflow automation.
// Pure local computation — no network calls. Creator scale read from AsyncStorage.

import AsyncStorage from '@react-native-async-storage/async-storage';

type Scale = 'nano' | 'micro' | 'mid' | 'macro';
type RelationshipLevel = 'new' | 'returning' | 'frequent';

export type DraftType =
  | 'followup'
  | 'settlement_request'
  | 'inquiry_response'
  | 'reengagement_pitch'
  | 'schedule_coordination';

export interface DraftContext {
  draftType: DraftType;
  brand: string;
  dealTitle?: string;
  dealAmount?: number;
  daysSince?: number;
  relationshipLevel?: RelationshipLevel;
  budget?: string;
}

async function getScale(): Promise<Scale> {
  try {
    const v = await AsyncStorage.getItem('creator_scale');
    return (v as Scale) ?? 'micro';
  } catch { return 'micro'; }
}

// ─── Draft builders (pure, no async) ─────────────────────────────────────────

function followUp(scale: Scale, ctx: DraftContext): string {
  const { brand, dealTitle = '협찬', daysSince = 0, relationshipLevel = 'new' } = ctx;
  const warmth = relationshipLevel === 'frequent' ? `${brand} 파트너` : `${brand}`;
  switch (scale) {
    case 'nano':
      return `안녕하세요! ${warmth} 담당자님 😊\n${dealTitle} 관련해서 진행 상황 여쭤봐도 될까요?${daysSince > 0 ? ` 마지막 연락 후 ${daysSince}일 정도 됐는데` : ''} 혹시 업데이트가 있으신지 확인하고 싶었어요!`;
    case 'micro':
      return `안녕하세요 ${brand} 담당자님,\n${dealTitle} 협찬 건 관련하여 현재 진행 현황을 확인드리고자 연락드립니다.${daysSince > 0 ? ` 마지막 업데이트 이후 ${daysSince}일이 지났습니다.` : ''}\n혹시 진행에 어려운 점이 있으신가요? 편하게 말씀해 주세요.`;
    case 'mid':
      return `안녕하세요 ${brand} 마케팅 담당자님,\n${dealTitle} 캠페인 진행 상황을 공유해 주실 수 있을까요?${daysSince > 0 ? ` ${daysSince}일간 업데이트가 없어 확인 연락드립니다.` : ''}\n원활한 진행을 위해 추가로 필요한 사항이 있으시면 말씀 부탁드립니다.`;
    case 'macro':
      return `안녕하세요 ${brand} 마케팅팀 담당자님,\n${dealTitle} 캠페인 현황 업데이트를 요청드립니다.${daysSince > 0 ? ` ${daysSince}일간 진행 상황 공유가 없어 확인차 연락드립니다.` : ''}\n일정 또는 방향에 변경이 있으실 경우 사전 공유 부탁드립니다.`;
  }
}

function settlementRequest(scale: Scale, ctx: DraftContext): string {
  const { brand, dealTitle = '협찬', dealAmount, daysSince = 0 } = ctx;
  const amountStr = dealAmount && dealAmount > 0 ? ` (${dealAmount.toLocaleString()}원)` : '';
  switch (scale) {
    case 'nano':
      return `안녕하세요 ${brand} 담당자님! 🙂\n${dealTitle}${amountStr} 업로드 완료 후 ${daysSince > 0 ? `${daysSince}일이` : '시간이'} 지났는데요, 혹시 정산 일정을 확인해주실 수 있을까요? 감사합니다!`;
    case 'micro':
      return `안녕하세요 ${brand} 담당자님,\n${dealTitle}${amountStr} 업로드 완료 후 ${daysSince > 0 ? `약 ${daysSince}일이` : '시간이'} 경과하였습니다. 정산 진행 현황을 확인해 주실 수 있을까요?\n계속 좋은 파트너십 이어가고 싶습니다. 감사합니다.`;
    case 'mid':
      return `안녕하세요 ${brand} 담당자님,\n${dealTitle} 캠페인${amountStr} 업로드 완료 후 ${daysSince > 0 ? `${daysSince}일이` : '일정 기간이'} 경과하였습니다. 정산 처리 관련하여 진행 상황을 공유해 주실 수 있으신지요? 기한 내 처리 부탁드립니다.`;
    case 'macro':
      return `안녕하세요 ${brand} 담당자님,\n${dealTitle} 캠페인${amountStr} 콘텐츠 게재 완료 후 ${daysSince > 0 ? `${daysSince}일이` : '상당 기간이'} 경과하였습니다. 계약서상 정산 기일 확인과 함께 처리 일정을 회신 부탁드립니다.`;
  }
}

function inquiryResponse(scale: Scale, ctx: DraftContext): string {
  const { brand, budget } = ctx;
  const budgetLine = budget ? ` 제안해 주신 예산(${budget}) 기준으로` : '';
  switch (scale) {
    case 'nano':
      return `안녕하세요 ${brand} 담당자님! 협찬 문의 감사드려요 😊\n${budgetLine} 협업 가능한지 확인해보겠습니다. 구체적인 캠페인 내용과 희망 일정을 알려주시면 빠르게 검토드릴게요!`;
    case 'micro':
      return `안녕하세요 ${brand} 담당자님,\n협찬 문의 주셔서 감사합니다.${budgetLine} 진행하시려는 캠페인 콘셉트와 희망 업로드 일정을 알려주시면 검토 후 회신드리겠습니다.`;
    case 'mid':
      return `안녕하세요 ${brand} 담당자님,\n협찬 제안 검토하였습니다.${budgetLine} 세부 캠페인 브리프와 기대 성과 지표를 공유해 주시면 빠르게 협의하겠습니다.`;
    case 'macro':
      return `안녕하세요 ${brand} 담당자님,\n협찬 제안서 검토하였습니다.${budgetLine} 상세 캠페인 브리프, KPI, 계약 조건을 공유해 주시면 신속하게 검토하겠습니다.`;
  }
}

function reengagementPitch(scale: Scale, ctx: DraftContext): string {
  const { brand, dealTitle, relationshipLevel = 'new', dealAmount } = ctx;
  const prevInfo = dealTitle ? `지난 ${dealTitle} 협업` : '이전 협업';
  const amountStr = dealAmount && dealAmount > 0 ? ` (${dealAmount.toLocaleString()}원)` : '';

  if (relationshipLevel === 'new') {
    switch (scale) {
      case 'nano':
        return `안녕하세요 ${brand} 담당자님 😊\n${brand}의 제품/서비스와 제 채널 방향성이 잘 맞아 협업 제안드리고 싶어 연락드렸어요! 미디어 키트를 공유해 드려도 될까요?`;
      case 'micro':
        return `안녕하세요 ${brand} 담당자님,\n${brand}와의 협업 캠페인을 제안드리고 싶습니다. 제 채널 소개와 미디어 키트를 공유해 드릴까요?`;
      case 'mid':
        return `안녕하세요 ${brand} 마케팅 담당자님,\n${brand}와의 협업 캠페인을 제안드리고자 연락드립니다. 세부 제안 자료를 공유해 드려도 될까요?`;
      case 'macro':
        return `안녕하세요 ${brand} 마케팅팀 담당자님,\n${brand}와의 전략적 콘텐츠 파트너십 가능성을 논의하고 싶습니다. 미팅 일정을 잡을 수 있을까요?`;
    }
  }

  switch (scale) {
    case 'nano':
      return `안녕하세요 ${brand} 담당자님! 저번 협업 너무 좋았어요 😊\n${prevInfo}${amountStr} 이후에 새로운 아이디어가 생겼는데, 다시 함께하면 어떨까 해서요! 관심 있으시면 편하게 말씀해주세요!`;
    case 'micro':
      return `안녕하세요 ${brand} 담당자님,\n${prevInfo}${amountStr}이 잘 마무리됐는데요, 새로운 캠페인도 함께 진행하면 좋을 것 같아 다시 연락드립니다. 새로운 제안이 있으시면 언제든지 환영합니다!`;
    case 'mid':
      return `안녕하세요 ${brand} 담당자님,\n${prevInfo}${amountStr} 이후에도 구독자 반응이 좋아 다시 파트너십을 제안드립니다. 이번 시즌 캠페인 계획이 있으시다면 협업 기회를 열어두고 싶습니다.`;
    case 'macro':
      return `안녕하세요 ${brand} 마케팅팀 담당자님,\n${prevInfo}${amountStr}의 성과를 바탕으로 지속적인 파트너십을 제안드립니다. 장기 계약 또는 연간 캠페인 협의 의향이 있으시다면 미팅 일정을 잡고 싶습니다.`;
  }
}

function scheduleCoordination(scale: Scale, ctx: DraftContext): string {
  const { brand, dealTitle = '협찬' } = ctx;
  switch (scale) {
    case 'nano':
      return `안녕하세요 ${brand} 담당자님 😊\n${dealTitle} 업로드 일정을 조율하고 싶어 연락드렸어요! 가능하신 날짜 몇 가지 알려주시면 그에 맞춰 준비해볼게요!`;
    case 'micro':
      return `안녕하세요 ${brand} 담당자님,\n${dealTitle} 업로드 일정 관련하여 협의드리고 싶습니다. 희망 게재일과 수정 요청 기한을 알려주시면 스케줄을 조정하겠습니다.`;
    case 'mid':
      return `안녕하세요 ${brand} 담당자님,\n${dealTitle} 업로드 일정 협의를 요청드립니다. 브랜드 측 요청 일정을 공유해 주시면 최대한 맞춰 조율하겠습니다.`;
    case 'macro':
      return `안녕하세요 ${brand} 담당자님,\n${dealTitle} 게재 일정 확정을 위해 연락드립니다. 편집 검토 기한과 최종 업로드일을 조율하고자 하니 가능한 일정 3가지를 공유해 주세요.`;
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function generateDraft(ctx: DraftContext): Promise<string> {
  const scale = await getScale();
  switch (ctx.draftType) {
    case 'followup':              return followUp(scale, ctx);
    case 'settlement_request':    return settlementRequest(scale, ctx);
    case 'inquiry_response':      return inquiryResponse(scale, ctx);
    case 'reengagement_pitch':    return reengagementPitch(scale, ctx);
    case 'schedule_coordination': return scheduleCoordination(scale, ctx);
    default:                      return followUp(scale, ctx);
  }
}

/** Map an AutonomousAction type to a DraftType */
export function actionTypeToDraftType(actionType: string): DraftType {
  switch (actionType) {
    case 'draft_settlement_request': return 'settlement_request';
    case 'draft_inquiry_response':   return 'inquiry_response';
    case 'draft_reengagement_pitch': return 'reengagement_pitch';
    default:                         return 'followup';
  }
}
