// 크리에이터 카테고리 taxonomy·앱 편집 화면 저장 흐름 테스트 (Node 내장 테스트 러너)
// 실행: npm run test:categories
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {
  CREATOR_CATEGORIES, isCreatorCategory, creatorCategoryLabel, normalizeCategory,
} from '../src/constants/creatorCategories.ts';
import { MEDIA_KIT_CATEGORIES, LEGACY_CATEGORY_KEY_TO_VALUE } from '../web/lib/categories.ts';

const values = CREATOR_CATEGORIES.map((c) => c.value);

// 운영 DB에 이미 저장된 값 9종 (Step 4-A 집계) — 이관 없이 그대로 유효해야 한다
const PRODUCTION_VALUES = ['뷰티/패션', '테크/IT', '라이프스타일', '게임', '교육', '여행', '스포츠', '음식/요리', '엔터테인먼트'];

test('taxonomy: 13개, 저장값 중복 없음', () => {
  assert.equal(CREATOR_CATEGORIES.length, 13);
  assert.equal(new Set(values).size, 13);
  assert.equal(new Set(CREATOR_CATEGORIES.map((c) => c.label)).size, 13);
});

test('taxonomy: 확정 value/label 그대로', () => {
  assert.deepEqual(CREATOR_CATEGORIES.map((c) => [c.value, c.label]), [
    ['뷰티/패션', '뷰티/패션'], ['음식/요리', '푸드/요리'], ['라이프스타일', '라이프스타일'],
    ['테크/IT', '테크/IT'], ['게임', '게임'], ['여행', '여행'], ['스포츠', '스포츠/피트니스'],
    ['교육', '교육/자기계발'], ['엔터테인먼트', '엔터테인먼트'], ['육아/가족', '육아/가족'],
    ['반려동물', '반려동물'], ['경제/재테크', '경제/재테크'], ['기타', '기타'],
  ]);
});

test('운영 기존 값 9종이 모두 taxonomy에 포함', () => {
  for (const v of PRODUCTION_VALUES) assert.ok(isCreatorCategory(v), v);
});

test('앱·웹 목록이 완전히 같다', () => {
  assert.deepEqual(MEDIA_KIT_CATEGORIES.map((c) => [c.value, c.label]), CREATOR_CATEGORIES.map((c) => [c.value, c.label]));
});

test('웹 레거시 영문 key 매핑은 모두 taxonomy 값', () => {
  for (const v of Object.values(LEGACY_CATEGORY_KEY_TO_VALUE)) assert.ok(isCreatorCategory(v), v);
});

test('/discover 필터 key(전체 제외)가 모두 taxonomy 값 — 기존 필터 계속 동작', async () => {
  const src = await fs.readFile(new URL('../web/app/discover/page.tsx', import.meta.url), 'utf8');
  const block = src.slice(src.indexOf('const CATEGORIES'), src.indexOf('];', src.indexOf('const CATEGORIES')));
  const keys = [...block.matchAll(/key:\s*"([^"]+)"/g)].map((m) => m[1]).filter((k) => k !== '전체');
  assert.equal(keys.length, 9);
  for (const k of keys) assert.ok(isCreatorCategory(k), k);
});

test('NULL·빈 값은 미선택, 레거시 값은 보존', () => {
  assert.equal(normalizeCategory(null), null);
  assert.equal(normalizeCategory(undefined), null);
  assert.equal(normalizeCategory(''), null);
  assert.equal(normalizeCategory('  '), null);
  assert.equal(normalizeCategory('뷰티/패션'), '뷰티/패션');
  assert.equal(normalizeCategory(' 게임 '), '게임');
  assert.equal(normalizeCategory('먹방'), '먹방'); // 목록 밖 값도 사용자가 바꾸기 전엔 그대로 저장
  assert.equal(isCreatorCategory(null), false);
  assert.equal(isCreatorCategory('먹방'), false);
});

test('라벨 표시: 저장값→라벨, 레거시는 원문, 미설정은 null', () => {
  assert.equal(creatorCategoryLabel('음식/요리'), '푸드/요리');
  assert.equal(creatorCategoryLabel('스포츠'), '스포츠/피트니스');
  assert.equal(creatorCategoryLabel('먹방'), '먹방');
  assert.equal(creatorCategoryLabel(null), null);
  assert.equal(creatorCategoryLabel(''), null);
});

// ── MediaKitEditScreen: 기존 저장 흐름에 category만 추가됐는지 (소스 검사) ──
const screen = await fs.readFile(new URL('../src/screens/settings/MediaKitEditScreen.tsx', import.meta.url), 'utf8');

test('편집 화면: 로드 select에 category 포함, 기존 컬럼 유지', () => {
  const sel = screen.match(/\.from\('media_kits'\)\s*\.select\('([^']+)'\)/)[1].split(',').map((s) => s.trim());
  for (const c of ['bio', 'category', 'pricing', 'past_brands', 'badges', 'theme', 'section_order', 'highlights', 'ad_availability']) {
    assert.ok(sel.includes(c), c);
  }
});

test('편집 화면: 저장 payload = 기존 필드 + category, availability·is_form_enabled 미포함', () => {
  const body = screen.slice(screen.indexOf('const payload = {'), screen.indexOf('};', screen.indexOf('const payload = {')));
  const keys = [...body.matchAll(/^\s+([a-z_]+)(?::|,)/gm)].map((m) => m[1]);
  assert.deepEqual(keys, ['bio', 'category', 'pricing', 'past_brands', 'badges', 'theme', 'section_order', 'highlights']);
  assert.match(body, /category: normalizeCategory\(category\)/);
});

test('편집 화면: category 전용 insert/update 경로 없음 (기존 update/insert 2곳만)', () => {
  assert.equal((screen.match(/\.from\('media_kits'\)\s*\.update\(/g) ?? []).length, 1);
  assert.equal((screen.match(/\.from\('media_kits'\)\s*\.insert\(/g) ?? []).length, 2);
  assert.ok(!/update\(\{\s*category/.test(screen));
  assert.ok(!/insert\(\{[^}]*category/.test(screen));
});
