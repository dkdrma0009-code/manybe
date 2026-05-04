import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { colors } from '../../constants/colors';
import { useAuth } from '../../hooks/useAuth';
import { AuthStackParamList } from '../../navigation/AppNavigator';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Signup'>;
};

export default function SignupScreen({ navigation }: Props) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const { signUp } = useAuth();

  const handleSignup = async () => {
    if (!fullName || !email || !password || !confirmPassword) {
      Alert.alert('입력 오류', '모든 항목을 입력해주세요.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('입력 오류', '비밀번호가 일치하지 않습니다.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('입력 오류', '비밀번호는 6자 이상이어야 합니다.');
      return;
    }

    setLoading(true);
    const { error } = await signUp(email.trim(), password, fullName.trim());
    setLoading(false);

    if (error) {
      Alert.alert('회원가입 실패', error.message);
    } else {
      Alert.alert(
        '가입 완료 🎉',
        '이메일 인증 링크를 보내드렸습니다.\n메일함을 확인해주세요.',
        [{ text: '로그인으로 이동', onPress: () => navigation.navigate('Login') }]
      );
    }
  };

  const inputStyle = (field: string) => [
    styles.input,
    focusedField === field && styles.inputFocused,
  ];

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* 상단 보라색 배경 영역 */}
        <View style={styles.heroSection}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>← 돌아가기</Text>
          </TouchableOpacity>
          <View style={styles.logoWrapper}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoLetter}>M</Text>
            </View>
          </View>
          <Text style={styles.logoText}>매니비</Text>
          <Text style={styles.logoSub}>계정을 만들고 시작하세요</Text>
        </View>

        {/* 폼 카드 */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>회원가입</Text>
          <Text style={styles.cardSubtitle}>크리에이터 비즈니스를 체계적으로 관리하세요</Text>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>이름</Text>
            <TextInput
              style={inputStyle('name')}
              value={fullName}
              onChangeText={setFullName}
              placeholder="홍길동"
              placeholderTextColor="#C4C4C4"
              autoCorrect={false}
              onFocus={() => setFocusedField('name')}
              onBlur={() => setFocusedField(null)}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>이메일</Text>
            <TextInput
              style={inputStyle('email')}
              value={email}
              onChangeText={setEmail}
              placeholder="example@email.com"
              placeholderTextColor="#C4C4C4"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              onFocus={() => setFocusedField('email')}
              onBlur={() => setFocusedField(null)}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>비밀번호</Text>
            <TextInput
              style={inputStyle('password')}
              value={password}
              onChangeText={setPassword}
              placeholder="6자 이상 입력하세요"
              placeholderTextColor="#C4C4C4"
              secureTextEntry
              onFocus={() => setFocusedField('password')}
              onBlur={() => setFocusedField(null)}
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>비밀번호 확인</Text>
            <TextInput
              style={[
                ...inputStyle('confirm'),
                confirmPassword.length > 0 && password !== confirmPassword
                  ? styles.inputError
                  : null,
              ]}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="비밀번호를 다시 입력하세요"
              placeholderTextColor="#C4C4C4"
              secureTextEntry
              onFocus={() => setFocusedField('confirm')}
              onBlur={() => setFocusedField(null)}
            />
            {confirmPassword.length > 0 && password !== confirmPassword && (
              <Text style={styles.errorText}>비밀번호가 일치하지 않습니다</Text>
            )}
          </View>

          <TouchableOpacity
            style={[styles.signupButton, loading && styles.buttonDisabled]}
            onPress={handleSignup}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.signupButtonText}>가입하기</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.loginLink}
            onPress={() => navigation.navigate('Login')}
            activeOpacity={0.7}
          >
            <Text style={styles.loginLinkText}>
              이미 계정이 있으신가요?{' '}
              <Text style={styles.loginLinkBold}>로그인</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scroll: {
    flexGrow: 1,
  },
  heroSection: {
    backgroundColor: colors.primary,
    paddingTop: 60,
    paddingBottom: 40,
    alignItems: 'center',
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 24,
  },
  backText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '500',
  },
  logoWrapper: {
    marginBottom: 12,
  },
  logoCircle: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  logoLetter: {
    fontSize: 30,
    fontWeight: '800',
    color: '#fff',
  },
  logoText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
  },
  logoSub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 4,
  },
  card: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -20,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 40,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1A1A2E',
    letterSpacing: -0.5,
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 4,
    marginBottom: 24,
  },
  fieldGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#1A1A2E',
  },
  inputFocused: {
    borderColor: colors.primary,
    backgroundColor: '#F5F3FF',
  },
  inputError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 5,
    marginLeft: 4,
  },
  signupButton: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  signupButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  loginLink: {
    alignItems: 'center',
    marginTop: 18,
    paddingVertical: 8,
  },
  loginLinkText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  loginLinkBold: {
    color: colors.primary,
    fontWeight: '600',
  },
});
