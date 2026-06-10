import { Text } from '@/components/Text';
import React from 'react';
import {
  TouchableOpacity,
  TouchableOpacityProps,
  View,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { theme } from '../../constants/theme';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'ai';
type ButtonSize    = 'sm' | 'md' | 'lg';

interface AppButtonProps extends TouchableOpacityProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  label: string;
  loading?: boolean;
  icon?: string;
}

export function AppButton({
  variant = 'primary',
  size = 'md',
  label,
  loading = false,
  icon,
  disabled,
  style,
  ...props
}: AppButtonProps) {
  const vs = VARIANT_STYLES[variant];
  const ss = SIZE_STYLES[size];
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      disabled={isDisabled}
      style={[
        s.base,
        ss.container,
        vs.container,
        isDisabled && s.disabled,
        style,
      ]}
      {...props}
    >
      {loading ? (
        <ActivityIndicator size="small" color={vs.loaderColor} />
      ) : (
        <View style={s.inner}>
          {icon ? <Text style={[ss.text, vs.text, s.icon]}>{icon}</Text> : null}
          <Text style={[ss.text, vs.text]}>{label}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  base: {
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  icon: {
    marginRight: 0,
  },
  disabled: {
    opacity: 0.45,
  },
});

const SIZE_STYLES: Record<ButtonSize, { container: object; text: object }> = {
  sm: {
    container: { paddingHorizontal: theme.space.md, paddingVertical: theme.space.xs + 2, minHeight: 34 },
    text: theme.typography.buttonSm,
  },
  md: {
    container: { paddingHorizontal: theme.space.xl, paddingVertical: theme.space.sm + 3, minHeight: 44 },
    text: theme.typography.button,
  },
  lg: {
    container: { paddingHorizontal: theme.space.xxl, paddingVertical: theme.space.md + 2, minHeight: 52 },
    text: theme.typography.buttonLg,
  },
};

const VARIANT_STYLES: Record<ButtonVariant, { container: object; text: object; loaderColor: string }> = {
  primary: {
    container: { backgroundColor: theme.colors.brand.default, ...theme.shadows.fab },
    text: { color: theme.colors.text.inverse },
    loaderColor: '#FFFFFF',
  },
  secondary: {
    container: { backgroundColor: theme.colors.brand.softer, borderWidth: 1, borderColor: theme.colors.brand.soft },
    text: { color: theme.colors.brand.deep },
    loaderColor: theme.colors.brand.default,
  },
  ghost: {
    container: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: theme.colors.border.default },
    text: { color: theme.colors.text.primary },
    loaderColor: theme.colors.text.primary,
  },
  danger: {
    container: { backgroundColor: theme.colors.semantic.errorBg, borderWidth: 1, borderColor: theme.colors.semantic.error + '40' },
    text: { color: theme.colors.semantic.error },
    loaderColor: theme.colors.semantic.error,
  },
  ai: {
    container: { backgroundColor: theme.colors.ai.surface, borderWidth: 1, borderColor: theme.colors.ai.muted, ...theme.shadows.ai },
    text: { color: theme.colors.ai.text },
    loaderColor: theme.colors.ai.text,
  },
};
