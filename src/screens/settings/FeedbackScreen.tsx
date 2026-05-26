import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../api/supabase';
import { theme } from '../../constants/theme';
import { RootStackParamList } from '../../navigation/AppNavigator';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Feedback'>;
};

const CATEGORIES = ['버그', '개선', '기타'] as const;
type Category = typeof CATEGORIES[number];

const { colors, space, radius, typography } = theme;

export default function FeedbackScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [category, setCategory] = useState<Category>('개선');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!content.trim()) {
      Alert.alert('내용을 입력해주세요');
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from('feedback').insert({
      user_id: user?.id,
      category,
      content: content.trim(),
    });
    setSubmitting(false);
    if (error) {
      Alert.alert('전송 실패', '잠시 후 다시 시도해주세요');
      return;
    }
    Alert.alert('감사합니다', '피드백이 전달됐습니다', [
      { text: '확인', onPress: () => navigation.goBack() },
    ]);
  }

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={s.back}>‹</Text>
        </TouchableOpacity>
        <Text style={s.title}>피드백 보내기</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <Text style={s.label}>유형</Text>
        <View style={s.chips}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[s.chip, category === cat && s.chipActive]}
              onPress={() => setCategory(cat)}
              activeOpacity={0.7}
            >
              <Text style={[s.chipText, category === cat && s.chipTextActive]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={s.label}>내용</Text>
        <TextInput
          style={s.input}
          multiline
          numberOfLines={6}
          placeholder="불편하신 점이나 개선됐으면 하는 점을 자유롭게 적어주세요"
          placeholderTextColor={colors.text.muted}
          value={content}
          onChangeText={setContent}
          maxLength={500}
          textAlignVertical="top"
        />
        <Text style={s.counter}>{content.length}/500</Text>

        <TouchableOpacity
          style={[s.submit, (!content.trim() || submitting) && s.submitDisabled]}
          onPress={handleSubmit}
          disabled={!content.trim() || submitting}
          activeOpacity={0.8}
        >
          {submitting
            ? <ActivityIndicator color="#fff" />
            : <Text style={s.submitText}>전송</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root:            { flex: 1, backgroundColor: colors.bg },
  header:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.screen, paddingVertical: space.md },
  back:            { fontSize: 28, color: colors.text.primary, lineHeight: 32 },
  title:           { ...typography.navTitle, color: colors.text.primary },
  scroll:          { paddingHorizontal: space.screen, paddingTop: space.md },
  label:           { ...typography.sectionTitle, color: colors.text.primary, marginBottom: space.sm, marginTop: space.lg },
  chips:           { flexDirection: 'row', gap: space.sm },
  chip:            { paddingHorizontal: space.md, paddingVertical: space.xs + 2, borderRadius: 20, borderWidth: 1.5, borderColor: colors.border.default },
  chipActive:      { backgroundColor: colors.brand.default, borderColor: colors.brand.default },
  chipText:        { ...typography.label, color: colors.text.secondary },
  chipTextActive:  { color: '#fff' },
  input:           { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border.default, borderRadius: radius.lg, padding: space.md, ...typography.body, color: colors.text.primary, minHeight: 140, marginTop: space.xs },
  counter:         { ...typography.caption, color: colors.text.muted, textAlign: 'right', marginTop: space.xs },
  submit:          { backgroundColor: colors.brand.default, borderRadius: radius.lg, paddingVertical: space.md, alignItems: 'center', marginTop: space.xl },
  submitDisabled:  { opacity: 0.4 },
  submitText:      { ...typography.bodyStrong, color: '#fff' },
});
