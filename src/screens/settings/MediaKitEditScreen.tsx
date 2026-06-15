import { Text } from '@/components/Text';
import React, { useState, useEffect } from 'react';
import {
  View, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, ActivityIndicator, Alert, Switch,
  KeyboardAvoidingView, Platform, FlatList, Modal,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../api/supabase';
import type { Json } from '../../types/database';
import { useAuth } from '../../hooks/useAuth';
import { colors } from '../../constants/colors';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { computePortfolioIntelligence } from '../../services/PortfolioIntelligence';
import { generateMediaKitIntelligence } from '../../services/MediaKitGenerator';
import {
  BADGE_CATALOG, BADGE_CATEGORIES, THEME_CATALOG, THEME_IDS, SECTION_CATALOG, DEFAULT_SECTION_ORDER,
  AUTO_VERIFIED_BADGES, computeVerifiedBadges,
} from '../../types/mediaKit';
import type { BadgeId, MediaKitTheme, SectionId, HighlightSection } from '../../types/mediaKit';
import { extractYoutubeThumbnail } from '../../types/mediaKit';
import { Image } from 'react-native';
import { ENV } from '../../config/env';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'MediaKitEdit'>;
};

const PRICING_KEYS = [
  { key: 'short_form',  label: '숏폼 (60초 이하)' },
  { key: 'long_form',   label: '롱폼 (10분 이상)' },
  { key: 'story',       label: '스토리 / 릴스' },
  { key: 'mention',     label: '제품 언급' },
  { key: 'dedicated',   label: '전체 광고 영상' },
] as const;

type PricingKey = typeof PRICING_KEYS[number]['key'];

export default function MediaKitEditScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasKit, setHasKit] = useState(false);
  const [generatingBio, setGeneratingBio] = useState(false);

  // fields
  const [bio, setBio] = useState('');
  const [pricing, setPricing] = useState<Partial<Record<PricingKey, string>>>({});
  const [pastBrands, setPastBrands] = useState<string[]>([]);
  const [brandInput, setBrandInput] = useState('');
  const [isFormEnabled, setIsFormEnabled] = useState(false);
  const [selectedBadges, setSelectedBadges] = useState<BadgeId[]>([]);
  const [verifiedBadges, setVerifiedBadges] = useState<BadgeId[]>([]);
  const [theme, setTheme] = useState<MediaKitTheme>('indigo');
  const [sectionOrder, setSectionOrder] = useState<SectionId[]>(DEFAULT_SECTION_ORDER);
  const [highlights, setHighlights] = useState<HighlightSection[]>([]);
  const [ytVideos, setYtVideos] = useState<{ id: string; title: string; views: string; thumbnail: string }[]>([]);
  const [ytModalVisible, setYtModalVisible] = useState(false);
  const [ytLoading, setYtLoading] = useState(false);
  const [targetSectionIdx, setTargetSectionIdx] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    loadMediaKit();
  }, [user]);

  async function loadMediaKit() {
    setLoading(true);

    // 연동 채널 데이터로 검증 뱃지 산출 (구독자 수·성장 — 자기 선택 불가)
    const { data: chans } = await supabase
      .from('social_channels')
      .select('subscriber_count, subscriber_history')
      .eq('user_id', user!.id);
    const verified = computeVerifiedBadges(
      (chans ?? []).map((c) => ({
        subscriber_count: c.subscriber_count,
        subscriber_history: (c.subscriber_history ?? []) as Array<{ date: string; count: number }>,
      })),
    );
    setVerifiedBadges(verified);

    const { data } = await supabase
      .from('media_kits')
      .select('bio, pricing, past_brands, is_form_enabled, badges, theme, section_order, highlights')
      .eq('user_id', user!.id)
      .limit(1);

    const kit = data?.[0];
    if (kit) {
      setHasKit(true);
      setBio(kit.bio ?? '');
      const pricingObj = (kit.pricing ?? {}) as Record<string, number>;
      const p: Partial<Record<PricingKey, string>> = {};
      for (const { key } of PRICING_KEYS) {
        const val = pricingObj[key];
        if (val != null) p[key] = String(val);
      }
      setPricing(p);
      setPastBrands((kit.past_brands ?? []) as string[]);
      setIsFormEnabled(kit.is_form_enabled ?? false);
      // 저장된 뱃지에서 검증 뱃지는 제외하고 수동 뱃지만 보관 (검증 뱃지는 저장 시 자동 합산)
      const savedManual = ((kit.badges ?? []) as BadgeId[]).filter((b) => !AUTO_VERIFIED_BADGES.includes(b));
      setSelectedBadges(savedManual);
      setTheme((kit.theme ?? 'indigo') as MediaKitTheme);
      setSectionOrder((kit.section_order ?? DEFAULT_SECTION_ORDER) as SectionId[]);
      setHighlights((kit.highlights ?? []) as unknown as HighlightSection[]);
    }
    setLoading(false);
  }

  async function handleGenerateBio() {
    if (!user) return;
    setGeneratingBio(true);
    try {
      const portfolio = await computePortfolioIntelligence(user.id, pastBrands);
      const intel = await generateMediaKitIntelligence(portfolio);
      setBio(intel.aiGeneratedBio);
    } catch {
      Alert.alert('오류', '자동완성에 실패했습니다.');
    } finally {
      setGeneratingBio(false);
    }
  }

  async function openYtPicker(sectionIdx: number) {
    if (!ENV.YOUTUBE_API_KEY) { Alert.alert('YouTube API 키가 없습니다.'); return; }
    setTargetSectionIdx(sectionIdx);
    setYtModalVisible(true);
    setYtLoading(true);
    try {
      const { data: channels } = await supabase
        .from('social_channels')
        .select('channel_id')
        .eq('user_id', user!.id)
        .eq('platform', 'youtube')
        .limit(1);
      const channelId = channels?.[0]?.channel_id;
      if (!channelId) { Alert.alert('연결된 YouTube 채널이 없습니다.'); setYtModalVisible(false); return; }

      const searchRes = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&type=video&order=viewCount&maxResults=10&key=${ENV.YOUTUBE_API_KEY}`
      );
      const searchData = await searchRes.json();
      const videoIds = (searchData.items ?? []).map((v: any) => v.id.videoId).join(',');
      if (!videoIds) { setYtVideos([]); return; }

      const statsRes = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&id=${videoIds}&key=${ENV.YOUTUBE_API_KEY}`
      );
      const statsData = await statsRes.json();
      const videos = (statsData.items ?? []).map((v: any) => ({
        id: v.id,
        title: v.snippet.title,
        views: Number(v.statistics.viewCount ?? 0).toLocaleString('ko-KR'),
        thumbnail: v.snippet.thumbnails?.medium?.url ?? `https://img.youtube.com/vi/${v.id}/mqdefault.jpg`,
      }));
      setYtVideos(videos);
    } catch {
      Alert.alert('YouTube 영상을 불러오지 못했습니다.');
      setYtModalVisible(false);
    } finally {
      setYtLoading(false);
    }
  }

  function addVideoToHighlight(video: { id: string; title: string; views: string; thumbnail: string }) {
    if (targetSectionIdx === null) return;
    const newItem = {
      label: video.title,
      value: `조회수 ${video.views}`,
      thumbnail: video.thumbnail,
    };
    setHighlights((prev) => prev.map((s, i) => i === targetSectionIdx
      ? { ...s, items: [...s.items, newItem] }
      : s,
    ));
    setYtModalVisible(false);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const pricingObj: Record<string, number> = {};
      for (const { key } of PRICING_KEYS) {
        const val = pricing[key];
        if (val && val.trim() !== '') {
          const num = parseInt(val.replace(/,/g, ''), 10);
          if (!isNaN(num)) pricingObj[key] = num;
        }
      }

      const payload = {
        bio: bio.trim() || null,
        pricing: Object.keys(pricingObj).length > 0 ? pricingObj : null,
        past_brands: pastBrands.length > 0 ? pastBrands : null,
        // PLAN_GATE: unlimited inquiry reception — consider capping monthly inbound inquiry count for free tier
        is_form_enabled: isFormEnabled,
        // 수동 선택 뱃지 + 자동 검증 뱃지 합산 저장
        badges: [...selectedBadges, ...verifiedBadges],
        theme,
        section_order: sectionOrder,
        highlights: highlights as unknown as Json,
      };

      // 신규 사용자는 media_kits 행이 아직 없으므로 insert.
      // slug는 NOT NULL — 이메일 기반 기본값 생성 (URL 화면에서 변경 가능)
      let error;
      if (hasKit) {
        ({ error } = await supabase.from('media_kits').update(payload).eq('user_id', user!.id));
      } else {
        const baseSlug = ((user!.email?.split('@')[0] ?? '')
          .toLowerCase().replace(/[^a-z0-9]/g, '')) || user!.id.slice(0, 8);
        ({ error } = await supabase.from('media_kits')
          .insert({ user_id: user!.id, slug: baseSlug, ...payload }));
        if (error?.code === '23505') {
          // slug 충돌 — 사용자 ID 일부를 붙여 재시도
          ({ error } = await supabase.from('media_kits')
            .insert({ user_id: user!.id, slug: `${baseSlug}-${user!.id.slice(0, 4)}`, ...payload }));
        }
      }

      if (error) throw error;
      if (!hasKit) setHasKit(true);
      Alert.alert('저장 완료', '미디어 키트가 업데이트됐습니다.', [
        { text: '닫기', style: 'cancel', onPress: () => navigation.goBack() },
        { text: '미리보기', onPress: () => navigation.navigate('MediaKitPreview') },
      ]);
    } catch (e: any) {
      Alert.alert('오류', e.message ?? '저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  }

  function addBrand() {
    const trimmed = brandInput.trim();
    if (!trimmed || pastBrands.includes(trimmed)) {
      setBrandInput('');
      return;
    }
    setPastBrands((prev) => [...prev, trimmed]);
    setBrandInput('');
  }

  function removeBrand(brand: string) {
    setPastBrands((prev) => prev.filter((b) => b !== brand));
  }

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* YouTube 영상 선택 모달 */}
      <Modal visible={ytModalVisible} transparent animationType="slide" onRequestClose={() => setYtModalVisible(false)}>
        <View style={styles.ytOverlay}>
          <View style={styles.ytSheet}>
            <View style={styles.ytHeader}>
              <Text style={styles.ytTitle}>YouTube 인기 영상</Text>
              <TouchableOpacity onPress={() => setYtModalVisible(false)}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>
            {ytLoading ? (
              <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
            ) : (
              <FlatList
                data={ytVideos}
                keyExtractor={(v) => v.id}
                contentContainerStyle={{ padding: 16, gap: 12 }}
                ListEmptyComponent={<Text style={{ textAlign: 'center', color: '#9CA3AF', marginTop: 32 }}>영상을 찾을 수 없습니다</Text>}
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.ytItem} onPress={() => addVideoToHighlight(item)} activeOpacity={0.75}>
                    <Image source={{ uri: item.thumbnail }} style={styles.ytThumb} />
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={styles.ytItemTitle} numberOfLines={2}>{item.title}</Text>
                      <Text style={styles.ytItemViews}>조회수 {item.views}</Text>
                    </View>
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>미디어 키트 편집</Text>
          <Text style={styles.subtitle}>브랜드에게 보여지는 내용</Text>
        </View>
        <TouchableOpacity
          style={[styles.saveBtn, saving && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={styles.saveBtnText}>저장</Text>
          }
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

          {/* 자기소개 */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>자기소개</Text>
                <Text style={styles.sectionDesc}>브랜드가 가장 먼저 보는 문구예요</Text>
              </View>
              <TouchableOpacity
                style={[styles.aiBtn, generatingBio && { opacity: 0.6 }]}
                onPress={handleGenerateBio}
                disabled={generatingBio}
                activeOpacity={0.8}
              >
                {generatingBio
                  ? <ActivityIndicator size="small" color={colors.primary} />
                  : <Text style={styles.aiBtnText}>✨ 자동완성</Text>
                }
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.bioInput}
              value={bio}
              onChangeText={setBio}
              placeholder="예: 뷰티·라이프스타일 크리에이터 | 구독자 10만 | 진정성 있는 리뷰로 소통합니다"
              placeholderTextColor="#C4C4C4"
              multiline
              numberOfLines={4}
              maxLength={200}
              textAlignVertical="top"
            />
            <Text style={styles.charCount}>{bio.length} / 200</Text>
          </View>

          {/* 광고 단가 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>광고 단가</Text>
            <Text style={styles.sectionDesc}>입력하지 않은 항목은 미디어 키트에 표시되지 않아요</Text>
            {PRICING_KEYS.map(({ key, label }) => (
              <View key={key} style={styles.priceRow}>
                <Text style={styles.priceLabel}>{label}</Text>
                <View style={styles.priceInputWrap}>
                  <TextInput
                    style={styles.priceInput}
                    value={pricing[key] ?? ''}
                    onChangeText={(t) => setPricing((prev) => ({ ...prev, [key]: t.replace(/[^0-9]/g, '') }))}
                    keyboardType="number-pad"
                    placeholder="0"
                    placeholderTextColor="#C4C4C4"
                  />
                  <Text style={styles.priceUnit}>원~</Text>
                </View>
              </View>
            ))}
          </View>

          {/* 협업 브랜드 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>협업 브랜드</Text>
            <Text style={styles.sectionDesc}>함께 일한 브랜드를 추가하면 신뢰도가 올라가요</Text>
            <View style={styles.brandInputRow}>
              <TextInput
                style={styles.brandInput}
                value={brandInput}
                onChangeText={setBrandInput}
                placeholder="브랜드명 입력"
                placeholderTextColor="#C4C4C4"
                onSubmitEditing={addBrand}
                returnKeyType="done"
              />
              <TouchableOpacity style={styles.brandAddBtn} onPress={addBrand} activeOpacity={0.8}>
                <Text style={styles.brandAddBtnText}>추가</Text>
              </TouchableOpacity>
            </View>
            {pastBrands.length > 0 && (
              <View style={styles.tagsWrap}>
                {pastBrands.map((brand) => (
                  <View key={brand} style={styles.tag}>
                    <Text style={styles.tagText}>{brand}</Text>
                    <TouchableOpacity onPress={() => removeBrand(brand)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                      <Text style={styles.tagRemove}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
            {pastBrands.length === 0 && (
              <Text style={styles.emptyBrands}>아직 추가된 브랜드가 없어요</Text>
            )}
          </View>

          {/* 테마 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>테마 색상</Text>
            <Text style={styles.sectionDesc}>미디어 키트 페이지의 색상 테마를 선택하세요</Text>
            <View style={styles.themeRow}>
              {THEME_IDS.map((id) => {
                const t = THEME_CATALOG[id];
                const active = theme === id;
                return (
                  <TouchableOpacity
                    key={id}
                    style={[styles.themeCircle, { backgroundColor: t.primary }, active && styles.themeCircleActive]}
                    onPress={() => setTheme(id)}
                    activeOpacity={0.8}
                  >
                    {active && <Text style={styles.themeCheck}>✓</Text>}
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={styles.themeLabel}>{THEME_CATALOG[theme].label}</Text>
          </View>

          {/* 뱃지 */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>나를 표현하는 뱃지</Text>
                <Text style={styles.sectionDesc}>최대 3개까지 선택할 수 있어요</Text>
              </View>
              <View style={[styles.badgeCount, selectedBadges.length === 3 && styles.badgeCountFull]}>
                <Text style={[styles.badgeCountText, selectedBadges.length === 3 && styles.badgeCountTextFull]}>
                  {selectedBadges.length} / 3
                </Text>
              </View>
            </View>

            {/* 자동 인증 뱃지 — 연동 채널 데이터 기반, 선택 불가 */}
            {verifiedBadges.length > 0 && (
              <View style={styles.badgeCatBlock}>
                <Text style={styles.badgeCatLabel}>✓ 자동 인증 (채널 데이터 기반)</Text>
                <View style={styles.badgeGrid}>
                  {verifiedBadges.map((id) => {
                    const b = BADGE_CATALOG[id];
                    return (
                      <View key={id} style={[styles.badgeChip, styles.badgeChipVerified]}>
                        <Text style={styles.badgeEmoji}>{b.emoji}</Text>
                        <Text style={[styles.badgeChipText, styles.badgeChipTextVerified]}>{b.label}</Text>
                        <Text style={styles.badgeVerifiedMark}>✓</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {BADGE_CATEGORIES.map((cat) => {
              const ids = (Object.keys(BADGE_CATALOG) as BadgeId[]).filter(
                (id) => BADGE_CATALOG[id].category === cat && !AUTO_VERIFIED_BADGES.includes(id),
              );
              if (ids.length === 0) return null;
              return (
                <View key={cat} style={styles.badgeCatBlock}>
                  <Text style={styles.badgeCatLabel}>{cat}</Text>
                  <View style={styles.badgeGrid}>
                    {ids.map((id) => {
                      const b = BADGE_CATALOG[id];
                      const selected = selectedBadges.includes(id);
                      const disabled = !selected && selectedBadges.length >= 3;
                      return (
                        <TouchableOpacity
                          key={id}
                          style={[
                            styles.badgeChip,
                            selected && styles.badgeChipSelected,
                            disabled && styles.badgeChipDisabled,
                          ]}
                          onPress={() => {
                            if (selected) {
                              setSelectedBadges((prev) => prev.filter((x) => x !== id));
                            } else if (!disabled) {
                              setSelectedBadges((prev) => [...prev, id]);
                            }
                          }}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.badgeEmoji}>{b.emoji}</Text>
                          <Text style={[styles.badgeChipText, selected && styles.badgeChipTextSelected, disabled && styles.badgeChipTextDisabled]}>
                            {b.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              );
            })}
          </View>

          {/* 섹션 표시 순서 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>섹션 표시 설정</Text>
            <Text style={styles.sectionDesc}>표시할 섹션을 선택하고 순서를 조정하세요</Text>
            {(['channels', 'pricing', 'brands'] as SectionId[]).map((id, i) => {
              const sec = SECTION_CATALOG[id];
              const enabled = sectionOrder.includes(id);
              return (
                <View key={id} style={styles.sectionRow}>
                  <View style={styles.sectionRowLeft}>
                    <View style={styles.sectionRowBtns}>
                      <TouchableOpacity
                        disabled={i === 0}
                        onPress={() => {
                          const arr = [...sectionOrder];
                          const idx = arr.indexOf(id);
                          if (idx > 0) { [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]]; setSectionOrder(arr); }
                        }}
                        style={[styles.orderBtn, i === 0 && styles.orderBtnDisabled]}
                      >
                        <Text style={styles.orderBtnText}>↑</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        disabled={i === 2}
                        onPress={() => {
                          const arr = [...sectionOrder];
                          const idx = arr.indexOf(id);
                          if (idx < arr.length - 1) { [arr[idx + 1], arr[idx]] = [arr[idx], arr[idx + 1]]; setSectionOrder(arr); }
                        }}
                        style={[styles.orderBtn, i === 2 && styles.orderBtnDisabled]}
                      >
                        <Text style={styles.orderBtnText}>↓</Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.sectionRowIcon}>{sec.icon}</Text>
                    <Text style={styles.sectionRowLabel}>{sec.label}</Text>
                  </View>
                  <Switch
                    value={enabled}
                    onValueChange={(v) => {
                      setSectionOrder((prev) =>
                        v ? [...prev, id] : prev.filter((x) => x !== id),
                      );
                    }}
                    trackColor={{ false: '#E5E7EB', true: colors.primary }}
                    thumbColor="#fff"
                  />
                </View>
              );
            })}
          </View>

          {/* 하이라이트 */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>어필 섹션</Text>
            <Text style={styles.sectionDesc}>인기 영상, 협업 성과 등 광고주에게 어필할 내용을 자유롭게 추가하세요</Text>

            {highlights.map((hs, si) => (
              <View key={hs.id} style={styles.hlSection}>
                <View style={styles.hlSectionHeader}>
                  <TextInput
                    style={styles.hlSectionTitle}
                    value={hs.title}
                    onChangeText={(t) => setHighlights((prev) => prev.map((s, i) => i === si ? { ...s, title: t } : s))}
                    placeholder="섹션 제목 (예: 🔥 인기 영상 TOP 3)"
                    placeholderTextColor="#C4C4C4"
                  />
                  <TouchableOpacity onPress={() => setHighlights((prev) => prev.filter((_, i) => i !== si))}>
                    <Text style={styles.hlDeleteBtn}>✕</Text>
                  </TouchableOpacity>
                </View>

                {hs.items.map((item, ii) => (
                  <View key={ii} style={styles.hlItem}>
                    {item.thumbnail && (
                      <Image source={{ uri: item.thumbnail }} style={styles.hlThumb} />
                    )}
                    <View style={{ flex: 1, gap: 4 }}>
                      {/* YouTube URL 입력 */}
                      <TextInput
                        style={[styles.hlItemInput, { color: '#5566DF' }]}
                        value={item.thumbnail ? `썸네일 등록됨 ✓` : ''}
                        placeholder="YouTube URL 붙여넣기 (선택)"
                        placeholderTextColor="#C4C4C4"
                        onChangeText={(t) => {
                          const thumb = extractYoutubeThumbnail(t);
                          if (thumb) {
                            setHighlights((prev) => prev.map((s, i) => i === si
                              ? { ...s, items: s.items.map((it, j) => j === ii ? { ...it, thumbnail: thumb } : it) }
                              : s));
                          }
                        }}
                        editable={!item.thumbnail}
                      />
                      {item.thumbnail && (
                        <TouchableOpacity onPress={() => setHighlights((prev) => prev.map((s, i) => i === si
                          ? { ...s, items: s.items.map((it, j) => j === ii ? { ...it, thumbnail: undefined } : it) }
                          : s))}>
                          <Text style={{ fontSize: 11, color: '#EF4444' }}>썸네일 제거</Text>
                        </TouchableOpacity>
                      )}
                      <TextInput
                        style={styles.hlItemInput}
                        value={item.label}
                        onChangeText={(t) => setHighlights((prev) => prev.map((s, i) => i === si
                          ? { ...s, items: s.items.map((it, j) => j === ii ? { ...it, label: t } : it) }
                          : s))}
                        placeholder="항목명 (예: 스킨케어 루틴 영상)"
                        placeholderTextColor="#C4C4C4"
                      />
                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        <TextInput
                          style={[styles.hlItemInput, { flex: 1 }]}
                          value={item.value}
                          onChangeText={(t) => setHighlights((prev) => prev.map((s, i) => i === si
                            ? { ...s, items: s.items.map((it, j) => j === ii ? { ...it, value: t } : it) }
                            : s))}
                          placeholder="수치 (예: 조회수 120만)"
                          placeholderTextColor="#C4C4C4"
                        />
                        <TextInput
                          style={[styles.hlItemInput, { flex: 1 }]}
                          value={item.note ?? ''}
                          onChangeText={(t) => setHighlights((prev) => prev.map((s, i) => i === si
                            ? { ...s, items: s.items.map((it, j) => j === ii ? { ...it, note: t || undefined } : it) }
                            : s))}
                          placeholder="부연설명 (선택)"
                          placeholderTextColor="#C4C4C4"
                        />
                      </View>
                    </View>
                    <TouchableOpacity
                      style={{ paddingLeft: 8 }}
                      onPress={() => setHighlights((prev) => prev.map((s, i) => i === si
                        ? { ...s, items: s.items.filter((_, j) => j !== ii) }
                        : s))}
                    >
                      <Text style={styles.hlDeleteBtn}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}

                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity
                    style={styles.hlAddItemBtn}
                    onPress={() => setHighlights((prev) => prev.map((s, i) => i === si
                      ? { ...s, items: [...s.items, { label: '', value: '', note: undefined }] }
                      : s))}
                  >
                    <Text style={styles.hlAddItemText}>+ 항목 추가</Text>
                  </TouchableOpacity>
                  {ENV.YOUTUBE_API_KEY ? (
                    <TouchableOpacity
                      style={[styles.hlAddItemBtn, { backgroundColor: '#FEE2E2' }]}
                      onPress={() => openYtPicker(si)}
                    >
                      <Text style={[styles.hlAddItemText, { color: '#EF4444' }]}>▶ YouTube 영상 추가</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            ))}

            <TouchableOpacity
              style={styles.hlAddSectionBtn}
              onPress={() => setHighlights((prev) => [
                ...prev,
                { id: String(Date.now()), title: '', items: [{ label: '', value: '' }] },
              ])}
            >
              <Text style={styles.hlAddSectionText}>+ 새 섹션 추가</Text>
            </TouchableOpacity>
          </View>

          {/* 인바운드 폼 */}
          <View style={styles.section}>
            <View style={styles.toggleRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sectionTitle}>협찬 문의 폼 활성화</Text>
                <Text style={styles.sectionDesc}>브랜드가 미디어 키트에서 직접 협찬을 제안할 수 있어요</Text>
              </View>
              <Switch
                value={isFormEnabled}
                onValueChange={setIsFormEnabled}
                trackColor={{ false: '#E5E7EB', true: colors.primary }}
                thumbColor="#fff"
              />
            </View>
            {isFormEnabled && (
              <View style={styles.formEnabledBadge}>
                <Text style={styles.formEnabledText}>✓ 문의 폼이 활성화된 상태입니다. 브랜드가 문의를 보낼 수 있어요.</Text>
              </View>
            )}
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#F5F3EF' },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14, gap: 12,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 3, elevation: 2,
  },
  backArrow: { fontSize: 18, color: '#374151' },
  title:    { fontSize: 17, fontWeight: '800', color: '#1A1A2E' },
  subtitle: { fontSize: 11, color: '#9CA3AF', marginTop: 1 },
  saveBtn: {
    backgroundColor: colors.primary, paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 10, minWidth: 52, alignItems: 'center',
  },
  saveBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  scroll: { paddingHorizontal: 20 },

  section: {
    backgroundColor: '#fff', borderRadius: 18, padding: 18, marginBottom: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#1A1A2E', marginBottom: 4 },
  sectionDesc:  { fontSize: 12, color: '#9CA3AF', lineHeight: 18 },
  aiBtn: {
    borderWidth: 1.5, borderColor: colors.primary, borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 6, minWidth: 44, alignItems: 'center',
  },
  aiBtnText: { fontSize: 12, fontWeight: '700', color: colors.primary },

  bioInput: {
    backgroundColor: '#F4F0FF', borderRadius: 12, borderWidth: 1.5, borderColor: '#E8E4FF',
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: '#1A1A2E', lineHeight: 22, minHeight: 100,
  },
  charCount: { fontSize: 11, color: '#C4C4C4', textAlign: 'right', marginTop: 6 },

  priceRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
  },
  priceLabel:     { fontSize: 13, color: '#374151', flex: 1 },
  priceInputWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  priceInput: {
    backgroundColor: '#F4F0FF', borderRadius: 8, borderWidth: 1.5, borderColor: '#E8E4FF',
    paddingHorizontal: 10, paddingVertical: 7,
    fontSize: 14, fontWeight: '600', color: '#1A1A2E',
    width: 110, textAlign: 'right',
  },
  priceUnit: { fontSize: 13, color: '#9CA3AF' },

  brandInputRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  brandInput: {
    flex: 1, backgroundColor: '#F4F0FF', borderRadius: 10, borderWidth: 1.5, borderColor: '#E8E4FF',
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, color: '#1A1A2E',
  },
  brandAddBtn: {
    backgroundColor: colors.primary, borderRadius: 10, paddingHorizontal: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  brandAddBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  tagsWrap:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#F0EFFE', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  tagText:   { fontSize: 13, fontWeight: '600', color: colors.primary },
  tagRemove: { fontSize: 11, color: '#9CA3AF', fontWeight: '700' },
  emptyBrands: { fontSize: 13, color: '#C4C4C4', textAlign: 'center', paddingVertical: 8 },

  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  formEnabledBadge: {
    marginTop: 12, backgroundColor: '#D1FAE5', borderRadius: 10, padding: 10,
  },
  formEnabledText: { fontSize: 12, color: '#059669', fontWeight: '500', lineHeight: 18 },

  // 테마
  themeRow:         { flexDirection: 'row', gap: 12, marginTop: 14, marginBottom: 8 },
  themeCircle:      { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  themeCircleActive:{ borderWidth: 3, borderColor: '#1A1A2E' },
  themeCheck:       { fontSize: 14, color: '#fff', fontWeight: '800' },
  themeLabel:       { fontSize: 12, color: '#9CA3AF', textAlign: 'center' },

  // 뱃지
  badgeCount:         { backgroundColor: '#F3F4F6', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  badgeCountFull:     { backgroundColor: '#F0EFFE' },
  badgeCountText:     { fontSize: 12, fontWeight: '700', color: '#9CA3AF' },
  badgeCountTextFull: { color: colors.primary },
  badgeCatBlock:      { marginTop: 14 },
  badgeCatLabel:      { fontSize: 11, fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  badgeGrid:          { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  badgeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#F3F4F6', borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 6,
    borderWidth: 1.5, borderColor: 'transparent',
  },
  badgeChipSelected:  { backgroundColor: '#F0EFFE', borderColor: colors.primary },
  badgeChipDisabled:  { opacity: 0.35 },
  badgeChipVerified:  { backgroundColor: '#ECFDF5', borderColor: '#10B981' },
  badgeEmoji:         { fontSize: 14 },
  badgeChipText:      { fontSize: 12, fontWeight: '600', color: '#374151' },
  badgeChipTextSelected: { color: colors.primary },
  badgeChipTextDisabled: { color: '#C4C4C4' },
  badgeChipTextVerified: { color: '#059669' },
  badgeVerifiedMark:  { fontSize: 11, fontWeight: '800', color: '#10B981', marginLeft: 2 },

  // 섹션 순서
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  sectionRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  sectionRowBtns: { flexDirection: 'column', gap: 2 },
  orderBtn: { width: 20, height: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F3F4F6', borderRadius: 4 },
  orderBtnDisabled: { opacity: 0.25 },
  orderBtnText: { fontSize: 10, fontWeight: '700', color: '#374151' },
  sectionRowIcon: { fontSize: 16 },
  sectionRowLabel: { fontSize: 14, fontWeight: '500', color: '#1A1A2E', flex: 1 },
  hlSection: { backgroundColor: '#F9FAFB', borderRadius: 12, padding: 12, marginBottom: 10, gap: 8 },
  hlSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  hlSectionTitle: { flex: 1, fontSize: 14, fontWeight: '700', color: '#1A1A2E', padding: 0 },
  hlItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  hlThumb: { width: 80, height: 56, borderRadius: 8, backgroundColor: '#E5E7EB' },
  hlItemInput: { fontSize: 13, color: '#374151', backgroundColor: '#fff', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, borderWidth: 1, borderColor: '#E5E7EB' },
  hlDeleteBtn: { fontSize: 14, color: '#9CA3AF', paddingTop: 2 },
  hlAddItemBtn: { alignSelf: 'flex-start', paddingVertical: 6, paddingHorizontal: 10, backgroundColor: '#EEF2FF', borderRadius: 8 },
  hlAddItemText: { fontSize: 13, fontWeight: '600', color: '#5566DF' },
  hlAddSectionBtn: { borderWidth: 1.5, borderColor: '#5566DF', borderStyle: 'dashed', borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 4 },
  hlAddSectionText: { fontSize: 14, fontWeight: '700', color: '#5566DF' },
  closeBtn: { fontSize: 18, color: '#9CA3AF', paddingHorizontal: 4 },
  ytOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  ytSheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%' },
  ytHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  ytTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A2E' },
  ytItem: { flexDirection: 'row', gap: 12, alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 12, padding: 10 },
  ytThumb: { width: 100, height: 70, borderRadius: 8, backgroundColor: '#E5E7EB' },
  ytItemTitle: { fontSize: 13, fontWeight: '600', color: '#1A1A2E', lineHeight: 18 },
  ytItemViews: { fontSize: 12, color: '#6B7280' },
});
