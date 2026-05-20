import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../constants/theme';

const { colors, space, typography } = theme;

export default function MessagesScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[s.root, { paddingTop: insets.top + space.md }]}>
      <Text style={s.label}>메시지</Text>
      <Text style={s.sub}>Brand inbox & priority conversations — coming soon</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
  },
  label: { ...typography.title, color: colors.text.primary },
  sub:   { ...typography.body,  color: colors.text.muted },
});
