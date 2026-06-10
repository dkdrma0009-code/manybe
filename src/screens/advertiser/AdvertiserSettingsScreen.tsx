import { Text } from '@/components/Text';
import React, { useState } from 'react';
import {
  View, ScrollView, TouchableOpacity,
  StyleSheet, Switch, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../../hooks/useAuth';
import { colors } from '../../constants/colors';
import { tokens } from '../../constants/tokens';
import type { AdvertiserRootStackParamList } from '../../navigation/AdvertiserNavigator';

type Nav = NativeStackNavigationProp<AdvertiserRootStackParamList>;

function Divider() {
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.borderFaint, marginLeft: 16 }} />;
}

export default function AdvertiserSettingsScreen() {
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();
  const navigation = useNavigation<Nav>();

  const [notifProposal, setNotifProposal] = useState(true);
  const [notifMessage, setNotifMessage]   = useState(true);

  const userName = user?.user_metadata?.full_name ?? '광고주';
  const initial  = userName.charAt(0).toUpperCase();

  async function handleSignOut() {
    Alert.alert('로그아웃', '정말 로그아웃 하시겠어요?', [
      { text: '취소', style: 'cancel' },
      { text: '로그아웃', style: 'destructive', onPress: () => signOut() },
    ]);
  }

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <Text style={s.title}>설정</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* 프로필 카드 */}
        <View style={s.profileCard}>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{initial}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.profileName}>{userName}</Text>
            <Text style={s.profileRole}>광고주</Text>
          </View>
        </View>

        {/* 알림 */}
        <Text style={s.sectionLabel}>알림</Text>
        <View style={s.card}>
          {([
            ['제안 수락/거절 알림', notifProposal, setNotifProposal],
            ['메시지 알림',        notifMessage,  setNotifMessage],
          ] as [string, boolean, (v: boolean) => void][]).map(([label, val, setter], i) => (
            <React.Fragment key={label}>
              {i > 0 && <Divider />}
              <View style={s.row}>
                <Text style={[s.rowLabel, { flex: 1 }]}>{label}</Text>
                <Switch
                  value={val}
                  onValueChange={setter}
                  trackColor={{ false: colors.border, true: tokens.action }}
                  thumbColor="#fff"
                  ios_backgroundColor={colors.border}
                />
              </View>
            </React.Fragment>
          ))}
        </View>

        {/* 기타 */}
        {([
          ['언어', '한국어'],
          ['버전', '1.0.0 beta'],
        ] as [string, string][]).map(([label, value], i, arr) => (
          <React.Fragment key={label}>
            <View style={s.plainRow}>
              <Text style={s.plainLabel}>{label}</Text>
              <Text style={s.plainValue}>{value}</Text>
            </View>
            {i < arr.length - 1 && <Divider />}
          </React.Fragment>
        ))}

        <TouchableOpacity
          style={s.feedback}
          onPress={() => navigation.navigate('Feedback')}
          activeOpacity={0.7}
        >
          <Text style={s.feedbackText}>피드백 보내기</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.signOut} onPress={handleSignOut} activeOpacity={0.7}>
          <Text style={s.signOutText}>로그아웃</Text>
        </TouchableOpacity>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingVertical: 16, alignItems: 'center' },
  title:  { fontSize: 18, fontWeight: '700', color: colors.text },
  scroll: { paddingHorizontal: 20 },

  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderFaint,
    padding: 16,
    marginBottom: 24,
    gap: 12,
  },
  avatar:      { width: 48, height: 48, borderRadius: 12, backgroundColor: tokens.actionSoft, alignItems: 'center', justifyContent: 'center' },
  avatarText:  { fontSize: 20, fontWeight: '700', color: tokens.action },
  profileName: { fontSize: 16, fontWeight: '700', color: colors.text },
  profileRole: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },

  sectionLabel: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderFaint,
    marginBottom: 24,
    overflow: 'hidden',
  },
  row:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  rowLabel: { fontSize: 15, color: colors.text, fontWeight: '500' },

  plainRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14 },
  plainLabel: { fontSize: 15, color: colors.text },
  plainValue: { fontSize: 15, color: colors.textSecondary },

  feedback:     { marginTop: 24, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 14 },
  feedbackText: { fontSize: 15, color: colors.textSecondary },
  signOut:      { marginTop: 8, paddingVertical: 14, alignItems: 'center' },
  signOutText:  { fontSize: 15, color: colors.error },
});
