import { Text } from '@/components/Text';
import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { tokens } from '../constants/tokens';

export interface ChartBar {
  label: string;
  value: number;
  isForecast?: boolean;
  isCurrentMonth?: boolean;
}

interface Props {
  bars: ChartBar[];
  chartHeight?: number;
  showMovingAvg?: boolean;
}

const DOT = 6;
const RADIUS = 5;
const GAP = 5;

function formatCompact(n: number): string {
  if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(1)}억`;
  if (n >= 10_000) return `${Math.floor(n / 10_000)}만`;
  if (n === 0) return '0';
  return (n / 1000).toFixed(0) + 'K';
}

export function RevenueBarChart({ bars, chartHeight = 120, showMovingAvg = true }: Props) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  if (!bars.length) {
    return (
      <View style={[s.empty, { height: chartHeight }]}>
        <Text style={s.emptyText}>수익 데이터 없음</Text>
      </View>
    );
  }

  const screenWidth = Dimensions.get('window').width;
  const chartWidth = screenWidth - 80; // 16*2 margin + 16*2 card padding + 8 buffer
  const barWidth = Math.max(8, (chartWidth - (bars.length - 1) * GAP) / bars.length);

  const maxVal = Math.max(...bars.map((b) => b.value), 1);
  const nonForecastBars = bars.filter((b) => !b.isForecast);
  const avgVal = nonForecastBars.length
    ? nonForecastBars.reduce((s, b) => s + b.value, 0) / nonForecastBars.length
    : 0;
  const avgH = (avgVal / maxVal) * chartHeight;

  // 3-period moving average
  const movingAvg = bars.map((_, i) => {
    const from = Math.max(0, i - 1);
    const to = Math.min(bars.length - 1, i + 1);
    const window = bars.slice(from, to + 1).filter((b) => !b.isForecast && b.value > 0);
    return window.length ? window.reduce((s, b) => s + b.value, 0) / window.length : 0;
  });

  const selectedBar = selectedIdx !== null ? bars[selectedIdx] : null;

  return (
    <View style={s.container}>
      {/* Tooltip */}
      {selectedBar && (
        <View style={s.tooltip}>
          <Text style={s.tooltipLabel}>{selectedBar.label}</Text>
          <Text style={s.tooltipValue}>
            {selectedBar.isForecast ? '예측 ' : ''}
            {formatCompact(selectedBar.value)}
          </Text>
        </View>
      )}

      {/* Chart area */}
      <View style={[s.chartArea, { height: chartHeight }]}>
        {/* Average line */}
        {avgVal > 0 && (
          <View style={[s.avgLine, { bottom: avgH }]} pointerEvents="none" />
        )}

        {/* Bars */}
        {bars.map((bar, idx) => {
          const barH = bar.value > 0 ? Math.max((bar.value / maxVal) * chartHeight, 3) : 3;
          const maH = movingAvg[idx] > 0 ? (movingAvg[idx] / maxVal) * chartHeight : 0;
          const isSelected = selectedIdx === idx;
          const isCurrent = bar.isCurrentMonth;
          const isForecast = bar.isForecast;

          const barColor = isForecast
            ? tokens.primary + '55'
            : isCurrent
            ? tokens.primary
            : isSelected
            ? tokens.primaryDeep
            : tokens.primarySoft;

          return (
            <TouchableOpacity
              key={idx}
              style={[s.barSlot, { width: barWidth, height: chartHeight }]}
              onPress={() => setSelectedIdx(idx === selectedIdx ? null : idx)}
              activeOpacity={0.85}
            >
              {/* Moving average dot */}
              {showMovingAvg && maH > 0 && (
                <View
                  style={[
                    s.maDot,
                    {
                      bottom: maH - DOT / 2,
                      left: (barWidth - DOT) / 2,
                    },
                  ]}
                />
              )}
              {/* Bar fill */}
              <View
                style={[
                  s.barFill,
                  {
                    height: barH,
                    width: barWidth,
                    backgroundColor: barColor,
                    borderRadius: RADIUS,
                    borderWidth: isForecast ? 1 : 0,
                    borderColor: tokens.primary,
                    borderStyle: isForecast ? 'dashed' : 'solid',
                  },
                ]}
              />
              {/* Current month dot */}
              {isCurrent && !isForecast && (
                <View style={[s.currentDot, { bottom: barH + 3, left: (barWidth - 4) / 2 }]} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Labels */}
      <View style={[s.labels, { gap: GAP }]}>
        {bars.map((bar, idx) => (
          <View key={idx} style={[s.labelSlot, { width: barWidth }]}>
            <Text
              style={[
                s.labelText,
                bar.isCurrentMonth && s.labelCurrent,
                bar.isForecast && s.labelForecast,
              ]}
              numberOfLines={1}
            >
              {bar.label}
            </Text>
          </View>
        ))}
      </View>

      {/* Legend row */}
      <View style={s.legend}>
        <View style={s.legendItem}>
          <View style={[s.legendDot, { backgroundColor: tokens.ink4 }]} />
          <Text style={s.legendText}>이동평균</Text>
        </View>
        {avgVal > 0 && (
          <View style={s.legendItem}>
            <View style={[s.legendLine, { backgroundColor: tokens.ink4 + '80' }]} />
            <Text style={s.legendText}>평균 {formatCompact(avgVal)}</Text>
          </View>
        )}
        {bars.some((b) => b.isForecast) && (
          <View style={s.legendItem}>
            <View style={[s.legendDot, { backgroundColor: tokens.primary + '55', borderWidth: 1, borderColor: tokens.primary, borderStyle: 'dashed' }]} />
            <Text style={s.legendText}>예측</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { paddingHorizontal: 16, paddingBottom: 14, paddingTop: 4 },

  empty: { alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 12, color: tokens.ink4 },

  tooltip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 5,
    backgroundColor: tokens.ink,
    borderRadius: 8, alignSelf: 'center',
    marginBottom: 8,
  },
  tooltipLabel: { fontSize: 11, color: '#fff', fontWeight: '600' },
  tooltipValue: { fontSize: 12, color: '#fff', fontWeight: '800' },

  chartArea: {
    flexDirection: 'row', alignItems: 'flex-end',
    gap: GAP, position: 'relative',
  },
  avgLine: {
    position: 'absolute', left: 0, right: 0, height: 0,
    borderBottomWidth: 1, borderStyle: 'dashed',
    borderColor: tokens.ink4 + '60',
  },
  barSlot: { position: 'relative', justifyContent: 'flex-end', alignItems: 'center' },
  barFill: { position: 'absolute', bottom: 0, left: 0 },
  maDot: {
    position: 'absolute',
    width: DOT, height: DOT, borderRadius: DOT / 2,
    backgroundColor: tokens.ink3,
    zIndex: 2,
  },
  currentDot: {
    position: 'absolute',
    width: 4, height: 4, borderRadius: 2,
    backgroundColor: tokens.primary,
  },

  labels: { flexDirection: 'row', marginTop: 6 },
  labelSlot: { alignItems: 'center' },
  labelText: { fontSize: 9, color: tokens.ink4, textAlign: 'center' },
  labelCurrent: { color: tokens.primary, fontWeight: '700' },
  labelForecast: { color: tokens.ink3, fontStyle: 'italic' },

  legend: { flexDirection: 'row', gap: 12, marginTop: 8, justifyContent: 'flex-end' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLine: { width: 14, height: 1 },
  legendText: { fontSize: 10, color: tokens.ink4 },
});
