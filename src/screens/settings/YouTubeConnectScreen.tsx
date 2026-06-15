import { Text } from '@/components/Text';
import React, { useState, useEffect } from 'react';
import { makeLogger } from '../../utils/logger';

const log = makeLogger('YouTubeConnectScreen');
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { useAuth } from '../../hooks/useAuth';
import { useSocialChannels, SocialChannel } from '../../hooks/useSocialChannels';
import { supabase } from '../../api/supabase';
import { colors } from '../../constants/colors';
import { ENV } from '../../config/env';
import { RootStackParamList } from '../../navigation/AppNavigator';

WebBrowser.maybeCompleteAuthSession();

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'YouTubeConnect'>;
};

function ChannelCard({ ch, formatCount, onSync }: {
  ch: SocialChannel;
  formatCount: (n: number) => string;
  onSync: () => void;
}) {
  const updatedAt = new Date(ch.updated_at).toLocaleDateString('ko-KR');
  return (
    <View style={card.wrapper}>
      <View style={card.header}>
        <View style={card.avatar}>
          <Text style={card.avatarText}>▶</Text>
        </View>
        <View style={card.info}>
          <Text style={card.name}>{ch.channel_name}</Text>
          <Text style={card.updated}>마지막 동기화 {updatedAt}</Text>
        </View>
        <TouchableOpacity style={card.syncBtn} onPress={onSync} activeOpacity={0.8}>
          <Text style={card.syncBtnText}>↻ 동기화</Text>
        </TouchableOpacity>
      </View>
      <View style={card.stats}>
        <Stat label="구독자" value={formatCount(ch.subscriber_count)} />
        <View style={card.divider} />
        <Stat label="총 조회수" value={formatCount(ch.view_count)} />
        <View style={card.divider} />
        <Stat label="영상 수" value={`${ch.video_count}개`} />
      </View>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={card.stat}>
      <Text style={card.statValue}>{value}</Text>
      <Text style={card.statLabel}>{label}</Text>
    </View>
  );
}

const card = StyleSheet.create({
  wrapper: {
    backgroundColor: '#fff', borderRadius: 18, padding: 18, marginBottom: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 12 },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#FF0000', alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: '700', color: '#1A1A2E' },
  updated: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  syncBtn: {
    backgroundColor: '#F0EFFE', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10,
  },
  syncBtnText: { fontSize: 12, fontWeight: '700', color: colors.primary },
  stats: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F4F0FF', borderRadius: 12, padding: 14 },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '800', color: '#1A1A2E', marginBottom: 2 },
  statLabel: { fontSize: 11, color: '#7C6FCD' },
  divider: { width: 1, height: 32, backgroundColor: 'rgba(110,86,240,0.15)' },
});

// YouTube Analytics OAuth 설정
const ANALYTICS_SCOPES = [
  'https://www.googleapis.com/auth/yt-analytics.readonly',
]

export default function YouTubeConnectScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { channels, loading, syncChannel, formatCount } = useSocialChannels(user?.id);

  const [input, setInput] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [analyticsLinked, setAnalyticsLinked] = useState(false);
  const [analyticsLinking, setAnalyticsLinking] = useState(false);

  // Analytics 연동 여부 확인 (토큰은 소유자 전용 테이블 — 본인 행만 조회됨)
  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from('social_channel_tokens')
      .select('youtube_access_token')
      .eq('user_id', user.id)
      .eq('platform', 'youtube')
      .maybeSingle()
      .then(({ data }) => {
        setAnalyticsLinked(!!data?.youtube_access_token);
      });
  }, [user?.id, channels]);

  // expo-auth-session으로 Google OAuth 요청
  // (Expo auth proxy는 SDK 48에서 폐지 — useProxy 옵션 제거됨)
  const redirectUri = AuthSession.makeRedirectUri();

  const discovery = {
    authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenEndpoint: 'https://oauth2.googleapis.com/token',
  };

  const [request, , promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: ENV.GOOGLE_WEB_CLIENT_ID,
      redirectUri,
      scopes: ANALYTICS_SCOPES,
      responseType: AuthSession.ResponseType.Code,
      extraParams: { access_type: 'offline', prompt: 'consent' },
    },
    discovery,
  );

  async function handleAnalyticsConnect() {
    if (!user?.id || !request) return;
    const ytChannel = channels.find((c) => c.platform === 'youtube');
    if (!ytChannel) {
      setErrorMsg('먼저 YouTube 채널을 연동해주세요.');
      return;
    }

    setAnalyticsLinking(true);
    setErrorMsg('');

    try {
      const result = await promptAsync();
      if (result.type !== 'success') {
        setAnalyticsLinking(false);
        return;
      }

      const { data, error: fnError } = await supabase.functions.invoke('youtube-analytics-auth', {
        body: {
          code: result.params.code,
          redirectUri,
          userId: user.id,
        },
      });

      if (fnError || data?.error) {
        setErrorMsg(data?.error ?? '연동에 실패했습니다.');
      } else {
        setAnalyticsLinked(true);
        setSuccessMsg('✓ 채널 및 Analytics 연동 완료! 실제 유입 데이터를 수집합니다.');
        setTimeout(() => setSuccessMsg(''), 4000);
      }
    } catch (e: any) {
      setErrorMsg(e.message ?? '오류가 발생했습니다.');
    } finally {
      setAnalyticsLinking(false);
    }
  }

  log.debug('render:', { channelCount: channels.length, loading });

  async function handleConnect() {
    if (!input.trim()) return;
    setErrorMsg('');
    setSuccessMsg('');
    setSyncing(true);
    const err = await syncChannel(input.trim());
    setSyncing(false);
    if (err) {
      setErrorMsg(err);
      return;
    }
    setInput('');
    // 채널 연동 성공 → Analytics OAuth 자동 진행
    if (!analyticsLinked) {
      setSuccessMsg('✓ 채널 연동 완료! Analytics 권한을 요청합니다...');
      await handleAnalyticsConnect();
    } else {
      setSuccessMsg('✓ 채널이 연동됐습니다!');
      setTimeout(() => setSuccessMsg(''), 3000);
    }
  }

  async function handleSync(channelId: string) {
    setErrorMsg('');
    setSyncing(true);
    const err = await syncChannel(channelId);
    setSyncing(false);
    if (err) setErrorMsg(err);
    else setSuccessMsg('✓ 동기화 완료');
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>채널 연동</Text>
          <Text style={styles.subtitle}>YouTube 채널 통계 자동 동기화</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* 입력 카드 */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>YouTube 채널 추가</Text>
          <Text style={styles.cardDesc}>채널 URL, @핸들, 또는 채널 ID를 입력하세요</Text>

          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              value={input}
              onChangeText={setInput}
              placeholder="예: @jisoo_creator 또는 채널 URL"
              placeholderTextColor="#C4C4C4"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.examples}>
            <Text style={styles.exampleLabel}>입력 예시</Text>
            <Text style={styles.exampleItem}>• @채널핸들</Text>
            <Text style={styles.exampleItem}>• youtube.com/@채널핸들</Text>
            <Text style={styles.exampleItem}>• UCxxxxxxxxxxxxxxxxxxxxxx (채널 ID)</Text>
          </View>

          {errorMsg ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠ {errorMsg}</Text>
            </View>
          ) : null}
          {successMsg ? (
            <View style={styles.successBox}>
              <Text style={styles.successText}>{successMsg}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.connectBtn, (!input.trim() || syncing) && styles.connectBtnDisabled]}
            onPress={handleConnect}
            disabled={!input.trim() || syncing}
            activeOpacity={0.85}
          >
            {syncing
              ? <ActivityIndicator color="#fff" size="small" />
              : <Text style={styles.connectBtnText}>▶ 채널 연동하기</Text>
            }
          </TouchableOpacity>
        </View>

        {/* YouTube Analytics 연동 카드 */}
        {channels.some((c) => c.platform === 'youtube') && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>📊 YouTube Analytics 연동</Text>
            <Text style={styles.cardDesc}>
              실제 검색 유입 키워드를 확인하려면 Google 계정 권한이 필요합니다.
            </Text>

            {analyticsLinked ? (
              <View style={styles.successBox}>
                <Text style={styles.successText}>✓ Analytics 연동됨 — 실제 유입 키워드 수집 중</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.connectBtn, { backgroundColor: '#4285F4' }, analyticsLinking && styles.connectBtnDisabled]}
                onPress={handleAnalyticsConnect}
                disabled={analyticsLinking || !request}
                activeOpacity={0.85}
              >
                {analyticsLinking
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.connectBtnText}>🔗 Google 계정으로 Analytics 연동</Text>
                }
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* 연동된 채널 목록 */}
        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ paddingVertical: 32 }} />
        ) : channels.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>연동된 채널</Text>
            {channels.map((ch) => (
              <ChannelCard
                key={ch.id}
                ch={ch}
                formatCount={formatCount}
                onSync={() => handleSync(ch.channel_id)}
              />
            ))}
          </>
        ) : (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📺</Text>
            <Text style={styles.emptyText}>연동된 채널이 없습니다</Text>
            <Text style={styles.emptySubText}>위에서 채널을 추가해보세요</Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F3EF' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 16, gap: 14,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 3, elevation: 2,
  },
  backArrow: { fontSize: 18, color: '#374151' },
  title:    { fontSize: 20, fontWeight: '800', color: '#1A1A2E', letterSpacing: -0.4 },
  subtitle: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  scroll: { paddingHorizontal: 20 },

  card: {
    backgroundColor: '#fff', borderRadius: 20, padding: 20, marginBottom: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A2E', marginBottom: 4 },
  cardDesc:  { fontSize: 12, color: '#9CA3AF', marginBottom: 16 },

  inputRow: {
    borderWidth: 1.5, borderColor: '#E8E4FF', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, backgroundColor: '#F4F0FF',
    marginBottom: 12,
  },
  input: { fontSize: 14, color: '#1A1A2E' },

  examples: { backgroundColor: '#F4F0FF', borderRadius: 10, padding: 12, marginBottom: 16 },
  exampleLabel: { fontSize: 11, fontWeight: '600', color: '#9CA3AF', marginBottom: 6 },
  exampleItem:  { fontSize: 12, color: '#6B7280', lineHeight: 20 },

  connectBtn: {
    backgroundColor: '#FF0000', borderRadius: 14,
    paddingVertical: 15, alignItems: 'center',
    shadowColor: '#FF0000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
  },
  connectBtnDisabled: { opacity: 0.4, shadowOpacity: 0 },
  connectBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },

  errorBox:    { backgroundColor: '#FEE2E2', borderRadius: 10, padding: 12, marginBottom: 10 },
  errorText:   { fontSize: 13, color: '#DC2626', fontWeight: '500' },
  successBox:  { backgroundColor: '#D1FAE5', borderRadius: 10, padding: 12, marginBottom: 10 },
  successText: { fontSize: 13, color: '#059669', fontWeight: '600' },

  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#9CA3AF', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 12 },

  empty: { alignItems: 'center', paddingVertical: 48, gap: 8 },
  emptyIcon:    { fontSize: 44 },
  emptyText:    { fontSize: 15, fontWeight: '700', color: '#374151' },
  emptySubText: { fontSize: 13, color: '#9CA3AF' },
});