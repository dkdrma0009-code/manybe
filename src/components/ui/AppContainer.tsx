import React from 'react';
import { View, ScrollView, ViewProps, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../constants/theme';

interface AppContainerProps extends ViewProps {
  scroll?: boolean;
  horizontalPadding?: boolean;
  children: React.ReactNode;
}

export function AppContainer({
  scroll = false,
  horizontalPadding = false,
  children,
  style,
  ...props
}: AppContainerProps) {
  const insets = useSafeAreaInsets();
  const contentStyle = horizontalPadding ? s.padded : undefined;

  if (scroll) {
    return (
      <View style={[s.root, { paddingTop: insets.top }, style]} {...props}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={contentStyle}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[s.root, { paddingTop: insets.top }, contentStyle, style]} {...props}>
      {children}
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  padded: {
    paddingHorizontal: theme.space.screen,
  },
});
