import { ViewStyle } from 'react-native';

export const shadows: Record<string, ViewStyle> = {
  // Standard content card
  card: {
    shadowColor: '#15131E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  // Elevated card (modals, CTAs)
  cardStrong: {
    shadowColor: '#15131E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 14,
    elevation: 5,
  },
  // Bottom sheet modal
  modal: {
    shadowColor: '#15131E',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 24,
  },
  // FAB / primary action button
  fab: {
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  // Subtle — for banners, badges
  subtle: {
    shadowColor: '#15131E',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
};
