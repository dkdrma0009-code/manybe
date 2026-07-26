export const tokens = {
  // ── Brand (coral red) ─────────────────────────────────────────────────────
  primary:       '#E8472A',
  primaryDeep:   '#C43520',
  primaryMid:    '#EB5A3A',
  primarySoft:   '#FEF0EE',
  primarySofter: '#FFF7F5',

  // ── Action — @deprecated: alias of primary (coral). Indigo retired; migrate to primary* then remove ──
  action:     '#E8472A', // → primary
  actionDeep: '#C43520', // → primaryDeep
  actionSoft: '#FEF0EE', // → primarySoft

  // ── Amber — financial / warning moments only ──────────────────────────────
  amber:     '#C48A40',
  amberSoft: '#F5E8D4',

  // ── AI Accent — @deprecated: blue→purple cliché retired. Use primarySoft bg + primary text; migrate then remove ──
  aiFrom:    '#E8472A', // → primary (gradient flattened to coral)
  aiTo:      '#E8472A', // → primary
  aiSurface: '#FEF0EE', // → primarySoft
  aiMuted:   '#FFF7F5', // → primarySofter
  aiText:    '#E8472A', // → primary

  // ── Background / Surface hierarchy ────────────────────────────────────────
  bg:       '#F7F5F0',  // warm off-white
  bgAlt:    '#F0EDE6',  // slightly deeper warm
  surface0: '#FFFFFF',  // base card surface
  surface1: '#FAFAF8',  // secondary card / section bg
  surface2: '#F7F5F0',  // chip wells, input bg
  surface3: '#FFFFFF',  // modal / bottom-sheet

  // Aliases — backward compatibility
  bgDeeper: '#F0EDE6',
  surface:  '#FFFFFF',
  card:     '#FFFFFF',
  cardAlt:  '#FAFAF8',

  // ── Neutral scale ─────────────────────────────────────────────────────────
  neutral900: '#0F0D0A',
  neutral800: '#1C1A16',
  neutral700: '#2E2B24',
  neutral600: '#4A4740',
  neutral500: '#706D66',
  neutral400: '#9896A0',
  neutral300: '#C5C3BC',
  neutral200: '#E4E2DA',
  neutral100: '#F2F0E8',
  neutral50:  '#F9F7F2',

  // ── Ink — @deprecated: use neutral scale; remove after migration ──────────
  ink:  '#0F0D0A', // → neutral900
  ink2: '#2E2B24', // → neutral700
  ink3: '#706D66', // → neutral500
  ink4: '#9896A0', // → neutral400
  ink5: '#C5C3BC', // → neutral300

  // ── Border ────────────────────────────────────────────────────────────────
  borderFaint:  '#EDEAE3',
  border:       '#E5E2DA',
  borderMed:    '#D0CCC2',
  borderStrong: '#B8B4A9',

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

  info:    '#3D5AFE',
  infoMid: '#5C77FF',
  infoBg:  '#EEF1FD',

  // ── Deal status ───────────────────────────────────────────────────────────
  inquiry:      '#706D66', // neutral500
  inquiryBg:    '#F2F0E8', // neutral100
  reviewing:    '#4A4740', // neutral600
  reviewingBg:  '#F2F0E8', // neutral100
  inProgress:   '#E8472A', // primary — only the current step is emphasized
  inProgressBg: '#FEF0EE', // primarySoft
  uploaded:     '#1D8348', // success — completed stays green
  uploadedBg:   '#E8F8EE', // successBg
  settled:      '#9896A0', // neutral400
  settledBg:    '#F9F7F2', // neutral50

  // Backward compat aliases
  energy:     '#E8472A',
  energySoft: '#FEF0EE',
  urgent:     '#E8472A',
  urgentBg:   '#FEF0EE',
  // ── Typography ────────────────────────────────────────────────────────────
  fontRegular:    'Pretendard-Regular',
  fontMedium:     'Pretendard-Medium',
  fontSemiBold:   'Pretendard-SemiBold',
  fontBold:       'Pretendard-Bold',
  fontExtraBold:  'Pretendard-ExtraBold',
} as const;

// ── Platform brand colors ───────────────────────────────────────────────────
// Official brand-mandated colors. NOT design tokens — never remap to the palette.
export const brandColors = {
  youtube:   '#FF0000',
  instagram: '#E1306C',
  tiktok:    '#000000',
} as const;
