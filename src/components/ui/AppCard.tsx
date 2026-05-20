import React from 'react';
import { View, ViewProps, StyleSheet } from 'react-native';
import { theme } from '../../constants/theme';

type CardVariant = 'default' | 'elevated' | 'ghost' | 'ai' | 'filled' | 'flat';

interface AppCardProps extends ViewProps {
  variant?: CardVariant;
  padding?: number | keyof typeof theme.space;
}

function resolvePadding(padding: AppCardProps['padding']): number {
  if (padding === undefined) return theme.space.lg;
  if (typeof padding === 'number') return padding;
  return theme.space[padding];
}

export function AppCard({
  variant = 'default',
  padding,
  style,
  ...props
}: AppCardProps) {
  const resolvedPadding = resolvePadding(padding);

  return (
    <View
      style={[
        s.base,
        { padding: resolvedPadding },
        VARIANT_STYLES[variant],
        style,
      ]}
      {...props}
    />
  );
}

const s = StyleSheet.create({
  base: {
    borderRadius: theme.radius.lg,
    marginBottom: theme.space.md,
  },
});

const VARIANT_STYLES: Record<CardVariant, object> = {
  default: {
    backgroundColor: theme.colors.surface,
    ...theme.shadows.sm,
  },
  elevated: {
    backgroundColor: theme.colors.surface,
    ...theme.shadows.md,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.border.default,
  },
  ai: {
    backgroundColor: theme.colors.ai.surface,
    borderWidth: 1,
    borderColor: theme.colors.ai.muted,
    ...theme.shadows.ai,
  },
  filled: {
    backgroundColor: theme.colors.brand.softer,
  },
  flat: {
    backgroundColor: theme.colors.surface1,
  },
};
