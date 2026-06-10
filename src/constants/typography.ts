import { TextStyle } from 'react-native';

function pf(weight: TextStyle['fontWeight']): string {
  switch (weight) {
    case '800': return 'Pretendard-ExtraBold';
    case '700': return 'Pretendard-Bold';
    case '600': return 'Pretendard-SemiBold';
    case '500': return 'Pretendard-Medium';
    default:    return 'Pretendard-Regular';
  }
}

export const typography: Record<string, TextStyle> = {
  // ── Display ───────────────────────────────────────────────────────────────
  display: {
    fontFamily: pf('800'),
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -1.2,
    lineHeight: 42,
  },
  hero: {
    fontFamily: pf('700'),
    fontSize: 30,
    fontWeight: '700',
    letterSpacing: -0.8,
    lineHeight: 38,
  },

  // ── Headings ──────────────────────────────────────────────────────────────
  screenTitle: {
    fontFamily: pf('700'),
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.2,
    lineHeight: 22,
  },
  greeting: {
    fontFamily: pf('700'),
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.6,
    lineHeight: 34,
  },
  title: {
    fontFamily: pf('700'),
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.4,
    lineHeight: 26,
  },
  navTitle: {
    fontFamily: pf('700'),
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
    lineHeight: 22,
  },
  heading: {
    fontFamily: pf('600'),
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.2,
    lineHeight: 22,
  },
  subheading: {
    fontFamily: pf('600'),
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.1,
    lineHeight: 20,
  },

  // ── Section / Card ────────────────────────────────────────────────────────
  sectionTitle: {
    fontFamily: pf('600'),
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.1,
    lineHeight: 20,
  },
  sectionLabel: {
    fontFamily: pf('500'),
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.3,
    lineHeight: 16,
    textTransform: 'uppercase',
  },
  cardTitle: {
    fontFamily: pf('600'),
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
    letterSpacing: -0.1,
  },
  cardSubtitle: {
    fontFamily: pf('400'),
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 18,
  },

  // ── Body ──────────────────────────────────────────────────────────────────
  body: {
    fontFamily: pf('400'),
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 22,
    letterSpacing: -0.1,
  },
  bodyMedium: {
    fontFamily: pf('500'),
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 22,
  },
  bodyStrong: {
    fontFamily: pf('600'),
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 22,
  },

  // ── Support ───────────────────────────────────────────────────────────────
  label: {
    fontFamily: pf('600'),
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.1,
    lineHeight: 16,
  },
  caption: {
    fontFamily: pf('400'),
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 17,
    letterSpacing: -0.1,
  },
  hint: {
    fontFamily: pf('500'),
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 17,
  },
  micro: {
    fontFamily: pf('500'),
    fontSize: 11,
    fontWeight: '500',
    lineHeight: 15,
  },
  metadata: {
    fontFamily: pf('500'),
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 18,
  },

  // ── Status / Badge ────────────────────────────────────────────────────────
  status: {
    fontFamily: pf('600'),
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.1,
    lineHeight: 14,
  },

  // ── Action ────────────────────────────────────────────────────────────────
  button: {
    fontFamily: pf('600'),
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.1,
    lineHeight: 20,
  },
  buttonSm: {
    fontFamily: pf('600'),
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0,
    lineHeight: 18,
  },
  buttonLg: {
    fontFamily: pf('600'),
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.2,
    lineHeight: 22,
  },

  // ── Mono (numbers, amounts) ───────────────────────────────────────────────
  mono: {
    fontFamily: pf('600'),
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    fontVariant: ['tabular-nums'],
  },
  monoLg: {
    fontFamily: pf('700'),
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 26,
    fontVariant: ['tabular-nums'],
  },
};
