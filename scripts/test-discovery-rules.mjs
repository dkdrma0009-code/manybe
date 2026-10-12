// 광고주 탐색 규칙(web/lib/adAvailability.ts) 테스트 + 앱 canonical 신선도와의 일치 검사
// 실행: npm run test:discovery
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as app from '../src/utils/adAvailability.ts';
import {
  AVAILABILITY_FRESH_DAYS, isAvailabilityFresh, getAvailabilityReason, evaluateAdAvailability,
  isPubliclyAvailable, AVAILABILITY_COPY, getAvailabilityDetail, totalAudience, sortDiscoveryCandidates,
} from '../web/lib/adAvailability.ts';

const SEC = 1000;
const MIN = 60 * SEC;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const NOW = Date.parse('2026-10-12T03:00:00Z');
const at = (offsetMs) => new Date(NOW + offsetMs).toISOString(); // 음수 = 과거, 양수 = 미래

// [이름, confirmed_at, 기대 신선도] — 앱·웹 양쪽에 같은 fixture 적용
const FRESHNESS_CASES = [
  ['now', at(0), true],
  ['29일 23시간 전', at(-(29 * DAY + 23 * HOUR)), true],
  ['정확히 30일 전 (경계 포함)', at(-30 * DAY), true],
  ['30일 + 1ms 전', at(-30 * DAY - 1), false],
  ['미래 4분59초 (시계 오차 허용)', at(4 * MIN + 59 * SEC), true],
  ['미래 정확히 5분 (허용 경계)', at(5 * MIN), true],
  ['미래 5분01초 (비정상)', at(5 * MIN + 1 * SEC), false],
  ['confirmed_at NULL', null, false],
  ['undefined', undefined, false],
  ['빈 문자열', '', false],
  ['파싱 불가', 'not-a-date', false],
];

test('신선도: 경계 케이스 (웹)', () => {
  assert.equal(AVAILABILITY_FRESH_DAYS, 30);
  for (const [name, v, expected] of FRESHNESS_CASES) assert.equal(isAvailabilityFresh(v, NOW), expected, name);
});

test('앱·웹 parity: 같은 입력에 같은 신선도, 같은 기준 일수', () => {
  assert.equal(AVAILABILITY_FRESH_DAYS, app.AVAILABILITY_FRESH_DAYS);
  for (const [name, v] of FRESHNESS_CASES) {
    assert.equal(isAvailabilityFresh(v, NOW), app.isAvailabilityFresh(v, NOW), name);
  }
  // 1분 간격으로 -31일 ~ +10분 전 구간 스캔
  for (let off = -31 * DAY; off <= 10 * MIN; off += MIN) {
    assert.equal(isAvailabilityFresh(at(off), NOW), app.isAvailabilityFresh(at(off), NOW), String(off));
  }
});

test('앱·웹 parity: 앱 표시 상태와 웹 해석이 대응', () => {
  const map = { accepting_fresh: 'accepting', not_accepting_fresh: 'not_accepting', accepting_stale: 'stale', not_accepting_stale: 'stale', unset: 'unset' };
  for (const status of [null, 'accepting', 'not_accepting']) {
    for (const [name, v] of FRESHNESS_CASES) {
      assert.equal(map[getAvailabilityReason(status, v, NOW)], app.getAvailabilityDisplayState(status, v, NOW), `${status} ${name}`);
    }
  }
});

const FRESH = at(-1 * DAY);
const STALE = at(-31 * DAY);
// [이름, status, confirmed_at, reason, group, proposal, public]
const STATES = [
  ['accepting fresh',     'accepting',     FRESH, 'accepting_fresh',     'available',          'allow',              true],
  ['accepting stale',     'accepting',     STALE, 'accepting_stale',     'needs_confirmation', 'allow_with_warning', false],
  ['not_accepting fresh', 'not_accepting', FRESH, 'not_accepting_fresh', 'excluded',           'block',              false],
  ['not_accepting stale', 'not_accepting', STALE, 'not_accepting_stale', 'needs_confirmation', 'allow_with_warning', false],
  ['availability NULL',   null,            null,  'unset',               'needs_confirmation', 'allow_with_warning', false],
];

test('상태 5종: reason·탐색 그룹·제안 허용·공개 여부', () => {
  for (const [name, s, c, reason, group, proposal, pub] of STATES) {
    assert.deepEqual(evaluateAdAvailability(s, c, NOW), { reason, group, proposal, publiclyAvailable: pub }, name);
  }
});

test('상태는 있으나 confirmed_at 없음·비정상 미래 → 확인 필요', () => {
  assert.equal(getAvailabilityReason('accepting', null, NOW), 'accepting_stale');
  assert.equal(getAvailabilityReason('not_accepting', null, NOW), 'not_accepting_stale');
  assert.equal(getAvailabilityReason('accepting', at(6 * MIN), NOW), 'accepting_stale');
  assert.equal(evaluateAdAvailability('not_accepting', at(6 * MIN), NOW).proposal, 'allow_with_warning');
});

test('NULL 상태는 confirmed_at이 있어도 unset', () => {
  assert.equal(getAvailabilityReason(null, FRESH, NOW), 'unset');
});

test('공개 boolean: accepting fresh만 true', () => {
  const trues = STATES.filter(([, s, c]) => isPubliclyAvailable(s, c, NOW)).map(([n]) => n);
  assert.deepEqual(trues, ['accepting fresh']);
  assert.equal(isPubliclyAvailable('accepting', at(-30 * DAY), NOW), true);
  assert.equal(isPubliclyAvailable('accepting', at(-30 * DAY - 1), NOW), false);
});

test('제안 허용: 5개 상태 정확 매핑', () => {
  const got = Object.fromEntries(STATES.map(([n, s, c]) => [n, evaluateAdAvailability(s, c, NOW).proposal]));
  assert.deepEqual(got, {
    'accepting fresh': 'allow',
    'accepting stale': 'allow_with_warning',
    'not_accepting fresh': 'block',
    'not_accepting stale': 'allow_with_warning',
    'availability NULL': 'allow_with_warning',
  });
});

test('문구: 배지·경고·차단 메시지', () => {
  assert.deepEqual(AVAILABILITY_COPY.accepting_fresh, { badge: '지금 협업 가능' });
  assert.equal(AVAILABILITY_COPY.accepting_stale.badge, '상태 확인 필요');
  assert.equal(AVAILABILITY_COPY.accepting_stale.warning, '최근 30일 내 광고 수신 의사 확인 기록이 없어요.\n응답이 늦을 수 있어요.');
  assert.equal(AVAILABILITY_COPY.unset.warning, '아직 광고 수신 여부를 설정하지 않은 크리에이터예요.');
  assert.equal(AVAILABILITY_COPY.not_accepting_stale.badge, '상태 확인 필요');
  assert.equal(AVAILABILITY_COPY.not_accepting_fresh.blocked, '현재 광고 제안을 받지 않는 크리에이터입니다.');
  // 경고가 필요한 상태 = allow_with_warning 인 상태와 정확히 일치
  for (const [n, s, c] of STATES) {
    const e = evaluateAdAvailability(s, c, NOW);
    assert.equal(!!AVAILABILITY_COPY[e.reason].warning, e.proposal === 'allow_with_warning', n);
    assert.equal(!!AVAILABILITY_COPY[e.reason].blocked, e.proposal === 'block', n);
  }
});

test('상세 문구: accepting fresh만, 한국 날짜 기준', () => {
  // 2026-10-11T16:30Z = 한국 10월 12일 01:30
  assert.equal(getAvailabilityDetail('accepting_fresh', '2026-10-11T16:30:00Z'), '광고 수신 중 · 10월 12일 확인');
  assert.equal(getAvailabilityDetail('accepting_stale', '2026-10-11T16:30:00Z'), null);
  assert.equal(getAvailabilityDetail('accepting_fresh', null), null);
});

test('총 audience: 합산, NULL·음수·비정상은 0', () => {
  assert.equal(totalAudience([{ subscriber_count: 1000 }, { subscriber_count: 250 }, { subscriber_count: null }]), 1250);
  assert.equal(totalAudience([{ subscriber_count: -5 }, { subscriber_count: NaN }, { subscriber_count: Infinity }, { subscriber_count: undefined }]), 0);
  assert.equal(totalAudience([]), 0);
  assert.equal(totalAudience(null), 0);
});

// ── 정렬 ──
const kit = (slug, o = {}) => ({
  slug, created_at: '2026-01-01T00:00:00Z', ad_availability: null, ad_availability_confirmed_at: null, totalAudience: 0, ...o,
});
const slugs = (list) => sortDiscoveryCandidates(list, NOW).map((k) => k.slug);

test('정렬: excluded(최근 거절) 제거', () => {
  assert.deepEqual(slugs([kit('a'), kit('no', { ad_availability: 'not_accepting', ad_availability_confirmed_at: FRESH })]), ['a']);
});

test('정렬: available이 확인 필요보다 항상 위 (audience·최신성 무관)', () => {
  const list = [
    kit('big-unset', { totalAudience: 10_000_000, created_at: '2026-10-01T00:00:00Z' }),
    kit('recent-stale', { ad_availability: 'accepting', ad_availability_confirmed_at: at(-31 * DAY), totalAudience: 5_000_000 }),
    kit('small-avail', { ad_availability: 'accepting', ad_availability_confirmed_at: at(-29 * DAY), totalAudience: 1 }),
  ];
  assert.equal(slugs(list)[0], 'small-avail');
});

test('정렬: 같은 그룹은 confirmed_at 최신순, NULL은 맨 뒤', () => {
  const acc = (slug, off) => kit(slug, { ad_availability: 'accepting', ad_availability_confirmed_at: at(off) });
  assert.deepEqual(slugs([acc('d3', -3 * DAY), acc('d1', -1 * DAY), acc('d2', -2 * DAY)]), ['d1', 'd2', 'd3']);
  const stale = [
    kit('unset'),
    kit('s40', { ad_availability: 'accepting', ad_availability_confirmed_at: at(-40 * DAY) }),
    kit('s35', { ad_availability: 'not_accepting', ad_availability_confirmed_at: at(-35 * DAY) }),
    kit('future-bad', { ad_availability: 'accepting', ad_availability_confirmed_at: at(1 * DAY) }), // 비정상 미래 → NULL 취급
  ];
  assert.deepEqual(slugs(stale), ['s35', 's40', 'future-bad', 'unset']);
});

test('정렬: confirmed_at 동일 → 총 audience 많은 순', () => {
  const c = { ad_availability: 'accepting', ad_availability_confirmed_at: FRESH };
  assert.deepEqual(slugs([kit('s', { ...c, totalAudience: 10 }), kit('l', { ...c, totalAudience: 1000 }), kit('m', { ...c, totalAudience: 100 })]), ['l', 'm', 's']);
});

test('정렬: audience 동일 → created_at 최신순, NULL은 뒤', () => {
  assert.deepEqual(slugs([
    kit('old', { created_at: '2026-01-01T00:00:00Z' }),
    kit('none', { created_at: null }),
    kit('new', { created_at: '2026-09-01T00:00:00Z' }),
  ]), ['new', 'old', 'none']);
});

test('정렬: 나머지 동일 → slug 사전순, 입력 순서와 무관하게 결정적', () => {
  const list = [kit('c'), kit('a'), kit('b')];
  assert.deepEqual(slugs(list), ['a', 'b', 'c']);
  assert.deepEqual(slugs([...list].reverse()), ['a', 'b', 'c']);
  assert.deepEqual(list.map((k) => k.slug), ['c', 'a', 'b']); // 입력 배열을 변경하지 않음
});

test('운영 현재 상태 fixture: 15명 모두 NULL', () => {
  const kits = Array.from({ length: 15 }, (_, i) => kit(`creator-${String(i).padStart(2, '0')}`));
  const ev = kits.map((k) => evaluateAdAvailability(k.ad_availability, k.ad_availability_confirmed_at, NOW));
  assert.equal(ev.filter((e) => e.publiclyAvailable).length, 0);
  assert.equal(ev.filter((e) => e.group === 'excluded').length, 0);
  assert.equal(ev.filter((e) => e.group === 'needs_confirmation').length, 15);
  assert.equal(ev.filter((e) => e.proposal === 'allow_with_warning').length, 15);
  assert.equal(sortDiscoveryCandidates(kits, NOW).length, 15);
});
