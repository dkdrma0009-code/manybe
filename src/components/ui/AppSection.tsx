import React from 'react';
import { View, Text, StyleSheet, ViewProps } from 'react-native';
import { theme } from '../../constants/theme';

interface AppSectionProps extends ViewProps {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  spacing?: 'compact' | 'default' | 'loose';
}

export function AppSection({
  title,
  subtitle,
  action,
  children,
  spacing = 'default',
  style,
  ...props
}: AppSectionProps) {
  const marginBottom = SPACING_MAP[spacing];

  return (
    <View style={[s.wrapper, { marginBottom }, style]} {...props}>
      {(title || action) && (
        <View style={s.header}>
          <View style={s.headerLeft}>
            {title && <Text style={s.title}>{title}</Text>}
            {subtitle && <Text style={s.subtitle}>{subtitle}</Text>}
          </View>
          {action && <View style={s.headerAction}>{action}</View>}
        </View>
      )}
      {children}
    </View>
  );
}

const SPACING_MAP: Record<string, number> = {
  compact: theme.space.lg,
  default: theme.space.section,
  loose:   theme.space.xxxl,
};

const s = StyleSheet.create({
  wrapper: {},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.space.sm + 2,
  },
  headerLeft: {
    flex: 1,
    gap: 2,
  },
  headerAction: {},
  title: {
    ...theme.typography.sectionTitle,
    color: theme.colors.text.muted,
  },
  subtitle: {
    ...theme.typography.caption,
    color: theme.colors.text.muted,
    marginTop: 2,
  },
});
