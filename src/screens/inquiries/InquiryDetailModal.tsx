import React, { useState } from 'react';
import {
  Modal, View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Linking, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { supabase } from '../../api/supabase';
import { colors } from '../../constants/colors';

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
  onConverted: () => void;
}

export default function InquiryDetailModal({ visible, inquiry, userId, onClose, onConverted }: Props) {
  const [converting, setConverting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [converted, setConverted]   = useState(false);
  const [convertError, setConvertError] = useState('');

  const formattedDate = new Date(inquiry.created_at).toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  async function handleConvertConfirm() {
    setConverting(true);
    setConvertError('');
    let error: any = null;

    if (inquiry.deal_id) {
      ({ error } = await supabase
        .from('deals')
        .update({ status: 'reviewing' })
        .eq('id', inquiry.deal_id));
    } else {
      const { error: insertError, data } = await supabase
        .from('deals')
        .insert({
          user_id: userId,
          brand: inquiry.brand_name,
          title: inquiry.proposal?.substring(0, 60) ?? '인바운드 협찬 문의',
          amount: inquiry.budget ?? 0,
          status: 'reviewing',
          source: 'media_kit',
          end_date: inquiry.deadline ?? null,
        })
        .select('id')
        .single();
      error = insertError;
      if (data?.id) {
        await supabase.from('media_kit_inquiries').update({ deal_id: data.id }).eq('id', inquiry.id);
      }
    }

    setConverting(false);
    if (error) { setConvertError('처리 중 오류가 발생했습니다'); return; }
    setConverted(true);
    setTimeout(() => { onConverted(); onClose(); }, 1500);
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
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{inquiry.brand_name.charAt(0)}</Text>
              </View>
              <View>
                <Text style={styles.brandName}>{inquiry.brand_name}</Text>
                <Text style={styles.dateText}>{formattedDate}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.body}>
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
          {confirming ? (
            <View style={styles.confirmBox}>
              <Text style={styles.confirmTitle}>협찬 파이프라인으로 이동할까요?</Text>
              <Text style={styles.confirmSub}>
                {inquiry.brand_name} · 검토중 단계로 이동해요
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
                    : <Text style={styles.confirmAcceptText}>파이프라인으로 이동</Text>
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
                <Text style={styles.convertBtnText}>
                  {inquiry.deal_id ? '검토중으로 이동' : '협찬으로 수락하기'}
                </Text>
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
              <Text style={styles.successSub}>협찬 탭 › 검토중에서 확인하세요</Text>
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
  avatarText: { fontSize: 20, fontWeight: '800', color: '#fff' },
  brandName: { fontSize: 18, fontWeight: '800', color: '#1A1A2E', marginBottom: 2 },
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