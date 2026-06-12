import { Text } from '@/components/Text';
import React, { useEffect, useState } from 'react';
import {
  View, ScrollView, TouchableOpacity,
  StyleSheet, Linking, Modal,
} from 'react-native';
import { SortableList } from './SortableList';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth';
import { useSocialChannels } from '../../hooks/useSocialChannels';
import { useHomeData } from '../../hooks/useHomeData';
import { theme } from '../../constants/theme';
import { supabase } from '../../api/supabase';

const { colors, space, radius, shadows, typography } = theme;

const PLATFORM_CFG: Record<string, { icon: string; color: string }> = {
  youtube:   { icon: '▶', color: '#FF0000' },
  instagram: { icon: '◎', color: '#E1306C' },
  tiktok:    { icon: '♪', color: '#010101' },
};

const BRAND_COLORS = ['#E8472A', '#3D5AFE', '#1D8348', '#C48A40', '#8B5CF6'];
function brandColor(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = s.charCodeAt(i) + ((h << 5) - h);
  return BRAND_COLORS[Math.abs(h) % BRAND_COLORS.length];
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionTitle({ text }: { text: string }) {
  return <Text style={sec.title}>{text}</Text>;
}
const sec = StyleSheet.create({
  title: { ...typography.sectionTitle, color: colors.text.primary, marginBottom: space.md },
});

function Divider() {
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.border.faint }} />;
}

function BarRow({ label, ratio }: { label: string; ratio: number }) {
  return (
    <View style={bar.row}>
      <Text style={bar.label}>{label}</Text>
      <View style={bar.track}>
        <View style={[bar.fill, { width: `${Math.round(ratio * 100)}%` as any }]} />
      </View>
    </View>
  );
}
const bar = StyleSheet.create({
  row:   { flexDirection: 'row', alignItems: 'center', gap: space.md, marginBottom: space.sm },
  label: { ...typography.caption, color: colors.text.secondary, width: 80 },
  track: { flex: 1, height: 4, backgroundColor: colors.border.faint, borderRadius: 2 },
  fill:  { height: 4, backgroundColor: colors.ai.from, borderRadius: 2 },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function StudioScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { channels } = useSocialChannels(user?.id);
  const { data } = useHomeData(user?.id);

  const [dbName, setDbName]           = useState<string | null>(null);
  const [showFeaturedEdit, setShowFeaturedEdit] = useState(false);
  const [featuredOrder, setFeaturedOrder] = useState<string[]>([]);
  useEffect(() => {
    if (!user?.id || user?.user_metadata?.full_name) return;
    supabase.from('users').select('name').eq('id', user.id).single()
      .then(({ data }) => { if (data?.name) setDbName(data.name); });
  }, [user?.id]);

  const userName  = user?.user_metadata?.full_name ?? dbName ?? '크리에이터';
  const niche     = user?.user_metadata?.niche ?? '뷰티 · 라이프스타일 크리에이터';
  const initial   = userName.charAt(0).toUpperCase();
  const email     = user?.email ?? '';

  const settledDeals  = data.activeDeals.filter((d) => d.statusLabel === '정산완료');
  const allDeals      = data.activeDeals;

  // Stats: use channel subscriber info where available; fall back to zero
  const totalFollowers = channels.reduce((sum, ch) => {
    return sum + (ch.subscriber_count ?? 0);
  }, 0);

  function formatStat(n: number): string {
    if (n >= 10_000) return `${(n / 10_000).toFixed(0)}만`;
    if (n >= 1_000)  return `${(n / 1_000).toFixed(0)}K`;
    return String(n);
  }

  const COLLAB_COUNT = allDeals.length;

  // featuredOrder가 비어있으면 전체 딜 순서 그대로 사용
  const orderedIds = featuredOrder.length > 0 ? featuredOrder : allDeals.map((d) => d.id);
  const dealMap = Object.fromEntries(allDeals.map((d) => [d.id, d]));
  const featuredDeals = orderedIds.map((id) => dealMap[id]).filter(Boolean);

  function toggleFeatured(id: string) {
    setFeaturedOrder((prev) => {
      const base = prev.length > 0 ? prev : allDeals.map((d) => d.id);
      return base.includes(id) ? base.filter((x) => x !== id) : [...base, id];
    });
  }

  function handleReorder(fromIdx: number, toIdx: number) {
    setFeaturedOrder((prev) => {
      const base = prev.length > 0 ? [...prev] : allDeals.map((d) => d.id);
      const [removed] = base.splice(fromIdx, 1);
      base.splice(toIdx, 0, removed);
      return base;
    });
  }

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      {/* 헤더 */}
      <View style={s.header}>
        <View style={{ width: 28 }} />
        <Text style={s.title}>스튜디오</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* 프로필 섹션 */}
        <View style={s.profileRow}>
          <View style={s.profileAvatar}>
            <Text style={s.profileAvatarText}>{initial}</Text>
          </View>
          <View style={s.profileInfo}>
            <Text style={s.profileName}>{userName}</Text>
            <Text style={s.profileNiche}>{niche}</Text>
            <View style={s.platformDots}>
              {channels.map((ch) => {
                const cfg = PLATFORM_CFG[ch.platform];
                return cfg ? (
                  <View key={ch.platform} style={s.platformDot}>
                    <View style={[s.platformDotCircle, { backgroundColor: cfg.color }]} />
                    <Text style={s.platformDotLabel}>{ch.platform.charAt(0).toUpperCase() + ch.platform.slice(1)}</Text>
                  </View>
                ) : null;
              })}
            </View>
          </View>
        </View>

        {/* 대표 작품 편집 모달 */}
        <Modal visible={showFeaturedEdit} transparent animationType="slide" onRequestClose={() => setShowFeaturedEdit(false)}>
          <View style={fe.overlay}>
            <TouchableOpacity style={fe.backdrop} onPress={() => setShowFeaturedEdit(false)} activeOpacity={1} />
            <View style={fe.sheet}>
              <View style={fe.handle} />
              <View style={fe.header}>
                <Text style={fe.title}>대표 작품 편집</Text>
                <TouchableOpacity onPress={() => setShowFeaturedEdit(false)}>
                  <Text style={fe.close}>✕</Text>
                </TouchableOpacity>
              </View>
              <Text style={fe.desc}>길게 눌러 드래그하거나 체크로 표시 여부를 선택하세요</Text>
              {orderedIds.length === 0 ? (
                <Text style={fe.empty}>등록된 협업이 없어요</Text>
              ) : (
                <ScrollView showsVerticalScrollIndicator={false} scrollEnabled={false}>
                  <SortableList
                    ids={orderedIds}
                    dealMap={dealMap}
                    featuredOrder={featuredOrder}
                    onReorder={handleReorder}
                    onToggle={toggleFeatured}
                  />
                  <View style={{ height: 40 }} />
                </ScrollView>
              )}
            </View>
          </View>
        </Modal>

        {/* Featured Work */}
        <View style={s.sectionRow}>
          <SectionTitle text="대표 작품" />
          <TouchableOpacity activeOpacity={0.7} onPress={() => setShowFeaturedEdit(true)}>
            <Text style={s.editBtn}>편집</Text>
          </TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.featuredScroll} contentContainerStyle={s.featuredContent}>
          {featuredDeals.map((deal) => (
            <View key={deal.id} style={s.featuredCard}>
              <View style={s.featuredThumb} />
              <View style={s.featuredChip}>
                <Text style={s.featuredChipText}>협업</Text>
              </View>
              <Text style={s.featuredTitle} numberOfLines={2}>{deal.brand}</Text>
              <Text style={s.featuredMeta}>{deal.statusLabel}</Text>
              {deal.amount > 0 && (
                <Text style={s.featuredMetric}>₩{(deal.amount / 10000).toFixed(0)}만</Text>
              )}
            </View>
          ))}
          {featuredDeals.length === 0 && (
            <View style={[s.featuredCard, s.featuredEmpty]}>
              <Text style={s.featuredEmptyText}>협업 기록이 없어요</Text>
            </View>
          )}
        </ScrollView>

        {/* Reach & Presence */}
        <SectionTitle text="Reach & Presence" />
        <View style={s.statsRow}>
          <View style={s.statBox}>
            <Text style={s.statNum}>{totalFollowers > 0 ? formatStat(totalFollowers) : '—'}</Text>
            <Text style={s.statLabel}>구독자 팔로워</Text>
          </View>
          <View style={[s.statBox, s.statBoxMid]}>
            <Text style={s.statNum}>—</Text>
            <Text style={s.statLabel}>평균 조회수</Text>
          </View>
          <View style={s.statBox}>
            <Text style={s.statNum}>{COLLAB_COUNT > 0 ? COLLAB_COUNT : '—'}</Text>
            <Text style={s.statLabel}>협업 완료</Text>
          </View>
        </View>
        {/* Creator Positioning — AI 미구현 상태 */}
        <SectionTitle text="Creator Positioning" />
        <View style={s.aiPending}>
          <Text style={s.aiPendingIcon}>✦</Text>
          <Text style={s.aiPendingTitle}>분석 준비 중</Text>
          <Text style={s.aiPendingDesc}>
            채널 콘텐츠가 충분히 쌓이면{'\n'}자동으로 크리에이터 포지셔닝을 분석합니다
          </Text>
          <View style={s.aiPendingBadge}>
            <Text style={s.aiPendingBadgeText}>₩9,900 플랜에서 이용 가능</Text>
          </View>
        </View>

        {/* 함께한 브랜드 */}
        {allDeals.length > 0 && (
          <>
            <SectionTitle text="함께한 브랜드" />
            <View style={s.brandCard}>
              {allDeals.slice(0, 5).map((deal, i) => (
                <React.Fragment key={deal.id}>
                  {i > 0 && <Divider />}
                  <View style={s.brandRow}>
                    <View style={[s.brandAvatar, { backgroundColor: brandColor(deal.brand) }]}>
                      <Text style={s.brandAvatarText}>{deal.brand.charAt(0)}</Text>
                    </View>
                    <View style={s.brandInfo}>
                      <Text style={s.brandName}>{deal.brand}</Text>
                      <Text style={s.brandSub}>{deal.statusLabel}</Text>
                    </View>
                    <Text style={[s.brandStatus, { color: deal.statusColor }]}>{deal.statusLabel}</Text>
                  </View>
                </React.Fragment>
              ))}
            </View>
          </>
        )}

        {/* 함께 일해요 */}
        <SectionTitle text="함께 일해요" />
        <View style={s.contactCard}>
          <View style={s.contactRow}>
            <View style={s.contactBody}>
              <Text style={s.contactTitle}>협업 제안하기</Text>
              <Text style={s.contactSub}>응답 속도 24시간 내</Text>
            </View>
            <View style={s.contactIcon}>
              <Text style={{ fontSize: 18, color: '#fff' }}>✈</Text>
            </View>
          </View>
          {!!email && (
            <TouchableOpacity
              style={s.contactDetail}
              onPress={() => Linking.openURL(`mailto:${email}`)}
              activeOpacity={0.7}
            >
              <Text style={s.contactDetailLabel}>이메일</Text>
              <Text style={s.contactDetailValue}>{email}</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={{ height: 16, alignItems: 'center', paddingBottom: space.sm }}>
          <Text style={s.footer}>MANYBE STUDIO</Text>
        </View>

        <View style={{ height: 80 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root:  { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: space.screen,
    paddingVertical: space.lg,
  },
  title:     { ...typography.navTitle, color: colors.text.primary },
  shareIcon: { fontSize: 17, color: colors.text.secondary },
  scroll:    { paddingHorizontal: space.screen },

  // Profile
  profileRow:   { flexDirection: 'row', gap: space.lg, marginBottom: space.xxl, alignItems: 'flex-start' },
  profileAvatar:{ width: 64, height: 64, borderRadius: radius.md, backgroundColor: colors.border.medium, alignItems: 'center', justifyContent: 'center' },
  profileAvatarText: { fontSize: 24, fontWeight: '700', color: '#fff' },
  profileInfo:  { flex: 1, paddingTop: 4 },
  profileName:  { ...typography.heading, color: colors.text.primary },
  profileNiche: { ...typography.caption, color: colors.text.tertiary, marginTop: 2, marginBottom: space.sm },
  platformDots: { flexDirection: 'row', gap: space.sm, flexWrap: 'wrap' },
  platformDot:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
  platformDotCircle: { width: 6, height: 6, borderRadius: 3 },
  platformDotLabel:  { ...typography.micro, color: colors.text.tertiary },

  // Featured Work
  sectionRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: space.md },
  editBtn:         { ...typography.caption, color: colors.text.tertiary },
  featuredScroll:  { marginHorizontal: -space.screen, marginBottom: space.xl },
  featuredContent: { paddingHorizontal: space.screen, gap: space.md },
  featuredCard: {
    width: 140,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.faint,
    padding: space.md,
    ...shadows.sm,
  },
  featuredThumb:   { height: 80, borderRadius: radius.md, backgroundColor: colors.brand.soft, marginBottom: space.sm },
  featuredChip:    { alignSelf: 'flex-start', backgroundColor: colors.brand.soft, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, marginBottom: space.xs },
  featuredChipText:{ ...typography.micro, color: colors.brand.default },
  featuredTitle:   { ...typography.caption, color: colors.text.primary, fontWeight: '600', marginBottom: 2 },
  featuredMeta:    { ...typography.micro, color: colors.text.tertiary },
  featuredMetric:  { ...typography.micro, color: colors.brand.default, fontWeight: '700', marginTop: 2 },
  featuredEmpty:   { alignItems: 'center', justifyContent: 'center' },
  featuredEmptyText: { ...typography.caption, color: colors.text.muted },

  // Reach & Presence
  statsRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.faint,
    marginBottom: space.md,
    ...shadows.sm,
  },
  statBox:    { flex: 1, alignItems: 'center', paddingVertical: space.lg },
  statBoxMid: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: colors.border.faint },
  statNum:    { ...typography.monoLg, color: colors.text.primary },
  statLabel:  { ...typography.micro, color: colors.text.tertiary, marginTop: 2 },
  // AI Pending state
  aiPending: {
    backgroundColor: colors.ai.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.ai.muted,
    padding: space.xl,
    marginBottom: space.xl,
    alignItems: 'center',
    gap: space.sm,
  },
  aiPendingIcon:  { fontSize: 22, color: colors.ai.from },
  aiPendingTitle: { ...typography.bodyStrong, color: colors.ai.text },
  aiPendingDesc:  { ...typography.caption, color: colors.text.secondary, textAlign: 'center', lineHeight: 18 },
  aiPendingBadge: { backgroundColor: colors.ai.muted, borderRadius: 20, paddingHorizontal: space.md, paddingVertical: space.xs },
  aiPendingBadgeText: { ...typography.micro, color: colors.ai.text, fontWeight: '600' },

  // 함께한 브랜드
  brandCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.faint,
    marginBottom: space.xl,
    overflow: 'hidden',
    ...shadows.sm,
  },
  brandRow:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg, paddingVertical: space.md, gap: space.md },
  brandAvatar:    { width: 32, height: 32, borderRadius: radius.sm + 2, alignItems: 'center', justifyContent: 'center' },
  brandAvatarText:{ fontSize: 12, fontWeight: '700', color: '#fff' },
  brandInfo:      { flex: 1 },
  brandName:      { ...typography.caption, color: colors.text.primary, fontWeight: '600' },
  brandSub:       { ...typography.micro, color: colors.text.tertiary },
  brandStatus:    { ...typography.micro, fontWeight: '600' },

  // 함께 일해요
  contactCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border.faint,
    padding: space.lg,
    marginBottom: space.lg,
    ...shadows.sm,
  },
  contactRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: space.md },
  contactBody:   { flex: 1 },
  contactTitle:  { ...typography.bodyStrong, color: colors.text.primary },
  contactSub:    { ...typography.caption, color: colors.text.tertiary, marginTop: 2 },
  contactIcon:   { width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.ai.from, alignItems: 'center', justifyContent: 'center' },
  contactDetail: { paddingVertical: space.xs + 2 },
  contactDetailLabel: { ...typography.micro, color: colors.text.tertiary },
  contactDetailValue: { ...typography.caption, color: colors.text.secondary, fontWeight: '500', marginTop: 1 },

  footer: { ...typography.micro, color: colors.text.muted, letterSpacing: 1.5, textTransform: 'uppercase' },
});

const fe = StyleSheet.create({
  overlay:  { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet:    { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, maxHeight: '75%' },
  handle:   { width: 40, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB', alignSelf: 'center', marginTop: 12, marginBottom: 16 },
  header:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: space.xs },
  title:    { fontSize: 17, fontWeight: '800', color: colors.text.primary },
  close:    { fontSize: 18, color: '#9CA3AF', padding: 4 },
  desc:     { ...typography.caption, color: colors.text.tertiary, marginBottom: space.md },
  empty:    { ...typography.body, color: colors.text.muted, textAlign: 'center', paddingVertical: 40 },
  row:      { flexDirection: 'row', alignItems: 'center', paddingVertical: space.md, gap: space.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#F3F4F6' },
  check:    { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: colors.border.default, alignItems: 'center', justifyContent: 'center' },
  checkOn:  { backgroundColor: colors.brand.default, borderColor: colors.brand.default },
  checkMark:{ fontSize: 13, color: '#fff', fontWeight: '700' },
  rowInfo:  { flex: 1 },
  rowBrand: { ...typography.bodyStrong, color: colors.text.primary },
  rowStatus:{ ...typography.caption, color: colors.text.tertiary, marginTop: 1 },
});
