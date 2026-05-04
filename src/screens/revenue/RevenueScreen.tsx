import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import Svg, { Path, Circle, G } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../../constants/colors';

const { width } = Dimensions.get('window');

// ─── 데이터 ────────────────────────────────────────────────

const TOTAL = 4320000;
const GOAL = 5000000;
const TAX = 142560;
const NET = TOTAL - TAX;

const DONUT_SEGMENTS = [
  { label: '플랫폼 광고', pct: 41, amount: 1800000, color: '#EF4444' },
  { label: '브랜드 협찬', pct: 47, amount: 2000000, color: '#6C63FF' },
  { label: '제휴 수익',   pct: 7,  amount: 320000,  color: '#F97316' },
  { label: '기타',        pct: 5,  amount: 200000,  color: '#9CA3AF' },
];

const BAR_DATA = [
  { month: '12월', value: 2800000 },
  { month: '1월',  value: 3200000 },
  { month: '2월',  value: 2600000 },
  { month: '3월',  value: 3800000 },
  { month: '4월',  value: 3500000 },
  { month: '5월',  value: 4320000 },
];

const TRANSACTIONS = [
  { date: '05.12', desc: '애드센스 수익',   amount: 1800000, icon: '📱' },
  { date: '05.08', desc: '올리브영 협찬',   amount: 1500000, icon: '🤝' },
  { date: '05.03', desc: '쿠팡파트너스',   amount: 320000,  icon: '🔗' },
];

const MONTHS = ['2026년 3월', '2026년 4월', '2026년 5월'];

// ─── 도넛 차트 ──────────────────────────────────────────────

function polarToXY(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function donutArc(cx: number, cy: number, R: number, r: number, start: number, end: number) {
  const s = polarToXY(cx, cy, R, start);
  const e = polarToXY(cx, cy, R, end);
  const si = polarToXY(cx, cy, r, start);
  const ei = polarToXY(cx, cy, r, end);
  const large = end - start > 180 ? 1 : 0;
  return `M ${s.x} ${s.y} A ${R} ${R} 0 ${large} 1 ${e.x} ${e.y} L ${ei.x} ${ei.y} A ${r} ${r} 0 ${large} 0 ${si.x} ${si.y} Z`;
}

function DonutChart() {
  const SIZE = 180;
  const cx = SIZE / 2;
  const cy = SIZE / 2;
  const R = 78;
  const r = 50;
  const GAP = 2;

  let angle = 0;
  const paths = DONUT_SEGMENTS.map((seg) => {
    const sweep = (seg.pct / 100) * 360;
    const start = angle + GAP / 2;
    const end = angle + sweep - GAP / 2;
    angle += sweep;
    return { ...seg, path: donutArc(cx, cy, R, r, start, end) };
  });

  return (
    <View style={donut.wrapper}>
      {/* 차트 */}
      <View>
        <Svg width={SIZE} height={SIZE}>
          <G>
            {paths.map((p) => (
              <Path key={p.label} d={p.path} fill={p.color} />
            ))}
          </G>
        </Svg>
        {/* 중앙 텍스트 */}
        <View style={[donut.center, { width: SIZE, height: SIZE }]}>
          <Text style={donut.centerSub}>총수익</Text>
          <Text style={donut.centerAmount}>
            {(TOTAL / 10000).toLocaleString()}만원
          </Text>
        </View>
      </View>

      {/* 범례 */}
      <View style={donut.legend}>
        {DONUT_SEGMENTS.map((seg) => (
          <View key={seg.label} style={donut.legendRow}>
            <View style={[donut.dot, { backgroundColor: seg.color }]} />
            <View style={donut.legendText}>
              <Text style={donut.legendLabel}>{seg.label}</Text>
              <Text style={donut.legendPct}>{seg.pct}%</Text>
            </View>
            <Text style={donut.legendAmount}>
              {(seg.amount / 10000).toLocaleString()}만원
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const donut = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingHorizontal: 4,
  },
  center: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerSub: {
    fontSize: 11,
    color: '#9CA3AF',
    marginBottom: 2,
  },
  centerAmount: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1A1A2E',
  },
  legend: {
    flex: 1,
    gap: 10,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    flex: 1,
  },
  legendLabel: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
  },
  legendPct: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  legendAmount: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1A1A2E',
  },
});

// ─── 바 차트 ────────────────────────────────────────────────

function BarChart() {
  const BAR_MAX_VAL = Math.max(...BAR_DATA.map((d) => d.value));
  const BAR_H = 100;
  const isLast = (i: number) => i === BAR_DATA.length - 1;

  return (
    <View style={bar.container}>
      {BAR_DATA.map((d, i) => {
        const ratio = d.value / BAR_MAX_VAL;
        const barH = Math.max(ratio * BAR_H, 8);
        return (
          <View key={d.month} style={bar.col}>
            <Text style={[bar.valueLabel, isLast(i) && bar.valueLabelActive]}>
              {isLast(i) ? `${(d.value / 10000).toFixed(0)}만` : ''}
            </Text>
            <View style={bar.track}>
              <View
                style={[
                  bar.fill,
                  { height: barH },
                  isLast(i) ? bar.fillActive : bar.fillNormal,
                ]}
              />
            </View>
            <Text style={[bar.monthLabel, isLast(i) && bar.monthLabelActive]}>
              {d.month}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const bar = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  col: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  valueLabel: {
    fontSize: 10,
    color: 'transparent',
    fontWeight: '600',
    height: 14,
  },
  valueLabelActive: {
    color: colors.primary,
  },
  track: {
    width: 28,
    height: 100,
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  fill: {
    width: '100%',
    borderRadius: 6,
  },
  fillNormal: {
    backgroundColor: '#DDD6FE',
  },
  fillActive: {
    backgroundColor: colors.primary,
  },
  monthLabel: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  monthLabelActive: {
    color: colors.primary,
    fontWeight: '700',
  },
});

// ─── 메인 화면 ──────────────────────────────────────────────

function formatKRW(n: number) {
  return n.toLocaleString('ko-KR') + '원';
}

export default function RevenueScreen() {
  const insets = useSafeAreaInsets();
  const [selectedMonth, setSelectedMonth] = useState('2026년 5월');
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const progressPct = Math.round((TOTAL / GOAL) * 100);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* 헤더 */}
        <View style={styles.header}>
          <Text style={styles.title}>수익 현황</Text>
          <View>
            <TouchableOpacity
              style={styles.monthBtn}
              onPress={() => setShowMonthPicker(!showMonthPicker)}
            >
              <Text style={styles.monthBtnText}>{selectedMonth}</Text>
              <Text style={styles.monthBtnArrow}>{showMonthPicker ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {showMonthPicker && (
              <View style={styles.monthDropdown}>
                {MONTHS.map((m) => (
                  <TouchableOpacity
                    key={m}
                    style={[styles.monthOption, m === selectedMonth && styles.monthOptionActive]}
                    onPress={() => { setSelectedMonth(m); setShowMonthPicker(false); }}
                  >
                    <Text style={[styles.monthOptionText, m === selectedMonth && styles.monthOptionTextActive]}>
                      {m}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* 이번 달 요약 카드 */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View>
              <Text style={styles.summaryLabel}>총수익</Text>
              <Text style={styles.summaryTotal}>{formatKRW(TOTAL)}</Text>
            </View>
            <View style={styles.summaryRight}>
              <Text style={styles.summaryGoalLabel}>목표 {formatKRW(GOAL)}</Text>
              <Text style={styles.summaryPct}>{progressPct}%</Text>
            </View>
          </View>

          {/* 프로그레스 바 */}
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
          </View>
          <Text style={styles.progressCaption}>목표까지 {formatKRW(GOAL - TOTAL)} 남았어요</Text>

          <View style={styles.summaryDivider} />

          <View style={styles.summaryBottom}>
            <View>
              <Text style={styles.summarySubLabel}>예상 세금 (3.3%)</Text>
              <Text style={styles.summaryTax}>-{formatKRW(TAX)}</Text>
            </View>
            <View style={styles.summaryBottomRight}>
              <Text style={styles.summarySubLabel}>실수령 예상액</Text>
              <Text style={styles.summaryNet}>{formatKRW(NET)}</Text>
            </View>
          </View>
        </View>

        {/* 수익원별 도넛 차트 */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>수익원별 구성</Text>
          <DonutChart />
        </View>

        {/* 최근 6개월 바 차트 */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>최근 6개월 추이</Text>
          <BarChart />
        </View>

        {/* 최근 수익 내역 */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>최근 수익 내역</Text>
            <TouchableOpacity>
              <Text style={styles.cardMore}>전체보기</Text>
            </TouchableOpacity>
          </View>
          {TRANSACTIONS.map((tx, i) => (
            <View
              key={i}
              style={[styles.txRow, i < TRANSACTIONS.length - 1 && styles.txRowBorder]}
            >
              <View style={styles.txIconBg}>
                <Text style={styles.txIcon}>{tx.icon}</Text>
              </View>
              <View style={styles.txInfo}>
                <Text style={styles.txDesc}>{tx.desc}</Text>
                <Text style={styles.txDate}>{tx.date}</Text>
              </View>
              <Text style={styles.txAmount}>+{formatKRW(tx.amount)}</Text>
            </View>
          ))}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* 플로팅 버튼 */}
      <TouchableOpacity style={[styles.fab, { bottom: insets.bottom + 88 }]} activeOpacity={0.85}>
        <Text style={styles.fabText}>＋</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8FF',
  },
  scroll: {
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1A1A2E',
    letterSpacing: -0.4,
  },
  monthBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  monthBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  monthBtnArrow: {
    fontSize: 10,
    color: '#9CA3AF',
  },
  monthDropdown: {
    position: 'absolute',
    top: 40,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 100,
    minWidth: 130,
    overflow: 'hidden',
  },
  monthOption: {
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  monthOptionActive: {
    backgroundColor: '#F0EFFE',
  },
  monthOptionText: {
    fontSize: 13,
    color: '#374151',
  },
  monthOptionTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  summaryCard: {
    backgroundColor: '#F0EFFE',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  summaryLabel: {
    fontSize: 13,
    color: '#7C6FCD',
    marginBottom: 4,
  },
  summaryTotal: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1A1A2E',
    letterSpacing: -0.5,
  },
  summaryRight: {
    alignItems: 'flex-end',
  },
  summaryGoalLabel: {
    fontSize: 12,
    color: '#7C6FCD',
    marginBottom: 4,
  },
  summaryPct: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.primary,
  },
  progressTrack: {
    height: 8,
    backgroundColor: 'rgba(108,99,255,0.2)',
    borderRadius: 4,
    marginBottom: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  progressCaption: {
    fontSize: 12,
    color: '#7C6FCD',
    marginBottom: 14,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: 'rgba(108,99,255,0.15)',
    marginBottom: 14,
  },
  summaryBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryBottomRight: {
    alignItems: 'flex-end',
  },
  summarySubLabel: {
    fontSize: 12,
    color: '#7C6FCD',
    marginBottom: 3,
  },
  summaryTax: {
    fontSize: 16,
    fontWeight: '700',
    color: '#EF4444',
  },
  summaryNet: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A2E',
    marginBottom: 16,
  },
  cardMore: {
    fontSize: 13,
    color: colors.primary,
    fontWeight: '500',
    marginBottom: 16,
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  txRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  txIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F5F3FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  txIcon: {
    fontSize: 18,
  },
  txInfo: {
    flex: 1,
  },
  txDesc: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A2E',
    marginBottom: 2,
  },
  txDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  txAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: '#059669',
  },
  fab: {
    position: 'absolute',
    right: 20,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  fabText: {
    fontSize: 24,
    color: '#fff',
    fontWeight: '300',
    lineHeight: 28,
  },
});
