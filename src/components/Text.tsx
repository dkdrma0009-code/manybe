import React from 'react';
import { Text as RNText, TextProps, StyleSheet } from 'react-native';

function fontFamilyForWeight(weight: string | undefined): string {
  switch (weight) {
    case '800': case '900': return 'Pretendard-ExtraBold';
    case '700':             return 'Pretendard-Bold';
    case '600':             return 'Pretendard-SemiBold';
    case '500':             return 'Pretendard-Medium';
    default:                return 'Pretendard-Regular';
  }
}

export const Text = React.forwardRef<RNText, TextProps>(({ style, ...props }, ref) => {
  const flat = StyleSheet.flatten(style) ?? {};
  const fontFamily = (flat as any).fontFamily ?? fontFamilyForWeight((flat as any).fontWeight);
  return <RNText ref={ref} style={[{ fontFamily }, style]} {...props} />;
});
Text.displayName = 'Text';
