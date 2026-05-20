// Master typed theme — single source of truth for all design decisions.
// Components import from here, not from individual token files.
// Structure is dark-mode-compatible: all values go through this object,
// so a future dark theme is a parallel implementation of the same shape.

import { tokens } from './tokens';
import { typography } from './typography';
import { space } from './spacing';
import { radius } from './radius';
import { shadows } from './shadows';
import { motion } from './motion';

export const lightTheme = {
  // ── Color system ──────────────────────────────────────────────────────────
  colors: {
    // Brand
    brand: {
      default:  tokens.primary,
      deep:     tokens.primaryDeep,
      mid:      tokens.primaryMid,
      soft:     tokens.primarySoft,
      softer:   tokens.primarySofter,
    },

    // AI accent — visually distinct; signals AI-powered features
    ai: {
      from:    tokens.aiFrom,
      to:      tokens.aiTo,
      surface: tokens.aiSurface,
      muted:   tokens.aiMuted,
      text:    tokens.aiText,
    },

    // Page / surface hierarchy
    // Use in order: bg → surface → surface1 → surface2
    bg:       tokens.bg,
    bgAlt:    tokens.bgAlt,
    surface:  tokens.surface0,
    surface1: tokens.surface1,
    surface2: tokens.surface2,
    surface3: tokens.surface3,

    // Text hierarchy
    text: {
      primary:   tokens.ink,
      secondary: tokens.ink2,
      tertiary:  tokens.ink3,
      muted:     tokens.ink4,
      disabled:  tokens.ink5,
      inverse:   '#FFFFFF',
      onBrand:   '#FFFFFF',
    },

    // Border
    border: {
      faint:  tokens.borderFaint,
      default: tokens.border,
      medium: tokens.borderMed,
      strong: tokens.borderStrong,
    },

    // Semantic
    semantic: {
      success:    tokens.success,
      successMid: tokens.successMid,
      successBg:  tokens.successBg,
      warning:    tokens.warning,
      warningMid: tokens.warningMid,
      warningBg:  tokens.warningBg,
      error:      tokens.error,
      errorMid:   tokens.errorMid,
      errorBg:    tokens.errorBg,
      info:       tokens.info,
      infoMid:    tokens.infoMid,
      infoBg:     tokens.infoBg,
    },

    // Deal status
    status: {
      inquiry:      tokens.inquiry,
      inquiryBg:    tokens.inquiryBg,
      reviewing:    tokens.reviewing,
      reviewingBg:  tokens.reviewingBg,
      inProgress:   tokens.inProgress,
      inProgressBg: tokens.inProgressBg,
      uploaded:     tokens.uploaded,
      uploadedBg:   tokens.uploadedBg,
      settled:      tokens.settled,
      settledBg:    tokens.settledBg,
    },
  },

  // ── Typography ────────────────────────────────────────────────────────────
  typography,

  // ── Spacing (8-pt grid) ───────────────────────────────────────────────────
  space,

  // ── Border radius ─────────────────────────────────────────────────────────
  radius,

  // ── Shadows ───────────────────────────────────────────────────────────────
  shadows,

  // ── Motion ────────────────────────────────────────────────────────────────
  motion,
} as const;

export type Theme = typeof lightTheme;

// Default export — swap this to darkTheme for future dark mode
export const theme = lightTheme;
