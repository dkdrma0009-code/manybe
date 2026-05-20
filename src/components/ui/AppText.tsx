import React from 'react';
import { Text, TextProps } from 'react-native';
import { theme } from '../../constants/theme';

type TypographyVariant = keyof typeof theme.typography;

type TextColor =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'muted'
  | 'disabled'
  | 'inverse'
  | 'brand'
  | 'success'
  | 'warning'
  | 'error'
  | 'ai';

const COLOR_MAP: Record<TextColor, string> = {
  primary:   theme.colors.text.primary,
  secondary: theme.colors.text.secondary,
  tertiary:  theme.colors.text.tertiary,
  muted:     theme.colors.text.muted,
  disabled:  theme.colors.text.disabled,
  inverse:   theme.colors.text.inverse,
  brand:     theme.colors.brand.default,
  success:   theme.colors.semantic.success,
  warning:   theme.colors.semantic.warning,
  error:     theme.colors.semantic.error,
  ai:        theme.colors.ai.text,
};

interface AppTextProps extends TextProps {
  variant?: TypographyVariant;
  color?: TextColor;
}

export function AppText({
  variant = 'body',
  color = 'primary',
  style,
  ...props
}: AppTextProps) {
  return (
    <Text
      style={[
        theme.typography[variant],
        { color: COLOR_MAP[color] },
        style,
      ]}
      {...props}
    />
  );
}
