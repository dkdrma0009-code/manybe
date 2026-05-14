import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Linking,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth';
import { colors } from '../../constants/colors';
import { supabase } from '../../api/supabase';
import { RootStackParamList } from '../../navigation/AppNavigator';

interface MenuRow {
  icon: string;
  label: string;
  value?: string;
  onPress?: () => void;
  danger?: boolean;
}

function Section({ title, items }: { title: string; items: MenuRow[] }) {
  return (
    <View style={section.wrapper}>
      <Text style={section.title}>{title}</Text>
      <View style={section.card}>
        {items.map((item, i) => (
          <TouchableOpacity
            key={item.label}
            style={[section.row, i < items.length - 1 && section.rowBorder]}
            onPress={item.onPress}
            activeOpacity={item.onPress ? 0.7 : 1}
          >
            <View style={section.rowLeft}>
              <View style={[section.iconBg, item.danger && section.iconBgDanger]}>
                <Text style={section.icon}>{item.icon}</Text>
              </View>
              <Text style={[section.label, item.danger && section.labelDanger]}>
                {item.label}
              </Text>
            </View>
            <View style={section.rowRight}>
              {item.value ? (
                <Text style={section.value}>{item.value}</Text>
              ) : null}
              {item.onPress && !item.danger ? (
                <Text style={section.chevron}>›</Text>
              ) : null}
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const section = StyleSheet.create({
  wrapper: { marginBottom: 24 },
  title: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9CA3AF',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F0EFFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBgDanger: {
    backgroundColor: '#FEE2E2',
  },
  icon: { fontSize: 18 },
  label: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1A1A2E',
  },
  labelDanger: { color: '#EF4444' },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  value: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  chevron: {
    fontSize: 20,
    color: '#D1D5DB',
  },
});

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const userName = user?.user_metadata?.full_name ?? '크리에이터';
  const userEmail = user?.email ?? '';
  const initial = userName.charAt(0).toUpperCase();

  const handleSignOut = () => {
    Alert.alert('로그아웃', '정말 로그아웃하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      { text: '로그아웃', style: 'destructive', onPress: signOut },
    ]);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>설정</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        <TouchableOpacity style={styles.profileCard} onPress={() => navigation.navigate('Profile')} activeOpacity={0.85}>
          <View style={styles.profileAvatar}>
            <Text style={styles.profileInitial}>{initial}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{userName}</Text>
            <Text style={styles.profileEmail}>{userEmail}</Text>
          </View>
          <Text style={styles.profileChevron}>›</Text>
        </TouchableOpacity>

        <Section
          title="비즈니스"
          items={[
            { icon: '📺', label: 'YouTube 채널 연동', onPress: () => navigation.navigate('YouTubeConnect') },
            { icon: '🔗', label: '미디어 키트 URL', onPress: () => navigation.navigate('MediaKitSlug') },
            { icon: '✏️', label: '미디어 키트 편집', onPress: () => navigation.navigate('MediaKitEdit') },
          ]}
        />

        <Section
          title="앱 설정"
          items={[
            { icon: '🔔', label: '알림 설정', onPress: () => Linking.openSettings() },
            { icon: '🌐', label: '언어', value: '한국어' },
            {
              icon: '🔒',
              label: '비밀번호 변경',
              onPress: () => Alert.alert('비밀번호 변경', '가입하신 이메일로 재설정 메일을 보내드릴까요?', [
                { text: '취소', style: 'cancel' },
                { text: '보내기', onPress: () => {
                  if (user?.email) supabase.auth.resetPasswordForEmail(user.email)
                    .then(() => Alert.alert('발송 완료', '이메일을 확인해주세요.'));
                }},
              ]),
            },
          ]}
        />

        <Section
          title="지원"
          items={[
            { icon: '💬', label: '고객 문의', onPress: () => Linking.openURL('mailto:help@manybe.app?subject=매니비 문의') },
            { icon: '📋', label: '이용약관', onPress: () => Linking.openURL('https://manybe-web.vercel.app/terms') },
            { icon: '🛡️', label: '개인정보 처리방침', onPress: () => Linking.openURL('https://manybe-web.vercel.app/privacy') },
            { icon: 'ℹ️', label: '앱 버전', value: '1.0.0' },
          ]}
        />

        <Section
          title="계정"
          items={[
            { icon: '🚪', label: '로그아웃', onPress: handleSignOut, danger: true },
          ]}
        />

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F3EF',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1A1A2E',
    letterSpacing: -0.4,
  },
  scroll: {
    paddingHorizontal: 20,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  profileAvatar: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInitial: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
  },
  profileInfo: { flex: 1 },
  profileName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 3,
  },
  profileEmail: {
    fontSize: 13,
    color: '#9CA3AF',
  },
  profileChevron: {
    fontSize: 22,
    color: '#D1D5DB',
  },
});
