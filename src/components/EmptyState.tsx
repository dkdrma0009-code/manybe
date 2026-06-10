import { Text } from '@/components/Text';
import React from 'react';
import { View, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { tokens } from '../constants/tokens';
import { typography } from '../constants/typography';

interface Props {
  icon: string;
  title: string;
  desc?: string;
  action?: { label: string; onPress: () => void };
  style?: ViewStyle;
}

export default function EmptyState({ icon, title, desc, action, style }: Props) {
  return (
    <View style={[styles.wrap, style]}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.title}>{title}</Text>
      {desc ? <Text style={styles.desc}>{desc}</Text> : null}
      {action ? (
        <TouchableOpacity style={styles.btn} onPress={action.onPress} activeOpacity={0.85}>
          <Text style={styles.btnText}>{action.label}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingVertical: 44,
    paddingHorizontal: 32,
    gap: 10,
  },
  icon: {
    fontSize: 44,
    marginBottom: 4,
  },
  title: {
    ...typography.cardTitle,
    color: tokens.ink,
    textAlign: 'center',
  },
  desc: {
    ...typography.metadata,
    color: tokens.ink4,
    textAlign: 'center',
    lineHeight: 20,
  },
  btn: {
    marginTop: 8,
    backgroundColor: tokens.primary,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 14,
  },
  btnText: {
    ...typography.buttonSm,
    color: '#fff',
  },
});
