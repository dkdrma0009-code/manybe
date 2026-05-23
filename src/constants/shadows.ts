import { ViewStyle } from 'react-native';
import { tokens } from './tokens';

const BASE = '#000000';

export const shadows: Record<string, ViewStyle> = {
  none: {
    shadowOpacity: 0,
    elevation: 0,
  },
  // 거의 없는 그림자 — 카드 구분용
  xs: {
    shadowColor: BASE,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  // 기본 카드
  sm: {
    shadowColor: BASE,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  // 강조 카드
  md: {
    shadowColor: BASE,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  // 바텀시트 / 모달
  lg: {
    shadowColor: BASE,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.10,
    shadowRadius: 20,
    elevation: 20,
  },
  // FAB
  fab: {
    shadowColor: tokens.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.30,
    shadowRadius: 10,
    elevation: 8,
  },
  // AI 카드
  ai: {
    shadowColor: tokens.action,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
    elevation: 3,
  },

  // Backward compat aliases
  card:       {} as ViewStyle,
  cardStrong: {} as ViewStyle,
  modal:      {} as ViewStyle,
  subtle:     {} as ViewStyle,
};

(shadows.card       as any) = shadows.sm;
(shadows.cardStrong as any) = shadows.md;
(shadows.modal      as any) = shadows.lg;
(shadows.subtle     as any) = shadows.xs;
