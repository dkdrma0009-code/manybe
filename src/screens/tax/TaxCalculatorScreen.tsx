import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Switch,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { colors } from '../../constants/colors';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'TaxCalculator'>;
};

// ─── 세금 계산 로직 ─────────────────────────────────────────

const WITHHOLDING_RATE = 0.033;
const INCOME_TAX_RATE = 0.069; // 종소세 과세표준 기준 대략적 적용율

function calcTax(total: number, withholdingBase: number, monthsElapsed: number) {
  const withholding = Math.round(withholdingBase * WITHHOLDING_RATE);
  const netPay = total - withholding;
  const annualEstimate = total * monthsElapsed;
  const incomeTax = Math.round(annualEstimate * INCOME_TAX_RATE);
  return { withholding, netPay, annualEstimate, incomeTax };
}

function parseAmount(text: string): number {
  const num = parseInt(text.replace(/[^0-9]/g, ''), 10);
  return isNaN(num) ? 0 : num;
}

function formatInput(text: string): string {
  const num = parseAmount(text);
  return num === 0 ? '' : num.toLocaleString('ko-KR');
}

function formatKRW(n: number) {
  return n.toLocaleString('ko-KR') + '원';
}

// ─── 서브 컴포넌트 ──────────────────────────────────────────

function ResultRow({
  label,
  value,
  color,
  bold,
  large,
}: {
  label: string;
  value: string;
  color?: string;
  bold?: boolean;
  large?: boolean;
}) {
  return (
    <View style={result.row}>
      <Text style={result.label}>{label}</Text>
      <Text
        style={[
          result.value,
          color ? { color } : null,
          bold ? result.bold : null,
          large ? result.large : null,
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

const result = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  label: { fontSize: 14, color: '#374151' },
  value: { fontSize: 14, color: '#1A1A2E', fontWeight: '500' },
  bold: { fontWeight: '800' },
  large: { fontSize: 18 },
});

// ─── 메인 화면 ──────────────────────────────────────────────

const CURRENT_MONTH = 5; // May

export default function TaxCalculatorScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();

  const [totalInput, setTotalInput] = useState('4,320,000');
  const [withholdingInput, setWithholdingInput] = useState('2,000,000');
  const [taxResult, setTaxResult] = useState(() =>
    calcTax(parseAmount('4,320,000'), parseAmount('2,000,000'), CURRENT_MONTH)
  );
  const [vatAlert, setVatAlert] = useState(true);
  const [itAlert, setItAlert] = useState(true);

  const handleCalc = () => {
    const total = parseAmount(totalInput);
    const wb = parseAmount(withholdingInput);
    setTaxResult(calcTax(total, wb, CURRENT_MONTH));
  };

  const total = parseAmount(totalInput);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>세금 시뮬레이터</Text>
          <Text style={styles.subtitle}>크리에이터 맞춤 세금 시뮬레이터</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* 입력 카드 */}
        <View style={styles.inputCard}>
          <Text style={styles.cardTitle}>수익 정보 입력</Text>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>이번 달 총수익</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                value={totalInput}
                onChangeText={(t) => setTotalInput(formatInput(t))}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor="#C4C4C4"
              />
              <Text style={styles.inputUnit}>원</Text>
            </View>
          </View>

          <View style={styles.fieldDivider} />

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>원천징수 대상 수익</Text>
            <Text style={styles.fieldHint}>협찬·강의·용역 등 3.3% 공제 대상</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                value={withholdingInput}
                onChangeText={(t) => setWithholdingInput(formatInput(t))}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor="#C4C4C4"
              />
              <Text style={styles.inputUnit}>원</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.calcBtn} onPress={handleCalc} activeOpacity={0.85}>
            <Text style={styles.calcBtnText}>시뮬레이션하기</Text>
          </TouchableOpacity>
        </View>

        {/* 계산 결과 카드 */}
        <View style={styles.resultCard}>
            <Text style={styles.cardTitle}>세금 시뮬레이션 결과 (예상)</Text>

            <ResultRow label="이번 달 총수익" value={formatKRW(total)} />
            <ResultRow
              label={`원천징수 (3.3%)`}
              value={`-${formatKRW(taxResult.withholding)}`}
              color="#EF4444"
            />

            <View style={styles.resultDivider} />

            <ResultRow
              label="실수령 예상액"
              value={formatKRW(taxResult.netPay)}
              color={colors.primary}
              bold
              large
            />

            <View style={styles.resultDivider} />

            <ResultRow
              label={`연간 누적 수익 (×${CURRENT_MONTH}개월)`}
              value={formatKRW(taxResult.annualEstimate)}
              color="#6B7280"
            />
            <ResultRow
              label="종합소득세 예상액"
              value={`-${formatKRW(taxResult.incomeTax)}`}
              color="#EF4444"
            />

            <View style={styles.disclaimer}>
              <Text style={styles.disclaimerText}>
                ⚠️ 본 결과는 참고용 시뮬레이션이며 실제 납부 세액과 다를 수 있습니다. 정확한 세금 신고는 세무사 또는 국세청 홈택스를 이용하세요.
              </Text>
            </View>
          </View>

        {/* 세금 신고 일정 카드 */}
        <View style={styles.scheduleCard}>
          <Text style={styles.cardTitle}>세금 신고 일정</Text>

          {/* 부가세 */}
          <View style={styles.scheduleRow}>
            <View style={styles.scheduleIconBg}>
              <Text style={styles.scheduleIcon}>🧾</Text>
            </View>
            <View style={styles.scheduleInfo}>
              <View style={styles.scheduleTopRow}>
                <Text style={styles.scheduleName}>부가세 신고</Text>
                <View style={styles.dBadge}>
                  <Text style={styles.dBadgeText}>D-45</Text>
                </View>
              </View>
              <Text style={styles.scheduleDesc}>1월·7월 신고 대상</Text>
            </View>
            <Switch
              value={vatAlert}
              onValueChange={setVatAlert}
              trackColor={{ false: '#E5E7EB', true: '#DDD6FE' }}
              thumbColor={vatAlert ? colors.primary : '#9CA3AF'}
            />
          </View>

          <View style={styles.scheduleDivider} />

          {/* 종소세 */}
          <View style={styles.scheduleRow}>
            <View style={[styles.scheduleIconBg, { backgroundColor: '#FEF3C7' }]}>
              <Text style={styles.scheduleIcon}>📊</Text>
            </View>
            <View style={styles.scheduleInfo}>
              <View style={styles.scheduleTopRow}>
                <Text style={styles.scheduleName}>종합소득세 신고</Text>
                <View style={[styles.dBadge, { backgroundColor: '#FEF3C7' }]}>
                  <Text style={[styles.dBadgeText, { color: '#D97706' }]}>D-120</Text>
                </View>
              </View>
              <Text style={styles.scheduleDesc}>5월 종합소득세 신고</Text>
            </View>
            <Switch
              value={itAlert}
              onValueChange={setItAlert}
              trackColor={{ false: '#E5E7EB', true: '#DDD6FE' }}
              thumbColor={itAlert ? colors.primary : '#9CA3AF'}
            />
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F8FF' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 14,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  backArrow: { fontSize: 18, color: '#374151' },
  title: { fontSize: 20, fontWeight: '800', color: '#1A1A2E', letterSpacing: -0.4 },
  subtitle: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  scroll: { paddingHorizontal: 20 },

  // 입력 카드
  inputCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A2E', marginBottom: 16 },
  fieldGroup: { gap: 6 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#374151' },
  fieldHint: { fontSize: 11, color: '#9CA3AF' },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 6,
  },
  input: { flex: 1, fontSize: 16, fontWeight: '600', color: '#1A1A2E' },
  inputUnit: { fontSize: 14, color: '#9CA3AF', fontWeight: '500' },
  fieldDivider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 14 },
  calcBtn: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  calcBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  // 결과 카드
  resultCard: {
    backgroundColor: '#F0EFFE',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
  },
  resultDivider: { height: 1, backgroundColor: 'rgba(108,99,255,0.15)', marginVertical: 4 },
  disclaimer: {
    backgroundColor: 'rgba(108,99,255,0.1)',
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
  },
  disclaimerText: { fontSize: 11, color: '#7C6FCD', lineHeight: 16 },

  // 일정 카드
  scheduleCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  scheduleIconBg: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: '#EDE9FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scheduleIcon: { fontSize: 20 },
  scheduleInfo: { flex: 1, gap: 3 },
  scheduleTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  scheduleName: { fontSize: 14, fontWeight: '700', color: '#1A1A2E' },
  dBadge: {
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  dBadgeText: { fontSize: 11, fontWeight: '700', color: colors.primary },
  scheduleDesc: { fontSize: 12, color: '#9CA3AF' },
  scheduleDivider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 12 },
});
