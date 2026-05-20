export const tokens = {
  // ── Brand (blue-indigo) ───────────────────────────────────────────────────
  primary:       '#5566DF',
  primaryDeep:   '#3B4EC8',
  primaryMid:    '#6677E5',
  primarySoft:   '#ECEFFE',
  primarySofter: '#F4F6FF',

  // ── Energy (terracotta) — urgency / CTA moments ───────────────────────────
  energy:     '#E8603C',
  energySoft: '#FDEEE9',

  // ── Amber — financial / pending moments ──────────────────────────────────
  amber:     '#C48A40',
  amberSoft: '#F5E8D4',

  // ── AI Accent — signals AI-powered moments ────────────────────────────────
  aiFrom:    '#5566DF',  // gradient start (matches brand)
  aiTo:      '#8B5CF6',  // gradient end (violet contrast)
  aiSurface: '#F0F2FE',  // AI card / section background
  aiMuted:   '#E2E6FC',  // AI badge / chip background
  aiText:    '#3B4EC8',  // AI label text / icons

  // ── Background / Surface hierarchy ────────────────────────────────────────
  bg:       '#F6F6F4',  // page background (near-white warm)
  bgAlt:    '#F1F1EF',  // raised / pressed states
  surface0: '#FFFFFF',  // base card surface
  surface1: '#FAFAFA',  // secondary card / section bg
  surface2: '#F6F6F4',  // tertiary bg (chip wells, input bg)
  surface3: '#FFFFFF',  // modal / bottom-sheet (sits above page)

  // Aliases — backward compatibility
  bgDeeper: '#F1F1EF',  // → bgAlt
  surface:  '#FFFFFF',  // → surface0
  card:     '#FFFFFF',
  cardAlt:  '#FAFAFA',

  // ── Neutral scale (replaces scattered Tailwind grays) ─────────────────────
  // Maps: neutral800 ≈ #1A1A2E, neutral500 ≈ #9CA3AF, neutral400 ≈ #374151
  neutral900: '#0F0D18',
  neutral800: '#1E1B2E',
  neutral700: '#2E2B3F',
  neutral600: '#4A4757',
  neutral500: '#706D7E',
  neutral400: '#9896A6',
  neutral300: '#C5C3CE',
  neutral200: '#E4E2EC',
  neutral100: '#F2F0F8',
  neutral50:  '#F8F7FC',

  // ── Ink (text hierarchy) ──────────────────────────────────────────────────
  ink:  '#181818',
  ink2: '#444444',
  ink3: '#888888',
  ink4: '#BBBBBB',
  ink5: '#D5D5D5',  // disabled / placeholder

  // ── Border ────────────────────────────────────────────────────────────────
  borderFaint:  '#EDEDEB',
  border:       '#E3E3E0',
  borderMed:    '#CFCFCC',
  borderStrong: '#ABABAB',

  // ── Semantic ──────────────────────────────────────────────────────────────
  success:    '#1D8348',
  successMid: '#27AE60',
  successBg:  '#E8F8EE',

  warning:    '#B7770D',
  warningMid: '#E67E22',
  warningBg:  '#FDF3DC',

  error:    '#C0392B',
  errorMid: '#E74C3C',
  errorBg:  '#FDEBEA',

  info:    '#1A6EB5',
  infoMid: '#2980B9',
  infoBg:  '#E8F3FC',

  // ── Deal status ───────────────────────────────────────────────────────────
  inquiry:      '#5566DF',
  inquiryBg:    '#ECEFFE',
  reviewing:    '#C48A40',
  reviewingBg:  '#F5E8D4',
  inProgress:   '#E8603C',
  inProgressBg: '#FDEEE9',
  uploaded:     '#2E8C5D',
  uploadedBg:   '#DEEFE5',
  settled:      '#888888',
  settledBg:    '#F1F1EF',

  // Backward compat aliases
  urgent:   '#E8603C',
  urgentBg: '#FDEEE9',
} as const;
