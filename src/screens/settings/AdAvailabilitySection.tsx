import { Text } from '@/components/Text';
import React, { useState } from 'react';
import {
  View, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { supabase } from '../../api/supabase';
import type { Database } from '../../types/database';
import { colors } from '../../constants/colors';
import {
  AVAILABILITY_NOTE_MAX, RECONFIRM_SIGNAL, formatConfirmedDate, getAvailabilityDisplayState,
  isAvailabilityDirty, noteLength, toAvailabilityDraft, toAvailabilityUpdate, validateAvailabilitySchedule,
  type AdAvailability, type AvailabilityDraft, type AvailabilityRow,
} from '../../utils/adAvailability';

// 광고 수신 설정 (Step 3) — 미디어킷 관리 화면 상단 섹션.
// 크리에이터가 보는 광고 수신 상태의 기준(Source of Truth)은 media_kits.ad_availability.
// 소개·단가 저장(헤더 "저장")과 분리해 이 섹션 버튼으로만 저장한다 — 확인일이 상태·일정 저장에서만 갱신되도록.

const AVAILABILITY_COLUMNS =
  'ad_availability, ad_availability_confirmed_at, available_from, available_until, availability_note';

function todayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const STATE_LABEL = {
  unset:         { text: '광고 수신 여부를 설정해주세요', color: '#9CA3AF' },
  accepting:     { text: '광고 받는 중',                  color: '#059669' },
  not_accepting: { text: '현재 광고 수신 중지',           color: '#6B7280' },
  stale:         { text: '확인 필요 — 지금 상태를 다시 확인해주세요', color: '#D97706' },
} as const;

type Props = {
  userId: string;
  hasKit: boolean;
  initial: AvailabilityRow | null;
};

export default function AdAvailabilitySection({ userId, hasKit, initial }: Props) {
  const [saved, setSaved] = useState<AvailabilityRow | null>(initial);
  const [draft, setDraft] = useState<AvailabilityDraft>(() => toAvailabilityDraft(initial));
  const [saving, setSaving] = useState(false);

  const displayState = getAvailabilityDisplayState(saved?.ad_availability, saved?.ad_availability_confirmed_at);
  const confirmedDate = formatConfirmedDate(saved?.ad_availability_confirmed_at);
  const dirty = isAvailabilityDirty(draft, saved);
  const noteCount = noteLength(draft.note.trim());

  async function persist(update: Database['public']['Tables']['media_kits']['Update'], successMessage: string) {
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('media_kits')
        .update(update)
        .eq('user_id', userId)
        .select(AVAILABILITY_COLUMNS);
      if (error) throw error;
      const row = data?.[0];
      if (!row) throw new Error('저장할 미디어킷을 찾지 못했어요.');
      // DB가 실제로 저장한 값(서버 확인 시각 포함)으로만 화면 갱신
      setSaved(row);
      setDraft(toAvailabilityDraft(row));
      Alert.alert('저장 완료', successMessage);
    } catch (e: any) {
      Alert.alert('오류', e?.message ?? '저장에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setSaving(false);
    }
  }

  function handleSave() {
    if (saving || !draft.status) return;
    if (draft.status === 'accepting') {
      const err = validateAvailabilitySchedule({
        from: draft.fromMode === 'date' ? draft.from.trim() : null,
        until: draft.untilMode === 'date' ? draft.until.trim() : null,
        note: draft.note,
      });
      if (err) {
        Alert.alert('확인해주세요', err);
        return;
      }
    }
    persist(toAvailabilityUpdate({ ...draft, status: draft.status }), '광고 수신 설정이 저장됐어요.');
  }

  function handleReconfirm() {
    if (saving || !saved?.ad_availability) return;
    persist({ ad_availability_confirmed_at: RECONFIRM_SIGNAL }, '현재 상태로 다시 확인했어요.');
  }

  function setStatus(status: AdAvailability) {
    setDraft((d) => ({ ...d, status }));
  }

  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>광고 수신 설정</Text>
      <Text style={s.sectionDesc}>지금 유료 광고 제안을 받을 수 있는지 알려주세요</Text>

      <View style={s.statusRow}>
        <Text style={[s.statusText, { color: STATE_LABEL[displayState].color }]}>
          {STATE_LABEL[displayState].text}
        </Text>
        <Text style={s.confirmedText}>
          {confirmedDate ? `마지막 확인: ${confirmedDate}` : '아직 확인하지 않음'}
        </Text>
      </View>

      {!hasKit ? (
        <Text style={s.hint}>미디어킷을 먼저 저장하면 광고 수신 설정을 할 수 있어요 (오른쪽 위 "저장").</Text>
      ) : (
        <>
          <View style={s.optionCol}>
            {([
              ['accepting', '광고 받을 수 있어요'],
              ['not_accepting', '지금은 광고를 받기 어려워요'],
            ] as const).map(([value, label]) => {
              const active = draft.status === value;
              return (
                <TouchableOpacity
                  key={value}
                  style={[s.option, active && s.optionActive]}
                  onPress={() => setStatus(value)}
                  activeOpacity={0.8}
                  disabled={saving}
                >
                  <Text style={[s.optionText, active && s.optionTextActive]}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {draft.status === 'accepting' && (
            <View style={s.schedule}>
              <Text style={s.fieldLabel}>시작 가능일</Text>
              <View style={s.chipRow}>
                <Chip label="지금부터 가능" active={draft.fromMode === 'now'}
                  onPress={() => setDraft((d) => ({ ...d, fromMode: 'now' }))} />
                <Chip label="날짜 선택" active={draft.fromMode === 'date'}
                  onPress={() => setDraft((d) => ({ ...d, fromMode: 'date', from: d.from || todayString() }))} />
              </View>
              {draft.fromMode === 'date' && (
                <TextInput
                  style={s.dateInput}
                  value={draft.from}
                  onChangeText={(v) => setDraft((d) => ({ ...d, from: v }))}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#C4C4C4"
                  keyboardType="numbers-and-punctuation"
                  maxLength={10}
                />
              )}

              <Text style={s.fieldLabel}>종료일</Text>
              <View style={s.chipRow}>
                <Chip label="종료일 없음" active={draft.untilMode === 'none'}
                  onPress={() => setDraft((d) => ({ ...d, untilMode: 'none' }))} />
                <Chip label="날짜 선택" active={draft.untilMode === 'date'}
                  onPress={() => setDraft((d) => ({ ...d, untilMode: 'date', until: d.until || todayString() }))} />
              </View>
              {draft.untilMode === 'date' && (
                <TextInput
                  style={s.dateInput}
                  value={draft.until}
                  onChangeText={(v) => setDraft((d) => ({ ...d, until: v }))}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#C4C4C4"
                  keyboardType="numbers-and-punctuation"
                  maxLength={10}
                />
              )}

              <Text style={s.fieldLabel}>일정 메모 (선택)</Text>
              <TextInput
                style={s.noteInput}
                value={draft.note}
                onChangeText={(v) => setDraft((d) => ({ ...d, note: v }))}
                placeholder="평일 촬영 가능 / 10월 셋째 주 제외"
                placeholderTextColor="#C4C4C4"
                multiline
                textAlignVertical="top"
              />
              <Text style={[s.charCount, noteCount > AVAILABILITY_NOTE_MAX && { color: '#DC2626' }]}>
                {noteCount} / {AVAILABILITY_NOTE_MAX}
              </Text>
            </View>
          )}

          {dirty ? (
            <TouchableOpacity
              style={[s.primaryBtn, saving && { opacity: 0.6 }]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.85}
            >
              {saving
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={s.primaryBtnText}>광고 수신 설정 저장</Text>}
            </TouchableOpacity>
          ) : saved?.ad_availability ? (
            <TouchableOpacity
              style={[s.outlineBtn, saving && { opacity: 0.6 }]}
              onPress={handleReconfirm}
              disabled={saving}
              activeOpacity={0.85}
            >
              {saving
                ? <ActivityIndicator color={colors.primary} size="small" />
                : <Text style={s.outlineBtnText}>현재 상태 그대로 다시 확인</Text>}
            </TouchableOpacity>
          ) : null}
        </>
      )}
    </View>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[s.chip, active && s.chipActive]} onPress={onPress} activeOpacity={0.8}>
      <Text style={[s.chipText, active && s.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

// MediaKitEditScreen 섹션 스타일과 같은 값 사용
const s = StyleSheet.create({
  section: {
    backgroundColor: '#fff', borderRadius: 18, padding: 18, marginBottom: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: '#1A1A2E', marginBottom: 4 },
  sectionDesc:  { fontSize: 12, color: '#9CA3AF', lineHeight: 18 },

  statusRow: {
    marginTop: 12, marginBottom: 12, backgroundColor: '#F9FAFB', borderRadius: 10, padding: 10, gap: 2,
  },
  statusText:    { fontSize: 13, fontWeight: '700' },
  confirmedText: { fontSize: 11, color: '#9CA3AF' },
  hint: { fontSize: 12, color: '#9CA3AF', lineHeight: 18 },

  optionCol: { gap: 8 },
  option: {
    borderWidth: 1.5, borderColor: '#E8E4FF', backgroundColor: '#fff',
    borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14,
  },
  optionActive:     { borderColor: colors.primary, backgroundColor: '#F4F0FF' },
  optionText:       { fontSize: 14, fontWeight: '600', color: '#374151' },
  optionTextActive: { color: colors.primary },

  schedule:   { marginTop: 14 },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: '#374151', marginTop: 10, marginBottom: 8 },
  chipRow:    { flexDirection: 'row', gap: 8 },
  chip: {
    backgroundColor: '#F3F4F6', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
  },
  chipActive:     { backgroundColor: '#F0EFFE' },
  chipText:       { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  chipTextActive: { color: colors.primary },
  dateInput: {
    marginTop: 8, backgroundColor: '#F4F0FF', borderRadius: 10, borderWidth: 1.5, borderColor: '#E8E4FF',
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: '#1A1A2E',
  },
  noteInput: {
    backgroundColor: '#F4F0FF', borderRadius: 12, borderWidth: 1.5, borderColor: '#E8E4FF',
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#1A1A2E', lineHeight: 20, minHeight: 64,
  },
  charCount: { fontSize: 11, color: '#C4C4C4', textAlign: 'right', marginTop: 6 },

  primaryBtn: {
    marginTop: 14, backgroundColor: colors.primary, borderRadius: 12,
    paddingVertical: 12, alignItems: 'center',
  },
  primaryBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  outlineBtn: {
    marginTop: 14, borderWidth: 1.5, borderColor: colors.primary, borderRadius: 12,
    paddingVertical: 11, alignItems: 'center',
  },
  outlineBtnText: { color: colors.primary, fontSize: 14, fontWeight: '700' },
});
