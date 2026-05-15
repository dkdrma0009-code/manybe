import React, { useState } from 'react';
import {
  Modal, View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Linking, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { supabase } from '../../api/supabase';
import { makeLogger } from '../../utils/logger';

const log = makeLogger('InquiryConversion');
import { colors } from '../../constants/colors';
import { BrandHistoryCard } from '../../components/BrandHistoryCard';

export interface InquiryItem {
  id: string;
  brand_name: string;
  contact_email: string;
  contact_phone?: string;
  budget?: number;
  proposal?: string;
  deadline?: string;
  created_at: string;
  is_read: boolean;
  media_kit_id: string;
  deal_id?: string | null;
}

interface Props {
  visible: boolean;
  inquiry: InquiryItem;
  userId: string;
  onClose: () => void;
  onConverted: (dealId: string) => void;
  onNavigateBrand?: (brand: string) => void;
}

export default function InquiryDetailModal({ visible, inquiry, userId, onClose, onConverted, onNavigateBrand }: Props) {
  const [converting, setConverting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [converted, setConverted] = useState(false);
  const [convertError, setConvertError] = useState('');

  const isAlreadyConverted = !!inquiry.deal_id;

  const formattedDate = new Date(inquiry.created_at).toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  async function handleConvertConfirm() {
    setConverting(true);
    setConvertError('');

    // Always resolve auth.uid() from the live session — never trust a prop/closure
    // for the value that must match the RLS policy's auth.uid() check.
    const { data: { session } } = await supabase.auth.getSession();
    const authUid = session?.user?.id;

    log.debug('session uid:', authUid);
    log.debug('prop userId:', userId);

    if (!authUid) {
      setConverting(false);
      setConvertError('로그인이 필요합니다. 다시 로그인해주세요.');
      return;
    }

    if (authUid !== userId) {
      // Stale prop — happens when session was refreshed after the screen mounted.
      // Use authUid (the value auth.uid() will return inside Postgres) instead.
      log.warn('userId prop is stale — using session uid instead');
    }

    // Sanitize end_date: Supabase 'date' column expects YYYY-MM-DD
    const rawDeadline = inquiry.deadline ?? null;
    const endDate = rawDeadline && /^\d{4}-\d{2}-\d{2}$/.test(rawDeadline.trim())
      ? rawDeadline.trim()
      : null;

    const dealPayload: Record<string, unknown> = {
      user_id: authUid,          // must equal auth.uid() for the RLS WITH CHECK to pass
      brand: inquiry.brand_name,
      title: inquiry.proposal?.substring(0, 60).trim() || '인바운드 협찬 문의',
      amount: inquiry.budget ?? 0,
      status: 'inquiry',
      source: 'media_kit',
      end_date: endDate,
    };

    log.debug('insert payload:', JSON.stringify(dealPayload));
    log.debug('inquiry id:', inquiry.id);

    const { error: insertError, data: insertedDeal } = await supabase
      .from('deals')
      .insert(dealPayload)
      .select('id')
      .single();

    if (insertError) {
      log.error('deal insert error:', {
        message: insertError.message,
        code: insertError.code,
        details: insertError.details,
        hint: insertError.hint,
      });
      setConverting(false);
      setConvertError(friendlyError(insertError));
      return;
    }

    if (!insertedDeal?.id) {
      log.error('insert returned no id — possible RLS policy block');
      setConverting(false);
      setConvertError('협찬이 생성되지 않았어요. RLS 정책을 확인해주세요.');
      return;
    }

    log.debug('deal created:', insertedDeal.id);

    // Link inquiry → deal (requires migration 003)
    const updatePayload = { deal_id: insertedDeal.id };
    log.debug('inquiry update payload:', JSON.stringify(updatePayload), 'for inquiry:', inquiry.id, 'auth uid:', authUid);

    const { error: updateError } = await supabase
      .from('media_kit_inquiries')
      .update(updatePayload)
      .eq('id', inquiry.id);

    if (updateError) {
      // Non-fatal: deal was created, just the link failed
      log.warn('inquiry link update error:', {
        message: updateError.message,
        code: updateError.code,
        details: updateError.details,
        hint: updateError.hint,
      });
      // Still proceed — the deal exists, the inquiry just won't show "전환됨" until migration 003 is run
    } else {
      log.debug('inquiry linked to deal successfully');
    }

    log.debug('success — inquiryId:', inquiry.id, 'dealId:', insertedDeal.id, 'status: inquiry');

    setConverting(false);
    setConverted(true);
    setTimeout(() => { onConverted(insertedDeal.id); onClose(); }, 1500);
  }

  function friendlyError(err: { message: string; code?: string; hint?: string }): string {
    const msg = err.message ?? '';
    if (err.code === '42703') return `컬럼이 없어요: ${msg} — migration 002/003을 실행해주세요`;
    if (err.code === '23503') return '참조 오류: 연결된 테이블에 데이터가 없어요';
    if (err.code === '23505') return '이미 동일한 협찬이 존재해요';
    if (err.code === '42501' || msg.includes('policy')) return 'RLS 권한 오류 — 로그인 상태를 확인해주세요';
    if (msg.includes('invalid input')) return `값 형식 오류: ${msg}`;
    return msg || '알 수 없는 오류가 발생했습니다';
  }

  function handleEmailContact() {
    const subject = encodeURIComponent('[매니비] 협찬 문의 답변');
    const body = encodeURIComponent(`안녕하세요, ${inquiry.brand_name} 담당자님.\n\n`);
    Linking.openURL(`mailto:${inquiry.contact_email}?subject=${subject}&body=${body}`);
  }

  function handlePhoneContact() {
    if (!inquiry.contact_phone) return;
    Linking.openURL(`tel:${inquiry.contact_phone}`);
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.sheet}>
          <View style={styles.handle} />

          {/* 헤더 */}
          <View style={styles.header}>
            <View style={styles.brandRow}>
              <View style={[styles.avatar, isAlreadyConverted && styles.avatarConverted]}>
                <Text style={styles.avatarText}>{inquiry.brand_name.charAt(0)}</Text>
              </View>
              <View>
                <View style={styles.brandTitleRow}>
                  <Text style={styles.brandName}>{inquiry.brand_name}</Text>
                  {isAlreadyConverted && (
                    <View style={styles.convertedBadge}>
                      <Text style={styles.convertedBadgeText}>전환됨</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.dateText}>{formattedDate}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.body}>
            <BrandHistoryCard
              userId={userId}
              brand={inquiry.brand_name}
              onViewAll={onNavigateBrand ? () => { onClose(); onNavigateBrand(inquiry.brand_name); } : undefined}
            />
            {/* 예산 */}
            {inquiry.budget != null && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>💰 예산</Text>
                <Text style={styles.infoValue}>{inquiry.budget.toLocaleString('ko-KR')}원</Text>
              </View>
            )}

            {/* 마감일 */}
            {inquiry.deadline && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>📅 희망 마감</Text>
                <Text style={styles.infoValue}>{inquiry.deadline}</Text>
              </View>
            )}

            {/* 연락처 */}
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>📧 이메일</Text>
              <TouchableOpacity onPress={handleEmailContact}>
                <Text style={[styles.infoValue, styles.link]}>{inquiry.contact_email}</Text>
              </TouchableOpacity>
            </View>

            {inquiry.contact_phone && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>📞 전화</Text>
                <TouchableOpacity onPress={handlePhoneContact}>
                  <Text style={[styles.infoValue, styles.link]}>{inquiry.contact_phone}</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* 제안 내용 */}
            {inquiry.proposal && (
              <View style={styles.proposalBox}>
                <Text style={styles.proposalLabel}>제안 내용</Text>
                <Text style={styles.proposalText}>{inquiry.proposal}</Text>
              </View>
            )}

            <View style={{ height: 16 }} />
          </ScrollView>

          {/* 액션 버튼 */}
          {isAlreadyConverted ? (
            <View style={styles.alreadyConverted}>
              <Text style={styles.alreadyConvertedIcon}>✓</Text>
              <Text style={styles.alreadyConvertedText}>이미 협찬 파이프라인에 추가됐어요</Text>
            </View>
          ) : confirming ? (
            <View style={styles.confirmBox}>
              <Text style={styles.confirmTitle}>협찬으로 전환할까요?</Text>
              <Text style={styles.confirmSub}>
                {inquiry.brand_name} · 문의 단계로 추가해요
              </Text>
              {convertError ? <Text style={styles.convertErr}>{convertError}</Text> : null}
              <View style={styles.confirmBtns}>
                <TouchableOpacity
                  style={styles.confirmCancelBtn}
                  onPress={() => { setConfirming(false); setConvertError(''); }}
                >
                  <Text style={styles.confirmCancelText}>취소</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.confirmAcceptBtn, converting && { opacity: 0.6 }]}
                  onPress={handleConvertConfirm}
                  disabled={converting}
                  activeOpacity={0.85}
                >
                  {converting
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={styles.confirmAcceptText}>파이프라인으로 전환</Text>
                  }
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.actions}>
              <TouchableOpacity style={styles.emailBtn} onPress={handleEmailContact} activeOpacity={0.85}>
                <Text style={styles.emailBtnText}>📧 이메일로 연락</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.convertBtn}
                onPress={() => setConfirming(true)}
                activeOpacity={0.85}
              >
                <Text style={styles.convertBtnText}>협찬으로 전환</Text>
              </TouchableOpacity>
            </View>
          )}
          <View style={{ height: 32 }} />

          {converted && (
            <View style={styles.successOverlay}>
              <View style={styles.successBadge}>
                <Text style={styles.successIcon}>🤝</Text>
              </View>
              <Text style={styles.successTitle}>파이프라인에 추가됐어요</Text>
              <Text style={styles.successSub}>협찬 탭 › 문의에서 확인하세요</Text>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, maxHeight: '85%' },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB', alignSelf: 'center', marginTop: 12, marginBottom: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarConverted: { backgroundColor: '#2E8C5D' },
  avatarText: { fontSize: 20, fontWeight: '800', color: '#fff' },
  brandTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  brandName: { fontSize: 18, fontWeight: '800', color: '#1A1A2E' },
  convertedBadge: { backgroundColor: '#D1FAE5', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  convertedBadgeText: { fontSize: 11, fontWeight: '700', color: '#059669' },
  dateText: { fontSize: 12, color: '#9CA3AF' },
  closeBtn: { fontSize: 18, color: '#9CA3AF', padding: 4 },
  body: { flex: 0 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  infoLabel: { fontSize: 13, color: '#6B7280' },
  infoValue: { fontSize: 14, fontWeight: '600', color: '#1A1A2E' },
  link: { color: colors.primary, textDecorationLine: 'underline' },
  proposalBox: { marginTop: 16, backgroundColor: '#F4F0FF', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#E8E4FF' },
  proposalLabel: { fontSize: 11, fontWeight: '700', color: '#7C6FCD', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  proposalText: { fontSize: 14, color: '#374151', lineHeight: 22 },

  alreadyConverted: {
    marginTop: 16, flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#F0FDF4', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: '#BBF7D0',
  },
  alreadyConvertedIcon: { fontSize: 16, color: '#059669', fontWeight: '800' },
  alreadyConvertedText: { fontSize: 13, fontWeight: '600', color: '#059669', flex: 1 },

  actions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  emailBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: '#F0EFFE', alignItems: 'center' },
  emailBtnText: { fontSize: 14, fontWeight: '700', color: colors.primary },
  convertBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center' },
  convertBtnText: { fontSize: 14, fontWeight: '800', color: '#fff' },

  confirmBox: {
    marginTop: 16, backgroundColor: '#F4F0FF', borderRadius: 16,
    borderWidth: 1.5, borderColor: '#E8E4FF', padding: 18, gap: 4,
  },
  confirmTitle:   { fontSize: 15, fontWeight: '800', color: '#1A1A2E' },
  confirmSub:     { fontSize: 13, color: '#7C6FCD', marginBottom: 12 },
  convertErr:     { fontSize: 12, color: '#DC2626', marginBottom: 8 },
  confirmBtns:    { flexDirection: 'row', gap: 10 },
  confirmCancelBtn:  { flex: 1, paddingVertical: 13, borderRadius: 12, backgroundColor: '#F3F4F6', alignItems: 'center' },
  confirmCancelText: { fontSize: 14, fontWeight: '700', color: '#6B7280' },
  confirmAcceptBtn:  { flex: 2, paddingVertical: 13, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center' },
  confirmAcceptText: { fontSize: 14, fontWeight: '800', color: '#fff' },

  successOverlay: {
    position: 'absolute', left: 0, right: 0, top: 0, bottom: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    alignItems: 'center', justifyContent: 'center', gap: 12,
    paddingHorizontal: 32,
  },
  successBadge: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#EDE9FE', alignItems: 'center', justifyContent: 'center' },
  successIcon:  { fontSize: 36 },
  successTitle: { fontSize: 22, fontWeight: '800', color: '#1A1A2E', textAlign: 'center' },
  successSub:   { fontSize: 14, color: '#7C6FCD', textAlign: 'center' },
});
