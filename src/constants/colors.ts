import { tokens } from './tokens';

export const colors = {
  // ── Brand ─────────────────────────────────────────────────────────────────
  primary:      tokens.primary,
  primaryLight: tokens.primarySoft,
  primaryDark:  tokens.primaryDeep,

  // ── Surfaces ──────────────────────────────────────────────────────────────
  background: tokens.bg,
  surface:    tokens.surface0,
  surfaceAlt: tokens.surface1,

  // ── Text ──────────────────────────────────────────────────────────────────
  text:          tokens.ink,
  textSecondary: tokens.ink3,
  textTertiary:  tokens.ink4,
  textDisabled:  tokens.ink5,

  // ── Borders ───────────────────────────────────────────────────────────────
  border:       tokens.border,
  borderFaint:  tokens.borderFaint,
  borderStrong: tokens.borderStrong,

  // ── Semantic ──────────────────────────────────────────────────────────────
  success:    tokens.success,
  successBg:  tokens.successBg,
  warning:    tokens.warning,
  warningBg:  tokens.warningBg,
  error:      tokens.error,
  errorBg:    tokens.errorBg,
  info:       tokens.info,
  infoBg:     tokens.infoBg,

  // ── AI ────────────────────────────────────────────────────────────────────
  ai:        tokens.aiText,
  aiSurface: tokens.aiSurface,
  aiMuted:   tokens.aiMuted,
};
