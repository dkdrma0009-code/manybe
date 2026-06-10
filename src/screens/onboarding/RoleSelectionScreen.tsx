import { Text } from '@/components/Text';
import React, { useState } from 'react';
import {
  View, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../../constants/colors';
import { tokens } from '../../constants/tokens';

export type UserRole = 'creator' | 'advertiser';

interface Props {
  onComplete: (role: UserRole) => void;
}

const ROLES: { key: UserRole; title: string; subtitle: string; icon: string; desc: string }[] = [
  {
    key: 'creator',
    title: '크리에이터',
    subtitle: '유튜버 · 인플루언서',
    icon: '🎬',
    desc: '협찬 딜 관리, 수익 추적,\n채널 분석을 한 곳에서',
  },
  {
    key: 'advertiser',
    title: '광고주',
    subtitle: '브랜드 · 마케터',
    icon: '📢',
    desc: '검증된 크리에이터 검색,\n협찬 제안 발송',
  },
];

export default function RoleSelectionScreen({ onComplete }: Props) {
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    if (!selected) return;
    setLoading(true);
    await AsyncStorage.setItem('user_role', selected);
    onComplete(selected);
  }

  return (
    <View style={[s.container, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
      <View style={s.header}>
        <Text style={s.title}>어떤 분이신가요?</Text>
        <Text style={s.subtitle}>역할에 맞는 화면을 보여드릴게요</Text>
      </View>

      <View style={s.cards}>
        {ROLES.map((role) => {
          const active = selected === role.key;
          return (
            <TouchableOpacity
              key={role.key}
              style={[s.card, active && s.cardActive]}
              onPress={() => setSelected(role.key)}
              activeOpacity={0.85}
            >
              <Text style={s.cardIcon}>{role.icon}</Text>
              <Text style={[s.cardTitle, active && s.cardTitleActive]}>{role.title}</Text>
              <Text style={[s.cardSub, active && s.cardSubActive]}>{role.subtitle}</Text>
              <Text style={[s.cardDesc, active && s.cardDescActive]}>{role.desc}</Text>
              {active && <View style={s.checkBadge}><Text style={s.checkText}>✓</Text></View>}
            </TouchableOpacity>
          );
        })}
      </View>

      <TouchableOpacity
        style={[s.button, !selected && s.buttonDisabled]}
        onPress={handleConfirm}
        disabled={!selected || loading}
        activeOpacity={0.85}
      >
        {loading
          ? <ActivityIndicator color="#fff" />
          : <Text style={s.buttonText}>시작하기</Text>
        }
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  cards: {
    flex: 1,
    justifyContent: 'center',
    gap: 16,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: colors.border,
    padding: 28,
    alignItems: 'center',
    position: 'relative',
  },
  cardActive: {
    borderColor: tokens.action,
    backgroundColor: tokens.actionSoft,
  },
  cardIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  cardTitleActive: {
    color: tokens.action,
  },
  cardSub: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  cardSubActive: {
    color: tokens.actionDeep,
  },
  cardDesc: {
    fontSize: 14,
    color: colors.textTertiary,
    textAlign: 'center',
    lineHeight: 20,
  },
  cardDescActive: {
    color: tokens.action,
  },
  checkBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: tokens.action,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  button: {
    backgroundColor: tokens.action,
    borderRadius: 14,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  buttonDisabled: {
    backgroundColor: colors.border,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
