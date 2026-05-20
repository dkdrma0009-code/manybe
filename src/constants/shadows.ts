import { ViewStyle } from 'react-native';
import { tokens } from './tokens';

const BASE = tokens.ink;

export const shadows: Record<string, ViewStyle> = {
  // No elevation — for flat surfaces
  none: {
    shadowOpacity: 0,
    elevation: 0,
  },
  // Faintest — banners, inline chips
  xs: {
    shadowColor: BASE,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  // Standard content card
  sm: {
    shadowColor: BASE,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.055,
    shadowRadius: 8,
    elevation: 2,
  },
  // Elevated card (CTAs, focused state)
  md: {
    shadowColor: BASE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.09,
    shadowRadius: 14,
    elevation: 5,
  },
  // Bottom sheet / modal
  lg: {
    shadowColor: BASE,
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 24,
  },
  // FAB — tinted with brand color
  fab: {
    shadowColor: tokens.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  // AI card — tinted with ai color
  ai: {
    shadowColor: tokens.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 3,
  },

  // Backward compat aliases
  card:       {} as ViewStyle,
  cardStrong: {} as ViewStyle,
  modal:      {} as ViewStyle,
  subtle:     {} as ViewStyle,
};

// Fill aliases after the object is created to avoid circular refs
(shadows.card       as any) = shadows.sm;
(shadows.cardStrong as any) = shadows.md;
(shadows.modal      as any) = shadows.lg;
(shadows.subtle     as any) = shadows.xs;
