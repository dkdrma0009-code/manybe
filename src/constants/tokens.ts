export const tokens = {
  // ── Brand (coral red) ─────────────────────────────────────────────────────
  primary:       '#E8472A',
  primaryDeep:   '#C43520',
  primaryMid:    '#EB5A3A',
  primarySoft:   '#FEF0EE',
  primarySofter: '#FFF7F5',

  // ── Action (indigo) — CTA buttons, links ──────────────────────────────────
  action:     '#3D5AFE',
  actionDeep: '#2B47D4',
  actionSoft: '#EEF1FD',

  // ── Amber — financial / pending moments ──────────────────────────────────
  amber:     '#C48A40',
  amberSoft: '#F5E8D4',

  // ── AI Accent — signals AI-powered moments ────────────────────────────────
  aiFrom:    '#3D5AFE',
  aiTo:      '#8B5CF6',
  aiSurface: '#EEF1FD',
  aiMuted:   '#DDE3FC',
  aiText:    '#2B47D4',

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

  // ── Ink (text hierarchy) ──────────────────────────────────────────────────
  ink:  '#111111',
  ink2: '#444444',
  ink3: '#777777',
  ink4: '#AAAAAA',
  ink5: '#D0D0D0',

  // ── Border ────────────────────────────────────────────────────────────────
  borderFaint:  '#EDEAE3',
  border:       '#E5E2DA',
  borderMed:    '#D0CCC2',
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

  info:    '#3D5AFE',
  infoMid: '#5C77FF',
  infoBg:  '#EEF1FD',

  // ── Deal status ───────────────────────────────────────────────────────────
  inquiry:      '#3D5AFE',
  inquiryBg:    '#EEF1FD',
  reviewing:    '#C48A40',
  reviewingBg:  '#F5E8D4',
  inProgress:   '#E8472A',
  inProgressBg: '#FEF0EE',
  uploaded:     '#1D8348',
  uploadedBg:   '#E8F8EE',
  settled:      '#888888',
  settledBg:    '#F1F0ED',

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
