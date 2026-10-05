// src/utils/adAvailability.ts 단위 테스트 (의존성 없이 Node 내장 테스트 러너 사용)
// 실행: npm run test:availability
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  AVAILABILITY_FRESH_DAYS, isAvailabilityFresh, getAvailabilityDisplayState,
  formatConfirmedDate, isValidDateString, noteLength, validateAvailabilitySchedule,
  toAvailabilityDraft, toAvailabilityUpdate, isAvailabilityDirty, RECONFIRM_SIGNAL,
} from '../src/utils/adAvailability.ts';

const DAY = 86_400_000;
const NOW = Date.parse('2026-10-05T12:00:00Z');
const ago = (ms) => new Date(NOW - ms).toISOString();

test('신선도: null·빈 값·파싱 불가는 신선하지 않음', () => {
  assert.equal(isAvailabilityFresh(null, NOW), false);
  assert.equal(isAvailabilityFresh(undefined, NOW), false);
  assert.equal(isAvailabilityFresh('', NOW), false);
  assert.equal(isAvailabilityFresh('not-a-date', NOW), false);
});

test('신선도: 30일 경계 — 정확히 30일은 신선, 1ms라도 넘으면 확인 필요', () => {
  assert.equal(AVAILABILITY_FRESH_DAYS, 30);
  assert.equal(isAvailabilityFresh(ago(0), NOW), true);
  assert.equal(isAvailabilityFresh(ago(29 * DAY), NOW), true);
  assert.equal(isAvailabilityFresh(ago(30 * DAY), NOW), true);
  assert.equal(isAvailabilityFresh(ago(30 * DAY + 1), NOW), false);
  assert.equal(isAvailabilityFresh(ago(31 * DAY), NOW), false);
});

test('신선도: 실제 시간차 기준 — 시간대 표기가 달라도 같은 순간이면 같은 결과', () => {
  const utc = '2026-09-05T12:00:00Z';          // NOW - 30일 정각
  const kst = '2026-09-05T21:00:00+09:00';     // 같은 순간 (KST)
  assert.equal(isAvailabilityFresh(utc, NOW), true);
  assert.equal(isAvailabilityFresh(kst, NOW), true);
  assert.equal(isAvailabilityFresh('2026-09-05T20:59:59+09:00', NOW), false); // 1초 초과
});

test('신선도: 미래 시각 — 5분 이내 시계 오차는 허용, 그 이상은 비정상으로 신선하지 않음', () => {
  assert.equal(isAvailabilityFresh(new Date(NOW + 60_000).toISOString(), NOW), true);
  assert.equal(isAvailabilityFresh(new Date(NOW + 10 * 60_000).toISOString(), NOW), false);
  assert.equal(isAvailabilityFresh(new Date(NOW + 365 * DAY).toISOString(), NOW), false);
});

test('표시 상태: NULL / 최신 accepting / 최신 not_accepting / 30일 초과는 상태와 무관하게 stale', () => {
  assert.equal(getAvailabilityDisplayState(null, null, NOW), 'unset');
  assert.equal(getAvailabilityDisplayState(null, ago(DAY), NOW), 'unset');
  assert.equal(getAvailabilityDisplayState('accepting', ago(DAY), NOW), 'accepting');
  assert.equal(getAvailabilityDisplayState('not_accepting', ago(DAY), NOW), 'not_accepting');
  assert.equal(getAvailabilityDisplayState('accepting', ago(31 * DAY), NOW), 'stale');
  assert.equal(getAvailabilityDisplayState('not_accepting', ago(31 * DAY), NOW), 'stale');
  assert.equal(getAvailabilityDisplayState('accepting', null, NOW), 'stale'); // 확인 기록 없는 상태는 단정 금지
});

test('확인일 표시: "M월 D일", 없거나 파싱 불가면 null', () => {
  assert.match(formatConfirmedDate('2026-10-05T03:00:00Z'), /^\d{1,2}월 \d{1,2}일$/);
  assert.equal(formatConfirmedDate(null), null);
  assert.equal(formatConfirmedDate('x'), null);
});

test('날짜 문자열: 형식과 실재 날짜 검증', () => {
  assert.equal(isValidDateString('2026-10-20'), true);
  assert.equal(isValidDateString('2028-02-29'), true);
  assert.equal(isValidDateString('2026-02-29'), false);
  assert.equal(isValidDateString('2026-13-01'), false);
  assert.equal(isValidDateString('2026-1-5'), false);
  assert.equal(isValidDateString('20261020'), false);
  assert.equal(isValidDateString(''), false);
});

test('메모 길이: DB char_length와 같은 코드 포인트 기준', () => {
  assert.equal(noteLength('가나다'), 3);
  assert.equal(noteLength('😀😀'), 2); // String.length는 4
});

test('일정 검증: 시작일/종료일 NULL 허용, 종료일 < 시작일 차단, 같은 날 허용', () => {
  assert.equal(validateAvailabilitySchedule({ from: null, until: null, note: '' }), null);
  assert.equal(validateAvailabilitySchedule({ from: '2026-10-10', until: null, note: '' }), null);
  assert.equal(validateAvailabilitySchedule({ from: null, until: '2026-10-10', note: '' }), null);
  assert.equal(validateAvailabilitySchedule({ from: '2026-10-10', until: '2026-10-10', note: '' }), null);
  assert.notEqual(validateAvailabilitySchedule({ from: '2026-10-10', until: '2026-10-09', note: '' }), null);
  assert.notEqual(validateAvailabilitySchedule({ from: '2026-10-1', until: null, note: '' }), null);
});

test('일정 검증: 메모 100자 허용, 101자 차단 (앞뒤 공백은 저장 시 제거되므로 제외)', () => {
  assert.equal(validateAvailabilitySchedule({ from: null, until: null, note: '가'.repeat(100) }), null);
  assert.equal(validateAvailabilitySchedule({ from: null, until: null, note: `  ${'가'.repeat(100)}  ` }), null);
  assert.notEqual(validateAvailabilitySchedule({ from: null, until: null, note: '가'.repeat(101) }), null);
  assert.notEqual(validateAvailabilitySchedule({ from: null, until: null, note: '😀'.repeat(101) }), null);
});

// ── 저장 payload / 변경 감지 ──────────────────────────────────
const NULL_ROW = { ad_availability: null, ad_availability_confirmed_at: null, available_from: null, available_until: null, availability_note: null };
const draft = (over) => ({ ...toAvailabilityDraft(null), ...over });

test('초기 NULL 사용자: 아무 상태도 자동 선택하지 않고, 저장할 변경도 없음', () => {
  const d = toAvailabilityDraft(NULL_ROW);
  assert.equal(d.status, null);
  assert.equal(isAvailabilityDirty(d, NULL_ROW), false);
  assert.equal(toAvailabilityDraft(null).status, null);
});

test('accepting 저장: 지금부터·종료일 없음은 NULL, is_form_enabled=true, confirmed_at은 보내지 않음', () => {
  const p = toAvailabilityUpdate(draft({ status: 'accepting' }));
  assert.deepEqual(p, { ad_availability: 'accepting', available_from: null, available_until: null, availability_note: null, is_form_enabled: true });
  assert.equal('ad_availability_confirmed_at' in p, false);
});

test('accepting + 일정: 날짜 모드일 때만 날짜 저장, 메모는 앞뒤 공백 제거', () => {
  const p = toAvailabilityUpdate(draft({
    status: 'accepting', fromMode: 'date', from: ' 2026-10-20 ', untilMode: 'date', until: '2026-11-30', note: '  평일 촬영 가능  ',
  }));
  assert.equal(p.available_from, '2026-10-20');
  assert.equal(p.available_until, '2026-11-30');
  assert.equal(p.availability_note, '평일 촬영 가능');
  // 모드가 now/none이면 입력해 둔 날짜가 있어도 NULL
  const q = toAvailabilityUpdate(draft({ status: 'accepting', fromMode: 'now', from: '2026-10-20', untilMode: 'none', until: '2026-11-30' }));
  assert.equal(q.available_from, null);
  assert.equal(q.available_until, null);
});

test('not_accepting 저장: 일정 3개 NULL 정리 + is_form_enabled=false', () => {
  const p = toAvailabilityUpdate(draft({
    status: 'not_accepting', fromMode: 'date', from: '2026-10-20', untilMode: 'date', until: '2026-11-30', note: '이전 메모',
  }));
  assert.deepEqual(p, { ad_availability: 'not_accepting', available_from: null, available_until: null, availability_note: null, is_form_enabled: false });
});

test('변경 감지: 저장값과 같으면 false(→ 재확인 버튼), 다르면 true(→ 저장 버튼)', () => {
  const saved = { ...NULL_ROW, ad_availability: 'accepting', ad_availability_confirmed_at: '2026-10-01T00:00:00Z', available_from: '2026-10-20' };
  const d = toAvailabilityDraft(saved);
  assert.equal(isAvailabilityDirty(d, saved), false);
  assert.equal(isAvailabilityDirty({ ...d, note: '새 메모' }, saved), true);
  assert.equal(isAvailabilityDirty({ ...d, fromMode: 'now' }, saved), true);
  assert.equal(isAvailabilityDirty({ ...d, status: 'not_accepting' }, saved), true);
  assert.equal(isAvailabilityDirty({ ...d, note: '   ' }, saved), false); // 공백만 → NULL과 같음
});

test('재확인 신호: 실제 시각이 아닌 고정 신호값 (트리거가 서버 now()로 덮어씀)', () => {
  assert.equal(RECONFIRM_SIGNAL, '1970-01-01T00:00:00Z');
});
