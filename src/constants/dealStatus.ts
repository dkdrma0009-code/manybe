import { tokens } from './tokens';

export const PIPELINE_STAGES = [
  { value: 'inquiry',     short: '문의' },
  { value: 'reviewing',   short: '검토중' },
  { value: 'in_progress', short: '진행중' },
  { value: 'uploaded',    short: '업로드' },
  { value: 'settled',     short: '정산완료' },
] as const;

export type DealStatusValue = typeof PIPELINE_STAGES[number]['value'];

export const STAGE_INDEX: Record<string, number> = {
  inquiry: 0, reviewing: 1, in_progress: 2, uploaded: 3, settled: 4,
};

export const STAGE_CONFIG: Record<string, { bg: string; color: string }> = {
  inquiry:     { bg: tokens.inquiryBg,    color: tokens.inquiry },
  reviewing:   { bg: tokens.reviewingBg,  color: tokens.reviewing },
  in_progress: { bg: tokens.inProgressBg, color: tokens.inProgress },
  uploaded:    { bg: tokens.uploadedBg,   color: tokens.uploaded },
  settled:     { bg: tokens.settledBg,    color: tokens.settled },
};

export const STAGE_HINTS: Record<string, string> = {
  inquiry:     '브랜드와 조건을 논의하고 검토 단계로 이동하세요',
  reviewing:   '단가·일정을 확정하고 작업을 시작하세요',
  in_progress: '컨텐츠 제작 완료 후 업로드 완료를 눌러주세요',
  uploaded:    '브랜드에 정산을 요청하고 입금을 확인하세요',
  settled:     '모든 단계 완료 ✓  수익 탭에서 정산금액을 기록해두세요',
};

export const ADVANCE_CTA: Record<string, string> = {
  reviewing:   '검토 시작하기',
  in_progress: '작업 시작하기',
  uploaded:    '업로드 완료하기',
  settled:     '정산 완료하기',
};

export const SUCCESS_MESSAGES: Record<string, string> = {
  reviewing:   '검토를 시작했어요',
  in_progress: '작업이 시작됐어요',
  uploaded:    '업로드 완료됐어요',
  settled:     '협찬이 완료됐어요',
};
