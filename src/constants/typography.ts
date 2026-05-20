import { TextStyle } from 'react-native';

// Type scale — designed for high information density with clear hierarchy.
// Inspired by Linear/Notion/Ramp: size does the hierarchy work, weight supports it.
export const typography: Record<string, TextStyle> = {
  // ── Display ───────────────────────────────────────────────────────────────
  // Large hero numbers (revenue totals, stats)
  display: {
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -1.0,
    lineHeight: 42,
  },
  hero: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.8,
    lineHeight: 38,
  },

  // ── Headings ──────────────────────────────────────────────────────────────
  screenTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
    lineHeight: 28,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.4,
    lineHeight: 26,
  },
  navTitle: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.2,
    lineHeight: 22,
  },
  heading: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.2,
    lineHeight: 22,
  },
  subheading: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.1,
    lineHeight: 20,
  },

  // ── Section / Card ────────────────────────────────────────────────────────
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.4,
    lineHeight: 16,
    textTransform: 'uppercase',
  },
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

  // ── Body ──────────────────────────────────────────────────────────────────
  body: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 22,
  },
  bodyMedium: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 22,
  },
  bodyStrong: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 22,
  },

  // ── Support ───────────────────────────────────────────────────────────────
  label: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
    lineHeight: 16,
  },
  caption: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 17,
  },
  hint: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 17,
  },
  micro: {
    fontSize: 11,
    fontWeight: '500',
    lineHeight: 15,
  },
  metadata: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 18,
  },

  // ── Status / Badge ────────────────────────────────────────────────────────
  status: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
    lineHeight: 14,
  },

  // ── Action ────────────────────────────────────────────────────────────────
  button: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.1,
    lineHeight: 20,
  },
  buttonSm: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.1,
    lineHeight: 18,
  },
  buttonLg: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.1,
    lineHeight: 22,
  },

  // ── Mono (numbers, amounts) ───────────────────────────────────────────────
  mono: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    fontVariant: ['tabular-nums'],
  },
  monoLg: {
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 26,
    fontVariant: ['tabular-nums'],
  },
};
