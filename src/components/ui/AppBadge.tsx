import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../constants/theme';

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'brand' | 'ai' | 'muted';
type BadgeSize    = 'sm' | 'md';

interface AppBadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: BadgeSize;
  icon?: string;
  dot?: boolean;
}

export function AppBadge({
  label,
  variant = 'default',
  size = 'sm',
  icon,
  dot = false,
}: AppBadgeProps) {
  const vs = VARIANT_STYLES[variant];
  const ss = SIZE_STYLES[size];

  return (
    <View style={[s.base, ss.container, vs.container]}>
      {dot && <View style={[s.dot, { backgroundColor: vs.textColor }]} />}
      {icon ? <Text style={[ss.icon]}>{icon}</Text> : null}
      <Text style={[ss.text, { color: vs.textColor }]}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: theme.radius.pill,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginRight: 4,
  },
});

const SIZE_STYLES: Record<BadgeSize, { container: object; text: object; icon: object }> = {
  sm: {
    container: { paddingHorizontal: 8, paddingVertical: 3, gap: 3 },
    text: { ...theme.typography.status },
    icon: { fontSize: 11, lineHeight: 14 },
  },
  md: {
    container: { paddingHorizontal: 10, paddingVertical: 5, gap: 4 },
    text: { ...theme.typography.label },
    icon: { fontSize: 13, lineHeight: 16 },
  },
};

const VARIANT_STYLES: Record<BadgeVariant, { container: object; textColor: string }> = {
  default: {
    container: { backgroundColor: theme.colors.surface2 },
    textColor: theme.colors.text.tertiary,
  },
  muted: {
    container: { backgroundColor: theme.colors.surface2, borderWidth: 1, borderColor: theme.colors.border.faint },
    textColor: theme.colors.text.muted,
  },
  brand: {
    container: { backgroundColor: theme.colors.brand.soft },
    textColor: theme.colors.brand.deep,
  },
  success: {
    container: { backgroundColor: theme.colors.semantic.successBg },
    textColor: theme.colors.semantic.success,
  },
  warning: {
    container: { backgroundColor: theme.colors.semantic.warningBg },
    textColor: theme.colors.semantic.warning,
  },
  error: {
    container: { backgroundColor: theme.colors.semantic.errorBg },
    textColor: theme.colors.semantic.error,
  },
  info: {
    container: { backgroundColor: theme.colors.semantic.infoBg },
    textColor: theme.colors.semantic.info,
  },
  ai: {
    container: { backgroundColor: theme.colors.ai.muted },
    textColor: theme.colors.ai.text,
  },
};
