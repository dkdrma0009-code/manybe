import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth';
import { colors } from '../../constants/colors';
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

// ─── 메인 화면 ──────────────────────────────────────────────

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const userName = user?.user_metadata?.full_name ?? '크리에이터';
  const userEmail = user?.email ?? 'dev@manybe.app';
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

        {/* 프로필 카드 */}
        <TouchableOpacity style={styles.profileCard} activeOpacity={0.85}>
          <View style={styles.profileAvatar}>
            <Text style={styles.profileInitial}>{initial}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{userName}</Text>
            <Text style={styles.profileEmail}>{userEmail}</Text>
          </View>
          <Text style={styles.profileChevron}>›</Text>
        </TouchableOpacity>

        {/* 구독 배너 */}
        <View style={styles.planBanner}>
          <View>
            <Text style={styles.planLabel}>현재 플랜</Text>
            <Text style={styles.planName}>무료 플랜</Text>
          </View>
          <TouchableOpacity style={styles.planUpgradeBtn} activeOpacity={0.85}>
            <Text style={styles.planUpgradeText}>Pro 업그레이드</Text>
          </TouchableOpacity>
        </View>

        <Section
          title="비즈니스"
          items={[
            { icon: '📺', label: 'YouTube 채널 연동', onPress: () => navigation.navigate('YouTubeConnect') },
            { icon: '🔗', label: '미디어 키트 URL', onPress: () => navigation.navigate('MediaKitSlug') },
            { icon: '🏦', label: '정산 계좌 관리', onPress: () => {} },
            { icon: '📄', label: '세금 계산기', onPress: () => navigation.navigate('TaxCalculator') },
          ]}
        />

        <Section
          title="앱 설정"
          items={[
            { icon: '🔔', label: '알림 설정', onPress: () => {} },
            { icon: '🌐', label: '언어', value: '한국어' },
            { icon: '🔒', label: '보안 / 비밀번호 변경', onPress: () => {} },
          ]}
        />

        <Section
          title="지원"
          items={[
            { icon: '💬', label: '고객 문의', onPress: () => {} },
            { icon: '📋', label: '이용약관', onPress: () => {} },
            { icon: '🛡️', label: '개인정보 처리방침', onPress: () => {} },
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
    backgroundColor: '#F8F8FF',
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
    marginBottom: 12,
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
  planBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1A1A2E',
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 14,
    marginBottom: 24,
  },
  planLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 3,
  },
  planName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  planUpgradeBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  planUpgradeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
});
