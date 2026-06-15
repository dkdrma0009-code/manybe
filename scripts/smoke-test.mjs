// 핵심 쓰기 경로 스모크 테스트 — 실제 DB(원격)에 대해 데모 계정으로
// insert/update를 한 번씩 실행해 "조용히 실패하는" 스키마/RLS 회귀를 잡는다.
// 이번 프로젝트에서 폰으로 손수 찾은 버그류(NOT NULL 누락, 없는 컬럼,
// role 필수 등)를 자동 재현. 실행: npm run smoke
//
// 시드 데이터를 손상시키지 않도록 만든 행은 전부 즉시 삭제한다.

import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

// .env.local 파싱 (dotenv 의존 없이)
const env = {};
for (const line of readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n')) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim();
}

const URL_ = env.EXPO_PUBLIC_SUPABASE_URL;
const KEY = env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const DEMO_EMAIL = 'demo@manybe.site';
const DEMO_PW = 'manybe2026!';

const sb = createClient(URL_, KEY, { auth: { persistSession: false } });

let pass = 0, fail = 0;
const results = [];
async function step(name, fn) {
  try {
    await fn();
    results.push(`  ✓ ${name}`); pass++;
  } catch (e) {
    results.push(`  ✗ ${name}\n      → ${e.message}`); fail++;
  }
}
function assert(cond, msg) { if (!cond) throw new Error(msg); }

const run = async () => {
  // 0. 로그인
  const { data: auth, error: authErr } = await sb.auth.signInWithPassword({ email: DEMO_EMAIL, password: DEMO_PW });
  if (authErr) { console.error('로그인 실패:', authErr.message); process.exit(1); }
  const uid = auth.user.id;
  console.log(`\n스모크 테스트 — ${DEMO_EMAIL} (${uid.slice(0, 8)})\n`);

  // 1. profiles 업데이트 (role 필수 회귀 감지)
  await step('profiles.update (이름 변경→복원)', async () => {
    const { data: before } = await sb.from('profiles').select('full_name').eq('id', uid).maybeSingle();
    const orig = before?.full_name ?? null;
    const r1 = await sb.from('profiles').update({ full_name: '스모크테스트' }).eq('id', uid);
    assert(!r1.error, `update 실패: ${r1.error?.message}`);
    await sb.from('profiles').update({ full_name: orig }).eq('id', uid); // 복원
  });

  // 2. revenues insert (title NOT NULL 회귀 감지)
  await step('revenues.insert→delete (정산 자동 기록 경로)', async () => {
    const { data, error } = await sb.from('revenues').insert({
      user_id: uid, amount: 1, category: 'sponsorship', description: '__smoke__', date: '2026-01-01',
    }).select('id').single();
    assert(!error, `insert 실패: ${error?.message}`);
    await sb.from('revenues').delete().eq('id', data.id);
  });

  // 3. deals insert → schedules insert(deal_id) → cascade delete
  //    (schedule_date NOT NULL 누락 회귀 감지)
  await step('deals.insert + schedules.insert(deal_id)→delete', async () => {
    const { data: deal, error: dErr } = await sb.from('deals').insert({
      user_id: uid, brand: '__smoke__', title: '__smoke__', amount: 1, status: 'inquiry',
    }).select('id').single();
    assert(!dErr, `deals insert 실패: ${dErr?.message}`);
    const { error: sErr } = await sb.from('schedules').insert({
      user_id: uid, deal_id: deal.id, title: '__smoke__', type: 'deadline',
      schedule_date: '2026-01-01', start_time: '2026-01-01T09:00:00.000Z',
    });
    await sb.from('deals').delete().eq('id', deal.id); // schedule은 CASCADE로 정리
    assert(!sErr, `schedules insert 실패: ${sErr?.message}`);
  });

  // 4. media_kits 읽기 (공개 정책 + 컬럼 존재 확인)
  await step('media_kits.select (slug/badges/pricing 컬럼)', async () => {
    const { error } = await sb.from('media_kits')
      .select('slug, badges, pricing, badge_data, highlights').eq('user_id', uid).maybeSingle();
    assert(!error, `select 실패: ${error?.message}`);
  });

  // 5. social_channels 읽기 (분석 컬럼 존재 확인)
  await step('social_channels.select (구독자/이력 컬럼)', async () => {
    const { error } = await sb.from('social_channels')
      .select('subscriber_count, subscriber_history, avg_views, engagement_rate').eq('user_id', uid);
    assert(!error, `select 실패: ${error?.message}`);
  });

  // 6. media_kit_views insert (조회 기록 경로)
  await step('media_kit_views.insert→delete', async () => {
    const { data, error } = await sb.from('media_kit_views').insert({ user_id: uid }).select('id').single();
    assert(!error, `insert 실패: ${error?.message}`);
    await sb.from('media_kit_views').delete().eq('id', data.id);
  });

  console.log(results.join('\n'));
  console.log(`\n결과: ${pass} 통과 / ${fail} 실패\n`);
  await sb.auth.signOut();
  process.exit(fail > 0 ? 1 : 0);
};

run().catch((e) => { console.error(e); process.exit(1); });
