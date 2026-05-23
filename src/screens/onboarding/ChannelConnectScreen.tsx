import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, ActivityIndicator, Linking,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth';
import { useSocialChannels } from '../../hooks/useSocialChannels';
import { supabase } from '../../api/supabase';
import { ENV } from '../../config/env';
import { colors } from '../../constants/colors';

WebBrowser.maybeCompleteAuthSession();

interface Props {
  onComplete: () => void;
}

type Tab = 'youtube' | 'instagram';

const INSTAGRAM_SCOPE = 'instagram_business_basic';

export default function ChannelConnectScreen({ onComplete }: Props) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { channels, loading, syncChannel, saveInstagramChannel, refetch } = useSocialChannels(user?.id);

  const [tab, setTab] = useState<Tab>('youtube');
  const [youtubeInput, setYoutubeInput] = useState('');
  const [instagramInput, setInstagramInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showInstagramGuide, setShowInstagramGuide] = useState(false);

  const hasChannel = channels.length > 0;
  const youtubeChannel = channels.find((c) => c.platform === 'youtube');
  const instagramChannel = channels.find((c) => c.platform === 'instagram');
  const hasOAuthConfig = !!ENV.FACEBOOK_APP_ID;

  async function handleYoutubeConnect() {
    if (!youtubeInput.trim()) return;
    setError('');
    setSubmitting(true);
    const err = await syncChannel(youtubeInput.trim());
    setSubmitting(false);
    if (err) setError(err);
    else setYoutubeInput('');
  }

  async function handleInstagramOAuth() {
    if (!user?.id) return;
    setError('');
    setSubmitting(true);
    try {
      const redirectUri = AuthSession.makeRedirectUri({
        scheme: ENV.APP_SCHEME,
        path: 'auth/instagram',
      });

      const authUrl =
        `https://www.facebook.com/v21.0/dialog/oauth?` +
        `client_id=${ENV.FACEBOOK_APP_ID}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&scope=${INSTAGRAM_SCOPE}` +
        `&response_type=code&display=popup`;

      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);

      if (result.type !== 'success') {
        setSubmitting(false);
        return;
      }

      const urlParams = new URL(result.url).searchParams;
      const code = urlParams.get('code');
      if (!code) {
        setError('인증 코드를 받지 못했습니다. 다시 시도해주세요.');
        setSubmitting(false);
        return;
      }

      const { data, error: fnErr } = await supabase.functions.invoke('instagram-auth', {
        body: { code, redirectUri, userId: user.id },
      });

      if (fnErr || data?.error) {
        const msg = data?.error ?? fnErr?.message ?? '연동에 실패했습니다';
        if (msg === 'instagram_personal_account') {
          setShowInstagramGuide(true);
          setError('비즈니스/크리에이터 계정으로 전환 후 다시 시도해주세요.');
        } else if (msg === 'instagram_no_business_account') {
          setError('Instagram 비즈니스 계정이 Facebook 페이지에 연결되어 있지 않습니다.');
        } else {
          setError(msg);
        }
      } else {
        await refetch();
      }
    } catch (e: any) {
      setError(e.message ?? '연동에 실패했습니다');
    }
    setSubmitting(false);
  }

  async function handleInstagramHandle() {
    const handle = instagramInput.replace(/^@/, '').trim();
    if (!handle) return;
    setError('');
    setSubmitting(true);
    const err = await saveInstagramChannel(handle);
    setSubmitting(false);
    if (err) setError(err);
    else setInstagramInput('');
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>채널을 연결해주세요</Text>
        <Text style={styles.desc}>
          최소 1개의 채널을 연결해야{'\n'}매니비를 시작할 수 있어요
        </Text>

        {hasChannel && (
          <View style={styles.connectedSection}>
            {youtubeChannel && (
              <ConnectedBadge
                icon="▶"
                color="#FF0000"
                label={`@${youtubeChannel.handle ?? youtubeChannel.channel_name}`}
                platform="YouTube"
              />
            )}
            {instagramChannel && (
              <ConnectedBadge
                icon="📸"
                color="#E1306C"
                label={`@${instagramChannel.handle}`}
                platform="Instagram"
              />
            )}
          </View>
        )}

        {/* 탭 */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, tab === 'youtube' && styles.tabActiveYT]}
            onPress={() => { setTab('youtube'); setError(''); }}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, tab === 'youtube' && styles.tabTextActiveYT]}>
              ▶ YouTube
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, tab === 'instagram' && styles.tabActiveIG]}
            onPress={() => { setTab('instagram'); setError(''); }}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, tab === 'instagram' && styles.tabTextActiveIG]}>
              📸 Instagram
            </Text>
          </TouchableOpacity>
        </View>

        {/* YouTube */}
        {tab === 'youtube' && (
          <View style={styles.card}>
            {youtubeChannel ? (
              <AlreadyConnected label="YouTube 채널이 연결됐습니다" />
            ) : (
              <>
                <Text style={styles.cardLabel}>채널 URL, @핸들, 또는 채널 ID</Text>
                <View style={styles.inputRow}>
                  <TextInput
                    style={styles.input}
                    value={youtubeInput}
                    onChangeText={setYoutubeInput}
                    placeholder="예: @channel_handle"
                    placeholderTextColor="#C4C4C4"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
                <ConnectButton
                  label="YouTube 연결하기"
                  color="#FF0000"
                  disabled={!youtubeInput.trim() || submitting}
                  loading={submitting}
                  onPress={handleYoutubeConnect}
                />
              </>
            )}
          </View>
        )}

        {/* Instagram */}
        {tab === 'instagram' && (
          <View style={styles.card}>
            {instagramChannel ? (
              <AlreadyConnected label="Instagram 계정이 연결됐습니다" />
            ) : (
              <>
                {/* Business/Creator 안내 토글 */}
                <TouchableOpacity
                  style={styles.guideToggle}
                  onPress={() => setShowInstagramGuide((v) => !v)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.guideToggleText}>
                    ⚠ 비즈니스 또는 크리에이터 계정만 지원됩니다
                  </Text>
                  <Text style={styles.guideToggleArrow}>{showInstagramGuide ? '▲' : '▼'}</Text>
                </TouchableOpacity>

                {showInstagramGuide && (
                  <View style={styles.guideBox}>
                    <Text style={styles.guideTitle}>계정 전환 방법</Text>
                    <Text style={styles.guideStep}>1. Instagram 앱 → 프로필 → 메뉴(☰)</Text>
                    <Text style={styles.guideStep}>2. 설정 및 활동 → 계정 유형 및 도구</Text>
                    <Text style={styles.guideStep}>3. 크리에이터 또는 비즈니스 계정으로 전환</Text>
                    <TouchableOpacity
                      onPress={() => Linking.openURL('https://help.instagram.com/502981923235522')}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.guideLink}>공식 가이드 보기 →</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {hasOAuthConfig ? (
                  /* OAuth 연동 */
                  <ConnectButton
                    label="Instagram으로 로그인"
                    color="#E1306C"
                    disabled={submitting}
                    loading={submitting}
                    onPress={handleInstagramOAuth}
                  />
                ) : (
                  /* Fallback: 핸들 입력 */
                  <>
                    <Text style={styles.cardLabel}>Instagram 핸들</Text>
                    <View style={styles.inputRow}>
                      <Text style={styles.inputPrefix}>@</Text>
                      <TextInput
                        style={[styles.input, { flex: 1 }]}
                        value={instagramInput}
                        onChangeText={setInstagramInput}
                        placeholder="your_handle"
                        placeholderTextColor="#C4C4C4"
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                    </View>
                    <ConnectButton
                      label="Instagram 연결하기"
                      color="#E1306C"
                      disabled={!instagramInput.trim() || submitting}
                      loading={submitting}
                      onPress={handleInstagramHandle}
                    />
                  </>
                )}
              </>
            )}
          </View>
        )}

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>⚠ {error}</Text>
          </View>
        ) : null}

        {loading && <ActivityIndicator color={colors.primary} style={{ marginVertical: 16 }} />}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          style={[styles.startBtn, !hasChannel && styles.startBtnDisabled]}
          onPress={onComplete}
          disabled={!hasChannel}
          activeOpacity={0.85}
        >
          <Text style={styles.startBtnText}>
            {hasChannel ? '매니비 시작하기 →' : '채널을 연결하면 시작할 수 있어요'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function AlreadyConnected({ label }: { label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 }}>
      <Text style={{ fontSize: 20, color: '#059669' }}>✓</Text>
      <Text style={{ fontSize: 15, fontWeight: '600', color: '#059669' }}>{label}</Text>
    </View>
  );
}

function ConnectButton({
  label, color, disabled, loading: isLoading, onPress,
}: {
  label: string; color: string; disabled: boolean; loading: boolean; onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[
        btn.base,
        { backgroundColor: color, shadowColor: color },
        disabled && btn.disabled,
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
    >
      {isLoading
        ? <ActivityIndicator color="#fff" size="small" />
        : <Text style={btn.text}>{label}</Text>
      }
    </TouchableOpacity>
  );
}

const btn = StyleSheet.create({
  base: {
    borderRadius: 14, paddingVertical: 14, alignItems: 'center',
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25,
    shadowRadius: 8, elevation: 4,
  },
  disabled: { opacity: 0.4, shadowOpacity: 0 },
  text: { color: '#fff', fontSize: 15, fontWeight: '800' },
});

function ConnectedBadge({
  icon, color, label, platform,
}: {
  icon: string; color: string; label: string; platform: string;
}) {
  return (
    <View style={[badge.wrap, { borderColor: color + '40', backgroundColor: color + '10' }]}>
      <Text style={badge.icon}>{icon}</Text>
      <View>
        <Text style={[badge.platform, { color }]}>{platform}</Text>
        <Text style={badge.label}>{label}</Text>
      </View>
      <View style={[badge.check, { backgroundColor: color }]}>
        <Text style={badge.checkText}>✓</Text>
      </View>
    </View>
  );
}

const badge = StyleSheet.create({
  wrap: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1.5, borderRadius: 14, padding: 12, marginBottom: 8,
  },
  icon:     { fontSize: 22 },
  platform: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
  label:    { fontSize: 14, fontWeight: '600', color: '#1A1A2E', marginTop: 1 },
  check: {
    marginLeft: 'auto', width: 22, height: 22, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
  },
  checkText: { color: '#fff', fontSize: 11, fontWeight: '800' },
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },

  scroll: { paddingHorizontal: 24, paddingTop: 32, paddingBottom: 16 },

  title: {
    fontSize: 26, fontWeight: '800', color: colors.text,
    lineHeight: 34, marginBottom: 10,
  },
  desc: {
    fontSize: 14, color: colors.textSecondary,
    lineHeight: 22, marginBottom: 28,
  },

  connectedSection: { marginBottom: 20 },

  tabs: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  tab: {
    flex: 1, paddingVertical: 10, borderRadius: 12,
    borderWidth: 1.5, borderColor: '#E8E4FF',
    alignItems: 'center', backgroundColor: '#fff',
  },
  tabActiveYT: { borderColor: '#FF0000', backgroundColor: '#FFF0F0' },
  tabActiveIG: { borderColor: '#E1306C', backgroundColor: '#FFF0F5' },
  tabText:          { fontSize: 13, fontWeight: '600', color: '#9CA3AF' },
  tabTextActiveYT:  { color: '#FF0000' },
  tabTextActiveIG:  { color: '#E1306C' },

  card: {
    backgroundColor: '#fff', borderRadius: 20, padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3, marginBottom: 16,
  },

  guideToggle: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFF7ED', borderRadius: 10, padding: 12,
    marginBottom: 12, gap: 8,
  },
  guideToggleText:  { flex: 1, fontSize: 12, color: '#B45309', fontWeight: '600' },
  guideToggleArrow: { fontSize: 11, color: '#B45309' },

  guideBox: {
    backgroundColor: '#FFFBEB', borderRadius: 10, padding: 14,
    marginBottom: 14, borderWidth: 1, borderColor: '#FDE68A',
  },
  guideTitle: { fontSize: 13, fontWeight: '700', color: '#92400E', marginBottom: 8 },
  guideStep:  { fontSize: 12, color: '#78350F', lineHeight: 22 },
  guideLink:  { fontSize: 12, color: '#D97706', fontWeight: '700', marginTop: 8 },

  cardLabel: { fontSize: 12, color: '#9CA3AF', fontWeight: '600', marginBottom: 10 },

  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#E8E4FF', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    backgroundColor: '#F4F0FF', marginBottom: 14,
  },
  inputPrefix: { fontSize: 15, color: '#9CA3AF', fontWeight: '600', marginRight: 4 },
  input:       { fontSize: 14, color: '#1A1A2E', flex: 1 },

  errorBox:  { backgroundColor: '#FEE2E2', borderRadius: 10, padding: 12, marginBottom: 10 },
  errorText: { fontSize: 13, color: '#DC2626', fontWeight: '500' },

  footer: {
    paddingHorizontal: 24, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: '#F3F4F6',
    backgroundColor: colors.background,
  },
  startBtn: {
    backgroundColor: colors.primary, borderRadius: 16,
    paddingVertical: 16, alignItems: 'center',
    shadowColor: colors.primary, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 12, elevation: 6,
  },
  startBtnDisabled: { backgroundColor: '#D1D5DB', shadowOpacity: 0 },
  startBtnText:     { color: '#fff', fontSize: 16, fontWeight: '800' },
});
