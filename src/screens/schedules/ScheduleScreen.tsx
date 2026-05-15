import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Alert,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth';
import { useScheduleData, ScheduleItem } from '../../hooks/useScheduleData';
import { useRealtime } from '../../context/RealtimeContext';
import AddScheduleModal from './AddScheduleModal';
import { supabase } from '../../api/supabase';
import { colors } from '../../constants/colors';
import { tokens } from '../../constants/tokens';
import { typography } from '../../constants/typography';
import { shadows } from '../../constants/shadows';

const { width } = Dimensions.get('window');
const DAY_SIZE = Math.floor((width - 40) / 7);

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
const MONTH_NAMES = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];

const TYPE_ICON: Record<string, string> = {
  '업로드 예정': '📤',
  '협찬 마감':   '🔔',
  '미팅':        '📋',
  '기타':        '💡',
};

function getCalendarGrid(year: number, month: number): (number | null)[] {
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = Array(firstDow).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

// ─── 달력 셀 ────────────────────────────────────────────────

function DayCell({
  day, isToday, isSelected, dots, onPress,
}: {
  day: number | null;
  isToday: boolean;
  isSelected: boolean;
  dots: { color: string }[];
  onPress: () => void;
}) {
  if (day === null) return <View style={{ width: DAY_SIZE, height: 52 }} />;
  return (
    <TouchableOpacity
      style={[calStyle.cell, { width: DAY_SIZE, height: 52 }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[calStyle.dayCircle, isToday && calStyle.todayCircle, isSelected && !isToday && calStyle.selectedCircle]}>
        <Text style={[calStyle.dayText, isToday && calStyle.todayText, isSelected && !isToday && calStyle.selectedText]}>
          {day}
        </Text>
      </View>
      <View style={calStyle.dotsRow}>
        {dots.slice(0, 3).map((dot, i) => (
          <View key={i} style={[calStyle.dot, { backgroundColor: dot.color }]} />
        ))}
      </View>
    </TouchableOpacity>
  );
}

const calStyle = StyleSheet.create({
  cell:           { alignItems: 'center', justifyContent: 'flex-start', paddingTop: 2 },
  dayCircle:      { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  todayCircle:    { backgroundColor: colors.primary },
  selectedCircle: { backgroundColor: '#EDE9FE' },
  dayText:        { fontSize: 14, color: '#374151' },
  todayText:      { color: '#fff', fontWeight: '800' },
  selectedText:   { color: colors.primary, fontWeight: '700' },
  dotsRow:        { flexDirection: 'row', gap: 2, marginTop: 2, height: 6, alignItems: 'center' },
  dot:            { width: 4, height: 4, borderRadius: 2 },
});

// ─── 일정 카드 ──────────────────────────────────────────────

function ScheduleCard({ item, onDelete }: { item: ScheduleItem; onDelete: () => void }) {
  function handlePress() {
    Alert.alert(item.title, `${item.type} · ${item.time}`, [
      { text: '취소', style: 'cancel' },
      { text: '삭제', style: 'destructive', onPress: onDelete },
    ]);
  }

  return (
    <TouchableOpacity style={schedCard.wrapper} onPress={handlePress} activeOpacity={0.8}>
      <View style={[schedCard.iconBg, { backgroundColor: item.iconBg }]}>
        <Text style={schedCard.icon}>{TYPE_ICON[item.type] ?? '📌'}</Text>
      </View>
      <View style={schedCard.body}>
        <Text style={[schedCard.type, { color: item.color }]}>{item.type}</Text>
        <Text style={schedCard.title}>{item.title}</Text>
      </View>
      <View style={[schedCard.timeBadge, { backgroundColor: item.iconBg }]}>
        <Text style={[schedCard.time, { color: item.color }]}>{item.time}</Text>
      </View>
    </TouchableOpacity>
  );
}

const schedCard = StyleSheet.create({
  wrapper:   { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 10, gap: 12, ...shadows.card },
  iconBg:    { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  icon:      { fontSize: 20 },
  body:      { flex: 1, gap: 3 },
  type:      { ...typography.status },
  title:     { ...typography.bodyStrong, color: tokens.ink },
  timeBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  time:      { ...typography.metadata, fontWeight: '600' },
});

// ─── 메인 화면 ──────────────────────────────────────────────

export default function ScheduleScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState(today.getDate());

  const { data, refetch } = useScheduleData(user?.id, year, month);
  const { schedulesVersion } = useRealtime();
  useEffect(() => { refetch(); }, [schedulesVersion]); // eslint-disable-line react-hooks/exhaustive-deps
  const [showAddModal, setShowAddModal] = useState(false);

  async function handleDeleteSchedule(id: string) {
    await supabase.from('schedules').delete().eq('id', id);
    refetch();
  }

  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth();
  const grid = getCalendarGrid(year, month);
  const schedules = data.schedulesByDate[selectedDay] ?? [];

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
    setSelectedDay(1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
    setSelectedDay(1);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* 헤더 */}
      <View style={styles.header}>
        <View style={styles.monthNav}>
          <TouchableOpacity style={styles.navBtn} onPress={prevMonth} activeOpacity={0.7}>
            <Text style={styles.navArrow}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.monthTitle}>{year}년 {MONTH_NAMES[month]}</Text>
          <TouchableOpacity style={styles.navBtn} onPress={nextMonth} activeOpacity={0.7}>
            <Text style={styles.navArrow}>›</Text>
          </TouchableOpacity>
        </View>
        {/* PLAN_GATE: schedule management — full calendar/schedule tracking is a paid feature */}
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddModal(true)} activeOpacity={0.85}>
          <Text style={styles.addBtnText}>＋ 일정 추가</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} />}
      >
        {/* 달력 */}
        <View style={styles.calendarCard}>
          <View style={styles.weekRow}>
            {WEEKDAYS.map((d, i) => (
              <View key={d} style={{ width: DAY_SIZE, alignItems: 'center' }}>
                <Text style={[styles.weekday, i === 0 && styles.weekdaySun, i === 6 && styles.weekdaySat]}>{d}</Text>
              </View>
            ))}
          </View>
          {Array.from({ length: grid.length / 7 }, (_, row) => (
            <View key={row} style={styles.weekRow}>
              {grid.slice(row * 7, row * 7 + 7).map((day, col) => (
                <DayCell
                  key={col}
                  day={day}
                  isToday={isCurrentMonth && day === today.getDate()}
                  isSelected={day === selectedDay}
                  dots={day ? (data.dotEvents[day] ?? []) : []}
                  onPress={() => day && setSelectedDay(day)}
                />
              ))}
            </View>
          ))}
        </View>

        {/* 선택된 날짜 일정 */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {month + 1}월 {selectedDay}일 일정{' '}
            <Text style={styles.sectionCountInline}>{schedules.length}개</Text>
          </Text>
        </View>

        {schedules.length === 0 ? (
          <View style={styles.emptySchedule}>
            <Text style={styles.emptyIcon}>📅</Text>
            <Text style={styles.emptyText}>이 날 등록된 일정이 없어요</Text>
            <Text style={styles.emptySubText}>협찬 마감, 업로드, 미팅 일정을 추가해보세요</Text>
            <TouchableOpacity style={styles.emptyAddBtn} onPress={() => setShowAddModal(true)} activeOpacity={0.85}>
              <Text style={styles.emptyAddBtnText}>일정 추가하기</Text>
            </TouchableOpacity>
          </View>
        ) : (
          schedules.map((item) => (
            <ScheduleCard key={item.id} item={item} onDelete={() => handleDeleteSchedule(item.id)} />
          ))
        )}

        {/* 이번 주 요약 */}
        {data.weekSummary.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>이번 주 요약</Text>
            </View>
            <View style={styles.weekSummary}>
              {data.weekSummary.map((ws) => (
                <View key={ws.label} style={[styles.weekItem, { backgroundColor: ws.bg }]}>
                  <Text style={[styles.weekCount, { color: ws.color }]}>{ws.count}개</Text>
                  <Text style={[styles.weekLabel, { color: ws.color }]}>{ws.label}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* 일정 추가 모달 */}
      {user && (
        <AddScheduleModal
          visible={showAddModal}
          userId={user.id}
          defaultDate={[year, String(month + 1).padStart(2, '0'), String(selectedDay).padStart(2, '0')].join('-')}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => { setShowAddModal(false); refetch(); }}
        />
      )}

      {/* 플로팅 버튼 */}
      <TouchableOpacity style={[styles.fab, { bottom: insets.bottom + 88 }]} onPress={() => setShowAddModal(true)} activeOpacity={0.85}>
        <Text style={styles.fabText}>＋</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: tokens.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16 },
  monthNav:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  navBtn:     { width: 32, height: 32, borderRadius: 10, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...shadows.subtle },
  navArrow:   { fontSize: 22, color: tokens.ink2, lineHeight: 26 },
  monthTitle: { ...typography.navTitle, color: tokens.ink, minWidth: 100, textAlign: 'center' },
  addBtn:     { backgroundColor: colors.primary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, shadowColor: colors.primary, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 3 },
  addBtnText: { ...typography.buttonSm, color: '#fff' },
  scroll:     { paddingHorizontal: 20 },
  calendarCard: { backgroundColor: '#fff', borderRadius: 20, padding: 14, marginBottom: 20, ...shadows.card },
  weekRow:    { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  weekday:    { ...typography.label, color: tokens.ink4, paddingVertical: 6 },
  weekdaySun: { color: '#EF4444' },
  weekdaySat: { color: '#3B82F6' },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionTitle:  { ...typography.sectionTitle, color: tokens.ink },
  sectionCountInline: { ...typography.sectionTitle, color: colors.primary },
  emptySchedule: { alignItems: 'center', paddingVertical: 28, backgroundColor: '#fff', borderRadius: 14, marginBottom: 20, gap: 6 },
  emptyIcon:    { fontSize: 32 },
  emptyText:    { ...typography.bodyStrong, color: tokens.ink2 },
  emptySubText: { ...typography.metadata, color: tokens.ink4, textAlign: 'center' },
  emptyAddBtn:  { marginTop: 8, backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
  emptyAddBtnText: { ...typography.buttonSm, color: '#fff' },
  weekSummary: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  weekItem:   { flex: 1, borderRadius: 14, paddingVertical: 14, alignItems: 'center', gap: 4 },
  weekCount:  { fontSize: 20, fontWeight: '800' },
  weekLabel:  { ...typography.status },
  fab: { position: 'absolute', right: 20, width: 52, height: 52, borderRadius: 26, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 6 },
  fabText: { fontSize: 24, color: '#fff', fontWeight: '300', lineHeight: 28 },
});
