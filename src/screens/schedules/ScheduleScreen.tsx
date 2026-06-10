import { Text } from '@/components/Text';
import React, { useState, useEffect } from 'react';
import {
  View, ScrollView, TouchableOpacity,
  StyleSheet, RefreshControl, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth';
import { useScheduleData, ScheduleItem } from '../../hooks/useScheduleData';
import { useRealtime } from '../../context/RealtimeContext';
import AddScheduleModal from './AddScheduleModal';
import { supabase } from '../../api/supabase';
import { theme } from '../../constants/theme';

const { colors, space, radius, shadows, typography } = theme;

const { width } = Dimensions.get('window');
const GRID_W = width - space.screen * 2;
const CELL_W = Math.floor(GRID_W / 7);

const KO_DAYS  = ['일', '월', '화', '수', '목', '금', '토'];
const MONTH_KO = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];

type ViewMode = 'week' | 'month';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getWeekDates(anchor: Date): Date[] {
  const dow = anchor.getDay();
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(anchor);
    d.setDate(anchor.getDate() - dow + i);
    return d;
  });
}

function getMonthGrid(year: number, month: number): (Date | null)[] {
  const firstDay = new Date(year, month, 1);
  const lastDay  = new Date(year, month + 1, 0);
  const grid: (Date | null)[] = [];
  for (let i = 0; i < firstDay.getDay(); i++) grid.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) grid.push(new Date(year, month, d));
  while (grid.length % 7 !== 0) grid.push(null);
  return grid;
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

// ─── Week Day Cell ────────────────────────────────────────────────────────────

function WeekDayCell({ date, isToday, isSelected, hasDot, onPress }: {
  date: Date; isToday: boolean; isSelected: boolean; hasDot: boolean; onPress: () => void;
}) {
  return (
    <TouchableOpacity style={dc.wrap} onPress={onPress} activeOpacity={0.7}>
      <Text style={[dc.dow, isToday && dc.active, isSelected && !isToday && dc.selected]}>
        {KO_DAYS[date.getDay()]}
      </Text>
      <View style={[dc.circle, isToday && dc.circleToday, isSelected && !isToday && dc.circleSelected]}>
        <Text style={[dc.num, isToday && dc.numToday, isSelected && !isToday && dc.numSelected]}>
          {date.getDate()}
        </Text>
      </View>
      <View style={[dc.dot, { backgroundColor: hasDot ? colors.brand.default : 'transparent' }]} />
    </TouchableOpacity>
  );
}

const dc = StyleSheet.create({
  wrap:          { width: CELL_W, alignItems: 'center', gap: 4 },
  dow:           { ...typography.micro, color: colors.text.tertiary },
  active:        { color: colors.brand.default },
  selected:      { color: colors.text.primary },
  circle:        { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  circleToday:   { backgroundColor: colors.text.primary },
  circleSelected:{ backgroundColor: colors.border.faint },
  num:           { ...typography.caption, color: colors.text.primary, fontWeight: '500' },
  numToday:      { color: '#fff', fontWeight: '700' },
  numSelected:   { color: colors.text.primary, fontWeight: '700' },
  dot:           { width: 4, height: 4, borderRadius: 2 },
});

// ─── Month Cell ───────────────────────────────────────────────────────────────

function MonthCell({ date, isToday, isSelected, hasDot, onPress }: {
  date: Date | null; isToday: boolean; isSelected: boolean; hasDot: boolean; onPress: () => void;
}) {
  if (!date) return <View style={mc.empty} />;
  return (
    <TouchableOpacity style={mc.wrap} onPress={onPress} activeOpacity={0.7}>
      <View style={[mc.circle, isToday && mc.circleToday, isSelected && !isToday && mc.circleSelected]}>
        <Text style={[mc.num, isToday && mc.numToday, isSelected && !isToday && mc.numSelected]}>
          {date.getDate()}
        </Text>
      </View>
      <View style={[mc.dot, { backgroundColor: hasDot ? colors.brand.default : 'transparent' }]} />
    </TouchableOpacity>
  );
}

const mc = StyleSheet.create({
  empty:         { width: CELL_W, height: 44 },
  wrap:          { width: CELL_W, height: 44, alignItems: 'center', justifyContent: 'center', gap: 2 },
  circle:        { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  circleToday:   { backgroundColor: colors.text.primary },
  circleSelected:{ backgroundColor: colors.border.faint },
  num:           { fontSize: 13, color: colors.text.primary, fontWeight: '400' },
  numToday:      { color: '#fff', fontWeight: '700' },
  numSelected:   { color: colors.text.primary, fontWeight: '700' },
  dot:           { width: 4, height: 4, borderRadius: 2 },
});

// ─── Timeline Row ─────────────────────────────────────────────────────────────

const EVENT_COLORS: Record<string, string> = {
  '업로드 예정': colors.brand.default,
  '협찬 마감':   '#C48A40',
  '미팅':        colors.ai.from,
  '기타':        colors.text.muted,
};

function TimelineRow({ item, isHighlight, onDelete }: {
  item: ScheduleItem; isHighlight: boolean; onDelete: () => void;
}) {
  const dotColor = EVENT_COLORS[item.type] ?? colors.text.muted;
  return (
    <TouchableOpacity style={tl.row} onLongPress={onDelete} activeOpacity={0.85} delayLongPress={600}>
      <Text style={tl.time}>{item.time}</Text>
      <View style={tl.line}>
        <View style={[tl.dot, { backgroundColor: isHighlight ? '#C48A40' : dotColor }]} />
        <View style={[tl.track, { backgroundColor: colors.border.faint }]} />
      </View>
      <View style={tl.body}>
        <Text style={tl.title}>{item.title}</Text>
        <Text style={tl.sub}>{item.type}</Text>
      </View>
    </TouchableOpacity>
  );
}

const tl = StyleSheet.create({
  row:   { flexDirection: 'row', gap: space.md, paddingVertical: space.sm + 2, alignItems: 'flex-start' },
  time:  { ...typography.micro, color: colors.text.tertiary, width: 38, textAlign: 'right', lineHeight: 15, marginTop: 3 },
  line:  { alignItems: 'center', width: 12 },
  dot:   { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  track: { flex: 1, width: 1, marginTop: 4 },
  body:  { flex: 1, paddingBottom: space.sm },
  title: { ...typography.bodyStrong, color: colors.text.primary },
  sub:   { ...typography.caption, color: colors.text.tertiary, marginTop: 1 },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ScheduleScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const today = new Date();

  const [viewMode, setViewMode]       = useState<ViewMode>('week');
  const [anchor, setAnchor]           = useState(today);
  const [selectedDay, setSelectedDay] = useState(today);

  const year  = anchor.getFullYear();
  const month = anchor.getMonth();

  const { data, refetch } = useScheduleData(user?.id, year, month);
  const { schedulesVersion } = useRealtime();
  useEffect(() => { refetch(); }, [schedulesVersion]); // eslint-disable-line

  const [showAddModal, setShowAddModal] = useState(false);

  const weekDates  = getWeekDates(anchor);
  const monthGrid  = getMonthGrid(year, month);
  const selectedItems = data.schedulesByDate[selectedDay.getDate()] ?? [];

  const otherGroups = viewMode === 'week'
    ? weekDates
        .filter((d) => !isSameDay(d, selectedDay))
        .map((d) => ({ date: d, items: data.schedulesByDate[d.getDate()] ?? [] }))
        .filter((g) => g.items.length > 0)
    : [];

  async function handleDelete(id: string) {
    await supabase.from('schedules').delete().eq('id', id);
    refetch();
  }

  function prevPeriod() {
    const d = new Date(anchor);
    if (viewMode === 'week') d.setDate(d.getDate() - 7);
    else d.setMonth(d.getMonth() - 1);
    setAnchor(d);
  }

  function nextPeriod() {
    const d = new Date(anchor);
    if (viewMode === 'week') d.setDate(d.getDate() + 7);
    else d.setMonth(d.getMonth() + 1);
    setAnchor(d);
  }

  function periodLabel() {
    if (viewMode === 'month') return `${year}년 ${MONTH_KO[month]}`;
    const s = weekDates[0];
    const e = weekDates[6];
    if (s.getMonth() === e.getMonth()) return `${year}년 ${MONTH_KO[s.getMonth()]}`;
    return `${MONTH_KO[s.getMonth()]}~${MONTH_KO[e.getMonth()]}`;
  }

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      {/* 헤더 */}
      <View style={s.header}>
        <View style={{ width: 32 }} />
        <Text style={s.title}>일정</Text>
        <TouchableOpacity style={s.addBtn} onPress={() => setShowAddModal(true)} activeOpacity={0.7}>
          <Text style={s.addBtnText}>＋</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={s.scroll}
        refreshControl={<RefreshControl refreshing={false} onRefresh={refetch} />}
      >
        {/* 네비게이션 바 */}
        <View style={s.navBar}>
          <TouchableOpacity onPress={prevPeriod} style={s.navArrow} activeOpacity={0.7}>
            <Text style={s.navArrowText}>‹</Text>
          </TouchableOpacity>
          <Text style={s.navLabel}>{periodLabel()}</Text>
          <TouchableOpacity onPress={nextPeriod} style={s.navArrow} activeOpacity={0.7}>
            <Text style={s.navArrowText}>›</Text>
          </TouchableOpacity>
          {/* 주/월 토글 */}
          <View style={s.toggle}>
            {(['week', 'month'] as ViewMode[]).map((m) => (
              <TouchableOpacity
                key={m}
                style={[s.toggleBtn, viewMode === m && s.toggleBtnActive]}
                onPress={() => setViewMode(m)}
                activeOpacity={0.7}
              >
                <Text style={[s.toggleText, viewMode === m && s.toggleTextActive]}>
                  {m === 'week' ? '주' : '월'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 요일 헤더 (월간만) */}
        {viewMode === 'month' && (
          <View style={s.dowHeader}>
            {KO_DAYS.map((d) => (
              <Text key={d} style={[s.dowLabel, d === '일' && { color: '#EF4444' }, d === '토' && { color: '#3D5AFE' }]}>
                {d}
              </Text>
            ))}
          </View>
        )}

        {/* 주간 스트립 */}
        {viewMode === 'week' && (
          <View style={s.weekStrip}>
            {weekDates.map((d, i) => (
              <WeekDayCell
                key={i}
                date={d}
                isToday={isSameDay(d, today)}
                isSelected={isSameDay(d, selectedDay)}
                hasDot={(data.dotEvents[d.getDate()] ?? []).length > 0}
                onPress={() => { setSelectedDay(d); setAnchor(d); }}
              />
            ))}
          </View>
        )}

        {/* 월간 그리드 */}
        {viewMode === 'month' && (
          <View style={s.monthGrid}>
            {monthGrid.map((d, i) => (
              <MonthCell
                key={i}
                date={d}
                isToday={!!d && isSameDay(d, today)}
                isSelected={!!d && isSameDay(d, selectedDay)}
                hasDot={!!d && (data.dotEvents[d.getDate()] ?? []).length > 0}
                onPress={() => { if (d) { setSelectedDay(d); setAnchor(d); } }}
              />
            ))}
          </View>
        )}

        {/* 선택된 날 타임라인 */}
        <Text style={s.dateHeader}>
          {selectedDay.getMonth() + 1}월 {selectedDay.getDate()}일 · {KO_DAYS[selectedDay.getDay()]}요일
        </Text>
        {selectedItems.length > 0 ? (
          selectedItems.map((item, i) => (
            <TimelineRow
              key={item.id}
              item={item}
              isHighlight={i === 0 && isSameDay(selectedDay, today)}
              onDelete={() => handleDelete(item.id)}
            />
          ))
        ) : (
          <View style={s.empty}>
            <Text style={s.emptyText}>이 날 일정이 없어요</Text>
            <TouchableOpacity onPress={() => setShowAddModal(true)} activeOpacity={0.7}>
              <Text style={s.emptyAdd}>＋ 일정 추가</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 이번 주 나머지 날 (주간 모드만) */}
        {otherGroups.map((group) => (
          <React.Fragment key={group.date.toISOString()}>
            <Text style={s.dateHeader}>
              {group.date.getMonth() + 1}월 {group.date.getDate()}일 · {KO_DAYS[group.date.getDay()]}요일
            </Text>
            {group.items.map((item) => (
              <TimelineRow key={item.id} item={item} isHighlight={false} onDelete={() => handleDelete(item.id)} />
            ))}
          </React.Fragment>
        ))}

        <View style={{ height: 100 }} />
      </ScrollView>

      {user && (
        <AddScheduleModal
          visible={showAddModal}
          userId={user.id}
          defaultDate={[
            selectedDay.getFullYear(),
            String(selectedDay.getMonth() + 1).padStart(2, '0'),
            String(selectedDay.getDate()).padStart(2, '0'),
          ].join('-')}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => { setShowAddModal(false); refetch(); }}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: space.screen, paddingVertical: space.lg },
  title:  { ...typography.navTitle, color: colors.text.primary },
  addBtn: { width: 32, height: 32, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border.faint, alignItems: 'center', justifyContent: 'center', ...shadows.sm },
  addBtnText: { fontSize: 18, color: colors.text.primary, lineHeight: 22, fontWeight: '400' },

  scroll: { paddingHorizontal: space.screen },

  navBar: { flexDirection: 'row', alignItems: 'center', marginBottom: space.md, gap: space.sm },
  navArrow:     { padding: 4 },
  navArrowText: { fontSize: 22, color: colors.text.primary, lineHeight: 26 },
  navLabel:     { ...typography.bodyStrong, color: colors.text.primary, flex: 1, textAlign: 'center' },
  toggle:       { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: radius.sm + 2, borderWidth: 1, borderColor: colors.border.faint, overflow: 'hidden' },
  toggleBtn:    { paddingHorizontal: 10, paddingVertical: 5 },
  toggleBtnActive: { backgroundColor: colors.text.primary },
  toggleText:      { ...typography.caption, color: colors.text.secondary, fontWeight: '600' },
  toggleTextActive:{ color: '#fff' },

  dowHeader: { flexDirection: 'row', marginBottom: space.xs },
  dowLabel:  { width: CELL_W, textAlign: 'center', ...typography.micro, color: colors.text.tertiary, fontWeight: '600' },

  weekStrip: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border.faint, padding: space.md, marginBottom: space.xl, ...shadows.sm },
  monthGrid: { flexDirection: 'row', flexWrap: 'wrap', backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border.faint, paddingVertical: space.sm, marginBottom: space.xl, ...shadows.sm },

  dateHeader: { ...typography.sectionTitle, color: colors.text.primary, marginTop: space.lg, marginBottom: space.sm },
  empty:      { paddingVertical: space.xxl, alignItems: 'center', gap: space.sm },
  emptyText:  { ...typography.body, color: colors.text.muted },
  emptyAdd:   { ...typography.body, color: colors.brand.default, fontWeight: '600' },
});
