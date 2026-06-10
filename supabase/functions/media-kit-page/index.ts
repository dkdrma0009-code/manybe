// Supabase Edge Function: media-kit-page
// GET /functions/v1/media-kit-page?slug=<slug>
// Returns a full HTML page for the creator's public media kit.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

const THEME: Record<string, { primary: string; bg: string; accent: string; label: string }> = {
  indigo:  { primary: '#5566DF', bg: '#F0EFFE', accent: '#E8E4FF', label: '인디고' },
  rose:    { primary: '#E11D48', bg: '#FFF1F2', accent: '#FFE4E6', label: '로즈' },
  emerald: { primary: '#059669', bg: '#ECFDF5', accent: '#D1FAE5', label: '에메랄드' },
  amber:   { primary: '#D97706', bg: '#FFFBEB', accent: '#FEF3C7', label: '앰버' },
  slate:   { primary: '#334155', bg: '#F1F5F9', accent: '#E2E8F0', label: '다크' },
}

const BADGE_CATALOG: Record<string, { emoji: string; label: string }> = {
  sub_100k:        { emoji: '🔥', label: '10만 구독' },
  sub_500k:        { emoji: '⚡', label: '50만 구독' },
  sub_1m:          { emoji: '💎', label: '100만 구독' },
  high_engagement: { emoji: '📈', label: '높은 참여율' },
  fast_growth:     { emoji: '🚀', label: '빠른 성장' },
  viral:           { emoji: '🌊', label: '바이럴 경험' },
  reliable:        { emoji: '✅', label: '신뢰할 수 있는 파트너' },
  on_time:         { emoji: '⏰', label: '기한 엄수' },
  good_comm:       { emoji: '💬', label: '소통 잘됨' },
  creative:        { emoji: '🎨', label: '크리에이티브' },
  data_driven:     { emoji: '📊', label: '데이터 중심' },
  long_term:       { emoji: '🤝', label: '장기 협업 선호' },
  food:            { emoji: '🍔', label: '푸드' },
  travel:          { emoji: '✈️', label: '여행' },
  beauty:          { emoji: '💄', label: '뷰티' },
  tech:            { emoji: '💻', label: '테크' },
  fashion:         { emoji: '👗', label: '패션' },
  fitness:         { emoji: '🏋️', label: '피트니스' },
  family:          { emoji: '👨‍👩‍👧', label: '가족 콘텐츠' },
  education:       { emoji: '📚', label: '교육' },
  entertainment:   { emoji: '😂', label: '엔터테인먼트' },
  gaming:          { emoji: '🎮', label: '게이밍' },
  finance:         { emoji: '💰', label: '경제/재테크' },
  pet:             { emoji: '🐾', label: '반려동물' },
  kids:            { emoji: '👶', label: '키즈' },
  studio:          { emoji: '🎬', label: '스튜디오 보유' },
  overseas:        { emoji: '🌏', label: '해외 거주' },
  multi_platform:  { emoji: '📱', label: '멀티 플랫폼' },
  brand_safe:      { emoji: '🛡️', label: '브랜드 세이프' },
}

const PRICING_LABELS: Record<string, string> = {
  short_form: '숏폼 (60초 이하)',
  long_form:  '롱폼 (10분 이상)',
  story:      '스토리 / 릴스',
  mention:    '제품 언급',
  dedicated:  '전체 광고 영상',
  youtube:    'YouTube',
  instagram:  'Instagram',
  tiktok:     'TikTok',
}

const PLATFORM_LABEL: Record<string, string> = {
  youtube:   'YouTube',
  instagram: 'Instagram',
  tiktok:    'TikTok',
}

function formatSubs(n: number): string {
  if (n >= 10000) return `${Math.floor(n / 10000)}만`
  if (n >= 1000)  return `${Math.floor(n / 1000)}천`
  return String(n)
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function avatarColor(name: string): string {
  const palette = ['#5566DF', '#E11D48', '#059669', '#D97706', '#7C3AED', '#0891B2', '#DC2626']
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff
  return palette[Math.abs(h) % palette.length]
}

Deno.serve(async (req: Request) => {
  const url  = new URL(req.url)
  const slug = url.searchParams.get('slug') ?? url.pathname.split('/').pop() ?? ''

  if (!slug) {
    return new Response('slug is required', { status: 400 })
  }

  // media_kit 조회
  const { data: kit, error: kitError } = await supabase
    .from('media_kits')
    .select('user_id, bio, pricing, past_brands, badges, theme, section_order, is_form_enabled, slug')
    .eq('slug', slug)
    .maybeSingle()

  if (!kit) {
    return new Response(notFoundHtml(), {
      status: 404,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }

  // 조회 기록 (대시보드 방문자 통계용 — 실패해도 페이지 렌더는 계속)
  await supabase.from('media_kit_views').insert({ user_id: kit.user_id })

  // 프로필 조회
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, niche')
    .eq('id', kit.user_id)
    .single()

  // 소셜 채널 조회
  const { data: channels } = await supabase
    .from('social_channels')
    .select('platform, subscriber_count, channel_name, handle')
    .eq('user_id', kit.user_id)

  const name       = profile?.full_name ?? '크리에이터'
  const initial    = name.charAt(0).toUpperCase()
  const avatarBg   = avatarColor(name)
  const themeId    = kit.theme ?? 'indigo'
  const t          = THEME[themeId] ?? THEME.indigo
  const sections: string[] = kit.section_order ?? ['channels', 'pricing', 'brands']
  const badges: string[]   = kit.badges ?? []
  const pricing            = kit.pricing ?? {}
  const pastBrands: string[] = kit.past_brands ?? []
  const pricingEntries     = Object.entries(pricing).filter(([, v]) => v != null && v !== '' && v !== 0)

  function channelsSection(): string {
    if (!channels?.length) return ''
    return `
    <section class="card">
      <h2 class="card-title">📊 채널 성과</h2>
      <div class="channels-grid">
        ${(channels ?? []).map((ch) => `
          <div class="channel-card">
            <div class="platform-label">${esc(PLATFORM_LABEL[ch.platform] ?? ch.platform)}</div>
            <div class="channel-name">${esc(ch.handle ? '@' + ch.handle : ch.channel_name ?? '')}</div>
            <div class="channel-subs">${formatSubs(ch.subscriber_count ?? 0)}</div>
            <div class="channel-subs-label">구독자</div>
          </div>
        `).join('')}
      </div>
    </section>`
  }

  function pricingSection(): string {
    if (!pricingEntries.length) return ''
    return `
    <section class="card">
      <h2 class="card-title">💰 협찬 단가</h2>
      <div class="pricing-list">
        ${pricingEntries.map(([key, val]) => `
          <div class="pricing-row">
            <span class="pricing-label">${esc(PRICING_LABELS[key] ?? (key.charAt(0).toUpperCase() + key.slice(1)))}</span>
            <span class="pricing-value">${typeof val === 'number' ? val.toLocaleString('ko-KR') + '원~' : esc(String(val))}</span>
          </div>
        `).join('')}
      </div>
    </section>`
  }

  function brandsSection(): string {
    if (!pastBrands.length) return ''
    return `
    <section class="card">
      <h2 class="card-title">🤝 협업 브랜드</h2>
      <div class="tags-wrap">
        ${pastBrands.map((b) => `<span class="brand-tag">${esc(b)}</span>`).join('')}
      </div>
    </section>`
  }

  const sectionHtml: Record<string, () => string> = {
    channels: channelsSection,
    pricing:  pricingSection,
    brands:   brandsSection,
  }

  const renderedSections = sections.map((id) => sectionHtml[id]?.() ?? '').join('\n')

  const badgesHtml = badges.length ? `
  <div class="badges-wrap">
    ${badges.map((id) => {
      const b = BADGE_CATALOG[id]
      if (!b) return ''
      return `<span class="badge-chip">${b.emoji} ${esc(b.label)}</span>`
    }).join('')}
  </div>` : ''

  const APP_STORE_URL = 'https://apps.apple.com/app/manybe'

  const html = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(name)} | 매니비 미디어 키트</title>
  <meta property="og:title" content="${esc(name)} 미디어 키트" />
  <meta property="og:description" content="${esc(kit.bio ?? name + '의 미디어 키트입니다.')}" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700;900&display=swap" rel="stylesheet" />
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Noto Sans KR', sans-serif;
      background: #F5F3EF;
      color: #1A1A2E;
      min-height: 100vh;
    }
    .wrap { max-width: 480px; margin: 0 auto; padding: 24px 16px 120px; }

    /* 프로필 헤더 */
    .profile-card {
      background: #fff;
      border-radius: 24px;
      padding: 32px 24px;
      text-align: center;
      box-shadow: 0 2px 12px rgba(0,0,0,.06);
      margin-bottom: 16px;
    }
    .avatar {
      width: 80px; height: 80px; border-radius: 24px;
      background: ${avatarBg};
      display: flex; align-items: center; justify-content: center;
      margin: 0 auto 16px;
      font-size: 32px; font-weight: 900; color: #fff;
    }
    .creator-name { font-size: 22px; font-weight: 900; margin-bottom: 10px; }
    .bio { font-size: 14px; color: #4B5563; line-height: 1.7; margin-bottom: 14px; }
    .url-chip {
      display: inline-block;
      background: ${t.bg}; color: ${t.primary};
      border-radius: 20px; padding: 5px 14px;
      font-size: 11px; font-weight: 700;
    }

    /* 뱃지 */
    .badges-wrap { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin-bottom: 14px; }
    .badge-chip {
      background: ${t.bg}; color: ${t.primary};
      border-radius: 20px; padding: 6px 12px;
      font-size: 13px; font-weight: 700;
    }

    /* 카드 공통 */
    .card {
      background: #fff;
      border-radius: 20px;
      padding: 20px;
      box-shadow: 0 2px 10px rgba(0,0,0,.05);
      margin-bottom: 16px;
    }
    .card-title { font-size: 15px; font-weight: 900; margin-bottom: 16px; }

    /* 채널 */
    .channels-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 12px; }
    .channel-card {
      background: ${t.bg}; border-radius: 14px; padding: 14px 10px; text-align: center;
    }
    .platform-label { font-size: 11px; font-weight: 700; color: ${t.primary}; margin-bottom: 4px; }
    .channel-name   { font-size: 12px; color: #6B7280; margin-bottom: 8px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .channel-subs   { font-size: 24px; font-weight: 900; color: #1A1A2E; }
    .channel-subs-label { font-size: 11px; color: #9CA3AF; margin-top: 2px; }

    /* 단가 */
    .pricing-list { display: flex; flex-direction: column; gap: 0; }
    .pricing-row {
      display: flex; justify-content: space-between; align-items: center;
      padding: 12px 0;
      border-bottom: 1px solid #F3F4F6;
    }
    .pricing-row:last-child { border-bottom: none; }
    .pricing-label { font-size: 13px; color: #374151; }
    .pricing-value { font-size: 14px; font-weight: 800; color: #1A1A2E; }

    /* 브랜드 태그 */
    .tags-wrap { display: flex; flex-wrap: wrap; gap: 8px; }
    .brand-tag {
      background: ${t.bg}; color: ${t.primary};
      border-radius: 20px; padding: 7px 14px;
      font-size: 13px; font-weight: 700;
    }

    /* 하단 CTA */
    .cta-bar {
      position: fixed; bottom: 0; left: 0; right: 0;
      background: #fff;
      border-top: 1px solid #F3F4F6;
      padding: 12px 16px 28px;
      display: flex; flex-direction: column; align-items: center; gap: 8px;
    }
    .cta-btn {
      display: block; width: 100%; max-width: 448px;
      background: ${t.primary}; color: #fff;
      border: none; border-radius: 14px;
      padding: 15px;
      font-size: 16px; font-weight: 900; font-family: inherit;
      text-align: center; cursor: pointer; text-decoration: none;
    }
    .cta-hint { font-size: 11px; color: #9CA3AF; }

    /* 매니비 로고 */
    .manybe-logo {
      text-align: center; margin-bottom: 20px;
      font-size: 13px; font-weight: 900; color: ${t.primary};
      letter-spacing: -0.3px;
    }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="manybe-logo">manybe</div>

    <div class="profile-card">
      <div class="avatar">${esc(initial)}</div>
      <div class="creator-name">${esc(name)}</div>
      ${kit.bio ? `<p class="bio">${esc(kit.bio)}</p>` : ''}
      ${badgesHtml}
      <span class="url-chip">manybe.app/${esc(slug)}</span>
    </div>

    ${renderedSections}
  </div>

  <div class="cta-bar">
    <a href="${APP_STORE_URL}" class="cta-btn">📩 협찬 제안하기</a>
    <span class="cta-hint">매니비 앱에서 제안을 보낼 수 있어요</span>
  </div>
</body>
</html>`

  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=60' },
  })
})

function notFoundHtml(): string {
  return `<!DOCTYPE html>
<html lang="ko"><head><meta charset="UTF-8"/><title>찾을 수 없음</title>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>body{font-family:sans-serif;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;gap:12px;background:#F5F3EF;color:#1A1A2E}</style>
</head><body>
<div style="font-size:48px">🔍</div>
<h1 style="font-size:18px;font-weight:900">미디어 키트를 찾을 수 없어요</h1>
<p style="font-size:14px;color:#9CA3AF">URL을 다시 확인해주세요</p>
</body></html>`
}
