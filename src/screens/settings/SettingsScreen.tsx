import { Text } from '@/components/Text';
import React, { useState, useEffect } from 'react';
import {
  View, ScrollView, TouchableOpacity,
  StyleSheet, Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../hooks/useAuth';
import { useSocialChannels } from '../../hooks/useSocialChannels';
import { theme } from '../../constants/theme';
import { supabase } from '../../api/supabase';
import type { RootStackParamList } from '../../navigation/AppNavigator';

const { colors, space, radius, shadows, typography } = theme;

const PLATFORM_CFG: Record<string, { label: string; icon: string; color: string }> = {
  youtube:   { label: 'YouTube',   icon: '▶', color: '#FF0000' },
  instagram: { label: 'Instagram', icon: '◎', color: '#E1306C' },
  tiktok:    { label: 'TikTok',    icon: '♪', color: '#010101' },
};
const PLATFORMS = ['youtube', 'instagram', 'tiktok'] as const;

function Divider() {
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border.faint, marginLeft: space.lg }} />;
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { user, signOut } = useAuth();
  const { channels } = useSocialChannels(user?.id);
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [notifBrand, setNotifBrand]       = useState(true);
  const [notifSchedule, setNotifSchedule] = useState(true);
  const [notifAI, setNotifAI]             = useState(false);
  const [dbName, setDbName]               = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.multiGet(['notif_brand', 'notif_schedule', 'notif_ai']).then((pairs) => {
      const map = Object.fromEntries(pairs.map(([k, v]) => [k, v]));
      if (map['notif_brand']    !== null) setNotifBrand(map['notif_brand']    === 'true');
      if (map['notif_schedule'] !== null) setNotifSchedule(map['notif_schedule'] === 'true');
      if (map['notif_ai']       !== null) setNotifAI(map['notif_ai']       === 'true');
    });
  }, []);

  function saveNotif(key: string, value: boolean) {
    AsyncStorage.setItem(key, String(value));
  }

  useEffect(() => {
    if (!user?.id || user?.user_metadata?.full_name) return;
    supabase.from('users').select('name').eq('id', user.id).single()
      .then(({ data }) => { if (data?.name) setDbName(data.name); });
  }, [user?.id]);

  const userName = user?.user_metadata?.full_name ?? dbName ?? '크리에이터';
  const niche    = user?.user_metadata?.niche ?? '크리에이터';
  const initial  = userName.charAt(0).toUpperCase();

  const channelByPlatform = Object.fromEntries(channels.map((c) => [c.platform, c]));

  async function handleSignOut() {
    await signOut();
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
          <View>
            <Text style={s.profileName}>{userName}</Text>
            <Text style={s.profileNiche}>{niche}</Text>
          </View>
        </View>

        {/* 연결된 계정 */}
        <Text style={s.sectionLabel}>연결된 계정</Text>
        <View style={s.card}>
          {PLATFORMS.map((platform, i) => {
            const cfg = PLATFORM_CFG[platform];
            const ch  = channelByPlatform[platform];
            const handle = ch?.handle ? `@${ch.handle}` : ch?.channel_name ?? '';
            return (
              <React.Fragment key={platform}>
                {i > 0 && <Divider />}
                <TouchableOpacity
                  style={s.row}
                  activeOpacity={ch ? 1 : 0.7}
                  onPress={() => {
                    if (!ch && platform === 'youtube') navigation.navigate('YouTubeConnect');
                  }}
                >
                  <View style={[s.platformIcon, { backgroundColor: cfg.color + '15' }]}>
                    <Text style={[s.platformIconText, { color: cfg.color }]}>{cfg.icon}</Text>
                  </View>
                  <View style={s.rowInfo}>
                    <Text style={s.rowLabel}>{cfg.label}</Text>
                    <Text style={s.rowSub}>{ch ? handle || '연결됨' : '연결되지 않음'}</Text>
                  </View>
                  <Switch
                    value={!!ch}
                    onValueChange={() => {
                      if (!ch && platform === 'youtube') navigation.navigate('YouTubeConnect');
                    }}
                    disabled={!!ch}
                    trackColor={{ false: colors.border.default, true: '#3D5AFE' }}
                    thumbColor="#fff"
                    ios_backgroundColor={colors.border.default}
                  />
                </TouchableOpacity>
              </React.Fragment>
            );
          })}
        </View>

        {/* 알림 */}
        <Text style={s.sectionLabel}>알림</Text>
        <View style={s.card}>
          {([
            ['브랜드 메시지', notifBrand,    (v: boolean) => { setNotifBrand(v);    saveNotif('notif_brand', v);    }],
            ['일정 알림',    notifSchedule, (v: boolean) => { setNotifSchedule(v); saveNotif('notif_schedule', v); }],
            ['AI 인사이트',  notifAI,       (v: boolean) => { setNotifAI(v);       saveNotif('notif_ai', v);       }],
          ] as [string, boolean, (v: boolean) => void][]).map(([label, val, setter], i) => (
            <React.Fragment key={label}>
              {i > 0 && <Divider />}
              <View style={s.row}>
                <Text style={[s.rowLabel, { flex: 1 }]}>{label}</Text>
                <Switch
                  value={val}
                  onValueChange={setter}
                  trackColor={{ false: colors.border.default, true: '#3D5AFE' }}
                  thumbColor="#fff"
                  ios_backgroundColor={colors.border.default}
                />
              </View>
            </React.Fragment>
          ))}
        </View>

        {/* 내 작업실 / 수익 */}
        <Text style={s.sectionLabel}>작업실</Text>
        <View style={s.card}>
          <TouchableOpacity style={s.row} onPress={() => navigation.navigate('MediaKitEdit')} activeOpacity={0.7}>
            <View style={[s.platformIcon, { backgroundColor: '#6E56F015' }]}>
              <Text style={[s.platformIconText, { color: '#6E56F0' }]}>📇</Text>
            </View>
            <Text style={[s.rowLabel, { flex: 1 }]}>미디어킷 관리</Text>
            <Text style={{ fontSize: 18, color: colors.text.tertiary }}>›</Text>
          </TouchableOpacity>
          <Divider />
          <TouchableOpacity style={s.row} onPress={() => navigation.navigate('MediaKitSlug')} activeOpacity={0.7}>
            <View style={[s.platformIcon, { backgroundColor: '#0F9B8E15' }]}>
              <Text style={[s.platformIconText, { color: '#0F9B8E' }]}>🔗</Text>
            </View>
            <Text style={[s.rowLabel, { flex: 1 }]}>미디어킷 주소(URL)</Text>
            <Text style={{ fontSize: 18, color: colors.text.tertiary }}>›</Text>
          </TouchableOpacity>
          <Divider />
          <TouchableOpacity style={s.row} onPress={() => navigation.navigate('Studio')} activeOpacity={0.7}>
            <View style={[s.platformIcon, { backgroundColor: '#3D5AFE15' }]}>
              <Text style={[s.platformIconText, { color: '#3D5AFE' }]}>⊞</Text>
            </View>
            <Text style={[s.rowLabel, { flex: 1 }]}>내 작업실 보기</Text>
            <Text style={{ fontSize: 18, color: colors.text.tertiary }}>›</Text>
          </TouchableOpacity>
          <Divider />
          <TouchableOpacity style={s.row} onPress={() => navigation.navigate('Revenue')} activeOpacity={0.7}>
            <View style={[s.platformIcon, { backgroundColor: '#1D834815' }]}>
              <Text style={[s.platformIconText, { color: '#1D8348' }]}>💰</Text>
            </View>
            <Text style={[s.rowLabel, { flex: 1 }]}>수익 현황</Text>
            <Text style={{ fontSize: 18, color: colors.text.tertiary }}>›</Text>
          </TouchableOpacity>
        </View>

        {/* 기타 */}
        {([
          ['언어',   '한국어'],
          ['버전',   '1.0.0 beta'],
        ] as [string, string][]).map(([label, value], i, arr) => (
          <React.Fragment key={label}>
            <View style={s.plainRow}>
              <Text style={s.plainLabel}>{label}</Text>
              <Text style={s.plainValue}>{value}</Text>
            </View>
            {i < arr.length - 1 && <Divider />}
          </React.Fragment>
        ))}

        <TouchableOpacity style={s.feedback} onPress={() => navigation.navigate('Feedback')} activeOpacity={0.7}>
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
  root:   { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: space.screen, paddingVertical: space.lg, alignItems: 'center' },
  title:  { ...typography.navTitle, color: colors.text.primary },
  scroll: { paddingHorizontal: space.screen },

  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.faint,
    padding: space.lg,
    marginBottom: space.xl,
    gap: space.md,
    ...shadows.sm,
  },
  avatar:      { width: 48, height: 48, borderRadius: radius.md, backgroundColor: colors.border.medium, alignItems: 'center', justifyContent: 'center' },
  avatarText:  { ...typography.heading, color: '#fff' },
  profileName: { ...typography.bodyStrong, color: colors.text.primary },
  profileNiche:{ ...typography.caption,   color: colors.text.tertiary, marginTop: 2 },

  sectionLabel: { ...typography.sectionTitle, color: colors.text.primary, marginBottom: space.sm },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.faint,
    marginBottom: space.xl,
    overflow: 'hidden',
    ...shadows.sm,
  },
  row:            { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg, paddingVertical: space.md + 2, gap: space.md },
  platformIcon:   { width: 32, height: 32, borderRadius: radius.sm + 2, alignItems: 'center', justifyContent: 'center' },
  platformIconText: { fontSize: 13, fontWeight: '700' },
  rowInfo:        { flex: 1 },
  rowLabel:       { ...typography.body, color: colors.text.primary, fontWeight: '500' },
  rowSub:         { ...typography.caption, color: colors.text.tertiary, marginTop: 1 },

  plainRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: space.md + 2 },
  plainLabel: { ...typography.body, color: colors.text.primary },
  plainValue: { ...typography.body, color: colors.text.tertiary },

  feedback:     { marginTop: space.xxl, paddingVertical: space.md, alignItems: 'center', borderWidth: 1, borderColor: colors.border.default, borderRadius: radius.lg },
  feedbackText: { ...typography.body, color: colors.text.secondary },
  signOut:      { marginTop: space.md, paddingVertical: space.md, alignItems: 'center' },
  signOutText:  { ...typography.body, color: colors.semantic.error },
});
