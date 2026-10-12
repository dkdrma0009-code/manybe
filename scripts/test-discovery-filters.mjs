// 광고주 /discover 필터 엔진(web/lib/discoveryFilters.ts) 테스트
// 실행: npm run test:discovery-filters
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  AUDIENCE_RANGES, getMinimumRate, filterAudience, getActiveFilterCount, filterDiscoveryCandidates,
} from '../web/lib/discoveryFilters.ts';
import { sortDiscoveryCandidates, totalAudience } from '../web/lib/adAvailability.ts';

const DAY = 86_400_000;
const NOW = Date.parse('2026-10-12T03:00:00Z');
const at = (offsetMs) => new Date(NOW + offsetMs).toISOString();
const FRESH = at(-1 * DAY);
const STALE = at(-31 * DAY);

const c = (slug, o = {}) => ({
  user_id: `u-${slug}`, slug, name: null, bio: null, category: null, pricing: null,
  created_at: '2026-01-01T00:00:00Z', ad_availability: null, ad_availability_confirmed_at: null, channels: [], ...o,
});
const ch = (platform, subscriber_count) => ({ platform, subscriber_count });
const run = (list, filters) => filterDiscoveryCandidates(list, filters, NOW).map((x) => x.slug);
const sorted = (arr) => [...arr].sort();

// ── KEYWORD ──
const people = [
  c('a', { name: '김유나', bio: '스킨케어 리뷰' }),
  c('b', { name: 'Minji Kim', bio: null }),
  c('d', { name: null, bio: 'Daily VLOG 크리에이터' }),
];

test('keyword: 이름 일치', () => assert.deepEqual(run(people, { keyword: '유나' }), ['a']));
test('keyword: 소개(bio) 일치', () => assert.deepEqual(run(people, { keyword: '스킨케어' }), ['a']));
test('keyword: 대소문자 무시·trim·부분 일치', () => {
  assert.deepEqual(run(people, { keyword: '  minji ' }), ['b']);
  assert.deepEqual(run(people, { keyword: 'vlog' }), ['d']);
});
test('keyword: 빈 값·공백·null = 필터 없음, name/bio NULL 안전', () => {
  for (const keyword of ['', '   ', null, undefined]) assert.equal(run(people, { keyword }).length, 3);
  assert.deepEqual(run(people, { keyword: '없는말' }), []);
});

// ── CATEGORY ──
test('category: 정확히 같은 저장값만', () => {
  const list = [c('beauty', { category: '뷰티/패션' }), c('food', { category: '음식/요리' }), c('partial', { category: '뷰티' })];
  assert.deepEqual(run(list, { category: '뷰티/패션' }), ['beauty']);
  assert.deepEqual(run(list, { category: '음식/요리' }), ['food']);
});
test('category: 필터 시 NULL 제외, 필터 없으면 전체 유지', () => {
  const list = [c('x', { category: '게임' }), c('none')];
  assert.deepEqual(run(list, { category: '게임' }), ['x']);
  assert.equal(run(list, { category: null }).length, 2);
  assert.equal(run(list, {}).length, 2);
});

// ── PLATFORM ──
const multi = [
  c('yt', { channels: [ch('youtube', 100)] }),
  c('ig', { channels: [ch('instagram', 100)] }),
  c('tt', { channels: [ch('tiktok', 100)] }),
  c('yt-ig', { channels: [ch('youtube', 100), ch('instagram', 100)] }),
  c('none', { channels: [] }),
];
test('platform: youtube', () => assert.deepEqual(sorted(run(multi, { platform: 'youtube' })), ['yt', 'yt-ig']));
test('platform: instagram', () => assert.deepEqual(sorted(run(multi, { platform: 'instagram' })), ['ig', 'yt-ig']));
test('platform: tiktok', () => assert.deepEqual(run(multi, { platform: 'tiktok' }), ['tt']));
test('platform: 여러 채널 보유자는 각 플랫폼에서 모두 매치, 채널 없으면 제외', () => {
  assert.ok(run(multi, { platform: 'youtube' }).includes('yt-ig'));
  assert.ok(run(multi, { platform: 'instagram' }).includes('yt-ig'));
  assert.ok(!run(multi, { platform: 'youtube' }).includes('none'));
});

// ── AUDIENCE ──
test('규모: 기존 4단계 숫자 그대로 + 모든 경계 [min, max)', () => {
  assert.deepEqual(AUDIENCE_RANGES.map((r) => [r.key, r.label, r.min, r.max]), [
    ['nano', '나노 (1만↓)', 0, 10_000],
    ['micro', '마이크로 (1만~10만)', 10_000, 100_000],
    ['mid', '미드 (10만~100만)', 100_000, 1_000_000],
    ['macro', '매크로 (100만↑)', 1_000_000, Infinity],
  ]);
  const counts = [0, 9_999, 10_000, 99_999, 100_000, 999_999, 1_000_000, 50_000_000];
  const list = counts.map((n) => c(`n${n}`, { channels: [ch('youtube', n)] }));
  const expected = {
    nano: ['n0', 'n9999'], micro: ['n10000', 'n99999'], mid: ['n100000', 'n999999'], macro: ['n1000000', 'n50000000'],
  };
  for (const [key, slugs] of Object.entries(expected)) assert.deepEqual(sorted(run(list, { followerRange: key })), sorted(slugs), key);
  // 각 값은 정확히 한 구간에만 속한다
  for (const n of counts) assert.equal(AUDIENCE_RANGES.filter((r) => n >= r.min && n < r.max).length, 1, String(n));
});
// 규모 필터 = 대표(최대) 채널 1개 기준. 합산하지 않는다.
const ytIg = c('yt90-ig30', { channels: [ch('youtube', 90_000), ch('instagram', 30_000)] });
const ytIgBig = c('yt120-ig900', { channels: [ch('youtube', 120_000), ch('instagram', 900_000)] });

test('규모 A: 플랫폼 미선택 → 가장 큰 채널 (90k → micro, 합계 120k로 mid 아님)', () => {
  assert.equal(filterAudience(ytIg.channels, null), 90_000);
  assert.deepEqual(run([ytIg], { followerRange: 'micro' }), ['yt90-ig30']);
  assert.deepEqual(run([ytIg], { followerRange: 'mid' }), []);
});
test('규모 B: platform=instagram → 30k → micro', () => {
  assert.equal(filterAudience(ytIg.channels, 'instagram'), 30_000);
  assert.deepEqual(run([ytIg], { platform: 'instagram', followerRange: 'micro' }), ['yt90-ig30']);
  assert.deepEqual(run([ytIg], { platform: 'instagram', followerRange: 'mid' }), []);
});
test('규모 C: 플랫폼 미선택 → 900k → mid (합계 1.02M로 macro 아님)', () => {
  assert.equal(filterAudience(ytIgBig.channels, null), 900_000);
  assert.deepEqual(run([ytIgBig], { followerRange: 'mid' }), ['yt120-ig900']);
  assert.deepEqual(run([ytIgBig], { followerRange: 'macro' }), []);
});
test('규모 D: platform=youtube → 120k → mid', () => {
  assert.equal(filterAudience(ytIgBig.channels, 'youtube'), 120_000);
  assert.deepEqual(run([ytIgBig], { platform: 'youtube', followerRange: 'mid' }), ['yt120-ig900']);
});
test('규모 E: 같은 플랫폼 채널 여러 개 → 그 중 최대 (30k+50k 합산 80k 아님)', () => {
  const x = c('ig-dup', { channels: [ch('instagram', 30_000), ch('instagram', 50_000), ch('youtube', 5_000)] });
  assert.equal(filterAudience(x.channels, 'instagram'), 50_000);
  assert.deepEqual(run([x], { platform: 'instagram', followerRange: 'micro' }), ['ig-dup']);
  // 합산 시 경계를 넘는 경우로 확인: 60k + 50k = 110k(mid)여도 micro
  const y = c('ig-dup2', { channels: [ch('instagram', 60_000), ch('instagram', 50_000)] });
  assert.deepEqual(run([y], { platform: 'instagram', followerRange: 'micro' }), ['ig-dup2']);
  assert.deepEqual(run([y], { platform: 'instagram', followerRange: 'mid' }), []);
});
test('규모 F: 필터 audience ≠ 정렬 audience (정렬은 B2 전체 합계)', () => {
  const a = c('a-yt90-ig30', { channels: [ch('youtube', 90_000), ch('instagram', 30_000)] });
  const b = c('b-yt100', { channels: [ch('youtube', 100_000)] });
  // 필터: A 대표 90k(micro), B 100k(mid)
  assert.deepEqual(run([a, b], { followerRange: 'micro' }), ['a-yt90-ig30']);
  assert.deepEqual(run([a, b], { followerRange: 'mid' }), ['b-yt100']);
  // 정렬: 나머지 조건 동일 → 합계 A 120k > B 100k 이므로 A가 위
  const out = filterDiscoveryCandidates([b, a], {}, NOW);
  assert.deepEqual(out.map((x) => [x.slug, x.totalAudience]), [['a-yt90-ig30', 120_000], ['b-yt100', 100_000]]);
});
test('규모: NULL·음수·비정상 값은 0', () => {
  const x = c('x', { channels: [ch('youtube', null), ch('youtube', -500), ch('instagram', NaN), ch('tiktok', 5_000)] });
  assert.equal(filterAudience(x.channels, null), 5_000);
  assert.equal(filterAudience(x.channels, 'youtube'), 0);
  assert.deepEqual(run([x], { followerRange: 'nano' }), ['x']);
  assert.deepEqual(run([x], { platform: 'youtube', followerRange: 'nano' }), ['x']);
});

// ── AVAILABILITY ──
const avail = [
  c('acc-fresh', { ad_availability: 'accepting', ad_availability_confirmed_at: FRESH }),
  c('acc-stale', { ad_availability: 'accepting', ad_availability_confirmed_at: STALE }),
  c('no-fresh', { ad_availability: 'not_accepting', ad_availability_confirmed_at: FRESH }),
  c('no-stale', { ad_availability: 'not_accepting', ad_availability_confirmed_at: STALE }),
  c('unset'),
];
test('기본: accepting fresh 포함', () => assert.ok(run(avail, {}).includes('acc-fresh')));
test('기본: not_accepting fresh 제외', () => assert.ok(!run(avail, {}).includes('no-fresh')));
test('기본: not_accepting stale 포함', () => assert.ok(run(avail, {}).includes('no-stale')));
test('기본: NULL·accepting stale 포함', () => {
  assert.deepEqual(sorted(run(avail, {})), ['acc-fresh', 'acc-stale', 'no-stale', 'unset']);
});
test('onlyAvailable=true: available 그룹만, false는 기본 제외만', () => {
  assert.deepEqual(run(avail, { onlyAvailable: true }), ['acc-fresh']);
  assert.equal(run(avail, { onlyAvailable: false }).length, 4);
});

// ── RATE ──
test('최소 단가: 유효 값 중 최소', () => {
  assert.equal(getMinimumRate({ long_form: 5_000_000, short_form: 3_000_000, story: 1_500_000 }), 1_500_000);
  assert.equal(getMinimumRate({ a: '2,000,000', b: 2_500_000 }), 2_000_000);
  assert.equal(getMinimumRate({ a: 0, b: null, c: undefined, d: '', e: '협의', f: NaN, g: -100, h: 700_000 }), 700_000);
});
test('최소 단가: 해석 불가 문구는 숫자로 바꾸지 않음, 데이터 없으면 null', () => {
  assert.equal(getMinimumRate({ youtube: '100만원', instagram: '50만원' }), null); // 운영 레거시 형태
  assert.equal(getMinimumRate({ a: '협의' }), null);
  assert.equal(getMinimumRate({ a: '1.5e6' }), null);
  for (const v of [null, undefined, {}, [], 'x', 100]) assert.equal(getMinimumRate(v), null);
});
const priced = [
  c('p150', { pricing: { long_form: 500, mention: 300, short_form: 150 } }),
  c('p400', { pricing: { long_form: 400 } }),
  c('unknown', { pricing: null }),
  c('text', { pricing: { youtube: '100만원' } }),
];
test('maxRate: 최소 단가와 같으면 포함(경계)', () => assert.deepEqual(run(priced, { maxRate: 150 }), ['p150']));
test('maxRate: 최소 단가보다 1 낮으면 제외', () => assert.deepEqual(run(priced, { maxRate: 149 }), []));
test('maxRate 없음: 가격 미입력 크리에이터도 포함', () => {
  assert.equal(run(priced, {}).length, 4);
  assert.equal(run(priced, { maxRate: null }).length, 4);
  assert.equal(run(priced, { maxRate: NaN }).length, 4);
});
test('maxRate 있음: 유효 가격 없는 크리에이터 제외', () => {
  assert.deepEqual(sorted(run(priced, { maxRate: 1_000_000_000 })), ['p150', 'p400']);
});

// ── COMBINED ──
const mix = [
  c('game-yt', { category: '게임', channels: [ch('youtube', 50_000)] }),
  c('game-tt', { category: '게임', channels: [ch('tiktok', 50_000)] }),
  c('food-yt', { category: '음식/요리', channels: [ch('youtube', 50_000)] }),
  c('game-yt-avail', { category: '게임', channels: [ch('youtube', 500_000)], ad_availability: 'accepting', ad_availability_confirmed_at: FRESH }),
  c('game-blocked', { category: '게임', channels: [ch('youtube', 50_000)], ad_availability: 'not_accepting', ad_availability_confirmed_at: FRESH }),
];
test('category + platform', () => assert.deepEqual(run(mix, { category: '게임', platform: 'youtube' }), ['game-yt-avail', 'game-yt']));
test('category + availability', () => {
  assert.deepEqual(run(mix, { category: '게임', onlyAvailable: true }), ['game-yt-avail']);
  assert.ok(!run(mix, { category: '게임' }).includes('game-blocked'));
});
test('keyword + rate', () => {
  const list = [
    c('cheap', { name: '요리왕', pricing: { short_form: 300_000 } }),
    c('pricey', { name: '요리천재', pricing: { short_form: 3_000_000 } }),
    c('other', { name: '게이머', pricing: { short_form: 100_000 } }),
  ];
  assert.deepEqual(run(list, { keyword: '요리', maxRate: 500_000 }), ['cheap']);
});
test('6개 필터 동시 적용', () => {
  const base = { category: '뷰티/패션', bio: '스킨케어 전문', ad_availability: 'accepting', ad_availability_confirmed_at: FRESH, pricing: { story: 800_000 } };
  const list = [
    c('hit', { ...base, channels: [ch('instagram', 30_000), ch('youtube', 900_000)] }),
    c('wrong-kw', { ...base, bio: '메이크업', channels: [ch('instagram', 30_000)] }),
    c('wrong-cat', { ...base, category: '게임', channels: [ch('instagram', 30_000)] }),
    c('wrong-platform', { ...base, channels: [ch('youtube', 30_000)] }),
    c('wrong-range', { ...base, channels: [ch('instagram', 300_000)] }),
    c('stale', { ...base, ad_availability_confirmed_at: STALE, channels: [ch('instagram', 30_000)] }),
    c('too-pricey', { ...base, pricing: { story: 2_000_000 }, channels: [ch('instagram', 30_000)] }),
  ];
  const filters = { keyword: '스킨케어', category: '뷰티/패션', platform: 'instagram', followerRange: 'micro', onlyAvailable: true, maxRate: 1_000_000 };
  assert.deepEqual(run(list, filters), ['hit']);
  assert.equal(getActiveFilterCount(filters), 5); // keyword 제외
  assert.equal(getActiveFilterCount({ keyword: 'x' }), 0);
  assert.equal(getActiveFilterCount({ onlyAvailable: false, maxRate: null }), 0);
});

// ── SORT ──
test('필터 후 B2 정렬 그대로 적용 (결과에 totalAudience 포함)', () => {
  const list = [
    c('zz-unset', { channels: [ch('youtube', 9_000_000)] }),
    c('small-avail', { ad_availability: 'accepting', ad_availability_confirmed_at: at(-2 * DAY), channels: [ch('youtube', 10)] }),
    c('newer-avail', { ad_availability: 'accepting', ad_availability_confirmed_at: at(-1 * DAY), channels: [ch('youtube', 5)] }),
    c('aa-unset', { channels: [ch('youtube', 9_000_000)] }),
  ];
  const out = filterDiscoveryCandidates(list, {}, NOW);
  assert.deepEqual(out.map((x) => x.slug), ['newer-avail', 'small-avail', 'aa-unset', 'zz-unset']);
  const expected = sortDiscoveryCandidates(list.map((x) => ({ ...x, totalAudience: totalAudience(x.channels) })), NOW);
  assert.deepEqual(out, expected);
  assert.equal(out[2].totalAudience, 9_000_000);
});
test('입력 배열·객체를 바꾸지 않는다', () => {
  const list = [c('b', { channels: [ch('youtube', 1)] }), c('a')];
  const snapshot = structuredClone(list);
  const out = filterDiscoveryCandidates(list, { keyword: '' }, NOW);
  assert.deepEqual(list, snapshot);
  assert.ok(!('totalAudience' in list[0]));
  assert.notEqual(out[0], list[1]);
});

// ── PRODUCTION FIXTURE ──
test('운영 현재 상태: 15명 모두 NULL → 기본 15, 지금 가능만 0', () => {
  const kits = Array.from({ length: 15 }, (_, i) => c(`creator-${String(i).padStart(2, '0')}`));
  assert.equal(filterDiscoveryCandidates(kits, { onlyAvailable: false }, NOW).length, 15);
  assert.equal(filterDiscoveryCandidates(kits, { onlyAvailable: true }, NOW).length, 0);
});
