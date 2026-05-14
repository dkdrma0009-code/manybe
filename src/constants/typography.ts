import { TextStyle } from 'react-native';

export const typography: Record<string, TextStyle> = {
  // Display — large numbers, hero moments
  hero: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.8,
    lineHeight: 38,
  },
  // Screen-level headings
  screenTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
    lineHeight: 28,
  },
  navTitle: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.2,
    lineHeight: 22,
  },
  // Structure
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.1,
    lineHeight: 22,
  },
  // Cards
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
  },
  cardSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  // Content
  body: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 22,
  },
  bodyStrong: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 22,
  },
  // Workflow semantics
  status: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
    lineHeight: 16,
  },
  hint: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 18,
  },
  // Support
  metadata: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 18,
  },
  caption: {
    fontSize: 11,
    fontWeight: '400',
    lineHeight: 16,
  },
  // Action
  button: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.1,
  },
  buttonSm: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
};
