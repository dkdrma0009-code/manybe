import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const YOUTUBE_KEY      = Deno.env.get('YOUTUBE_API_KEY') ?? ''
const ANTHROPIC_KEY    = Deno.env.get('ANTHROPIC_API_KEY') ?? ''
const GOOGLE_CLIENT_ID     = Deno.env.get('GOOGLE_CLIENT_ID') ?? ''
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET') ?? ''
const SUPABASE_URL         = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface VideoInfo {
  id: string
  title: string
  tags: string[]
  viewCount: number
}

// ─── YouTube Data API ─────────────────────────────────────────────────────────

async function fetchRecentVideos(channelId: string): Promise<VideoInfo[]> {
  const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&maxResults=10&order=date&type=video&key=${YOUTUBE_KEY}`
  const searchRes = await fetch(searchUrl)
  const searchJson = await searchRes.json()
  if (!searchJson.items?.length) return []

  const videoIds = searchJson.items.map((i: { id: { videoId: string } }) => i.id.videoId).join(',')
  const statsRes = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${videoIds}&key=${YOUTUBE_KEY}`)
  const statsJson = await statsRes.json()

  return (statsJson.items ?? []).map((v: {
    id: string
    snippet: { title: string; tags?: string[] }
    statistics: { viewCount: string }
  }) => ({
    id: v.id,
    title: v.snippet.title,
    tags: v.snippet.tags ?? [],
    viewCount: parseInt(v.statistics.viewCount ?? '0', 10),
  }))
}

async function fetchTopComments(videoId: string): Promise<string[]> {
  const url = `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${videoId}&maxResults=100&order=relevance&key=${YOUTUBE_KEY}`
  const res = await fetch(url)
  const json = await res.json()
  if (!json.items?.length) return []
  return json.items.map((item: { snippet: { topLevelComment: { snippet: { textDisplay: string } } } }) =>
    item.snippet.topLevelComment.snippet.textDisplay
  )
}

// ─── YouTube category ID → Korean label ──────────────────────────────────────

const YT_CATEGORY_MAP: Record<string, string> = {
  '1':  '영화/애니메이션', '2':  '자동차/차량', '10': '음악',
  '15': '반려동물/동물',   '17': '스포츠',       '19': '여행/행사',
  '20': '게임',            '22': '브이로그/일상', '23': '코미디',
  '24': '엔터테인먼트',    '25': '뉴스/정치',    '26': '뷰티/라이프스타일',
  '27': '교육',            '28': 'IT/테크',       '29': '사회/환경',
}

// ─── YouTube Analytics API ────────────────────────────────────────────────────

async function refreshAccessToken(refreshToken: string): Promise<string | null> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id:     GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type:    'refresh_token',
    }),
  })
  const data = await res.json()
  return data.access_token ?? null
}

async function fetchRelatedVideoCategories(
  channelId: string,
  accessToken: string,
): Promise<string[]> {
  const endDate   = new Date().toISOString().slice(0, 10)
  const startDate = new Date(Date.now() - 90 * 86_400_000).toISOString().slice(0, 10)

  // 연관 영상 유입 상위 10개의 video ID 가져오기
  const analyticsUrl = `https://youtubeanalytics.googleapis.com/v2/reports` +
    `?ids=channel==${channelId}` +
    `&dimensions=insightTrafficSourceDetail` +
    `&filters=insightTrafficSourceType%3D%3DYT_RELATED_VIDEO` +
    `&metrics=views` +
    `&sort=-views` +
    `&maxResults=10` +
    `&startDate=${startDate}` +
    `&endDate=${endDate}`

  const analyticsRes = await fetch(analyticsUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const analyticsData = await analyticsRes.json()
  if (!analyticsData.rows?.length) return []

  const videoIds: string[] = analyticsData.rows
    .map((row: [string, number]) => row[0])
    .filter(Boolean)
  if (!videoIds.length) return []

  // 해당 영상들의 카테고리 조회
  const videosRes = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoIds.join(',')}&key=${YOUTUBE_KEY}`
  )
  const videosData = await videosRes.json()
  if (!videosData.items?.length) return []

  const categoryIds: string[] = videosData.items.map(
    (v: { snippet: { categoryId?: string } }) => v.snippet?.categoryId ?? ''
  ).filter(Boolean)

  const categories = [...new Set(categoryIds)]
    .map(id => YT_CATEGORY_MAP[id])
    .filter(Boolean) as string[]

  return categories
}

async function fetchRealInflowKeywords(
  channelId: string,
  accessToken: string,
): Promise<string[]> {
  const endDate   = new Date().toISOString().slice(0, 10)
  const startDate = new Date(Date.now() - 90 * 86_400_000).toISOString().slice(0, 10)

  const url = `https://youtubeanalytics.googleapis.com/v2/reports` +
    `?ids=channel==${channelId}` +
    `&dimensions=insightTrafficSourceDetail` +
    `&filters=insightTrafficSourceType%3D%3DYT_SEARCH` +
    `&metrics=views` +
    `&sort=-views` +
    `&maxResults=10` +
    `&startDate=${startDate}` +
    `&endDate=${endDate}`

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const data = await res.json()

  if (!data.rows?.length) return []
  return data.rows.map((row: [string, number]) => row[0]).filter(Boolean)
}

// ─── Claude AI 분석 ───────────────────────────────────────────────────────────

async function callClaude(
  channelName: string,
  subscriberCount: number,
  videos: VideoInfo[],
  comments: string[],
  hasRealKeywords: boolean,
  hasRealCategories: boolean,
): Promise<{
  sentiment_score: number
  sentiment_label: string
  audience_keywords: string[]
  ad_ratio: number
  insights: { icon: string; text: string }[]
  inflow_keywords: string[]
  audience_categories: string[]
}> {
  const titlesText = videos.slice(0, 10).map((v, i) => `${i + 1}. ${v.title}`).join('\n')
  const allTags    = [...new Set(videos.flatMap((v) => v.tags))].slice(0, 40)
  const tagsText   = allTags.length ? allTags.join(', ') : '(태그 없음)'
  const commentsText = comments.slice(0, 100).join('\n')

  const inflowKeywordsField = hasRealKeywords
    ? ''
    : `  "inflow_keywords": ["이 채널에 유입될 때 사용했을 검색 키워드 5~8개. 영상 제목·태그 기반으로 추정. 예: '스킨케어 루틴', '간단한 메이크업'"],`

  const audienceCategoriesField = hasRealCategories
    ? ''
    : `  "audience_categories": ["시청자들이 관심 가질 카테고리 3~5개. 댓글 언급·영상 주제 기반으로 추출. 예: '뷰티/스킨케어', '라이프스타일', 'OOTD/패션'"]`

  const prompt = `당신은 한국 유튜브 크리에이터 채널 분석 전문가입니다.

채널 정보:
- 채널명: ${channelName}
- 구독자: ${subscriberCount.toLocaleString()}명

최근 영상 제목 (최신순):
${titlesText}

영상 태그:
${tagsText}

댓글 샘플 (${comments.length}개):
${commentsText}

위 데이터를 분석하여 다음 JSON 형식으로만 응답하세요. JSON 외 다른 텍스트는 포함하지 마세요:
{
  "sentiment_score": <0~100, 50=중립, 100=매우긍정>,
  "sentiment_label": <"매우 긍정적" | "긍정적" | "중립적" | "부정적" | "매우 부정적">,
  "audience_keywords": ["타겟 특성 키워드 3~5개 (예: 20대, 여성, 뷰티팬)"],
  "ad_ratio": <0~100, 영상 제목 기반 광고/협찬 콘텐츠 비율 추정>,
  "insights": [
    {"icon": "이모지", "text": "구체적인 한국어 인사이트 (1~2문장)"}
  ],
${inflowKeywordsField}
${audienceCategoriesField}
}`

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  const data = await res.json()
  const text = data.content?.[0]?.text ?? '{}'
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('Claude returned invalid JSON')
  const parsed = JSON.parse(jsonMatch[0])

  return {
    ...parsed,
    inflow_keywords:    parsed.inflow_keywords    ?? [],
    audience_categories: parsed.audience_categories ?? [],
  }
}

// ─── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const { channel_id, user_id } = await req.json()
    if (!channel_id || !user_id) {
      return new Response(JSON.stringify({ error: 'channel_id and user_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // 채널 정보 조회
    const { data: channel } = await supabase
      .from('social_channels')
      .select('channel_id, channel_name, subscriber_count')
      .eq('user_id', user_id)
      .eq('channel_id', channel_id)
      .single()

    if (!channel) {
      return new Response(JSON.stringify({ error: '채널을 찾을 수 없습니다' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // OAuth 토큰은 소유자 전용 테이블에서 별도 조회 (service_role이라 RLS 무관)
    const { data: tokenRow } = await supabase
      .from('social_channel_tokens')
      .select('youtube_access_token, youtube_refresh_token, youtube_token_expires_at')
      .eq('user_id', user_id)
      .eq('platform', 'youtube')
      .maybeSingle()

    // 영상 + 댓글 수집
    const videos = await fetchRecentVideos(channel_id)
    if (!videos.length) {
      return new Response(JSON.stringify({ error: '최근 영상을 찾을 수 없습니다' }), {
        status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const topVideo = videos.sort((a, b) => b.viewCount - a.viewCount)[0]
    const comments = await fetchTopComments(topVideo.id)

    // ── YouTube Analytics: 실제 유입 키워드 + 연관 영상 카테고리 ─────────────
    let realInflowKeywords: string[] = []
    let realAudienceCategories: string[] = []

    if (tokenRow?.youtube_access_token) {
      let accessToken = tokenRow.youtube_access_token

      // 토큰 만료 여부 확인 → 갱신
      const isExpired = tokenRow.youtube_token_expires_at
        ? new Date(tokenRow.youtube_token_expires_at).getTime() < Date.now() + 60_000
        : false

      if (isExpired && tokenRow.youtube_refresh_token) {
        const newToken = await refreshAccessToken(tokenRow.youtube_refresh_token)
        if (newToken) {
          accessToken = newToken
          await supabase
            .from('social_channel_tokens')
            .update({
              youtube_access_token: newToken,
              youtube_token_expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
            })
            .eq('user_id', user_id)
            .eq('platform', 'youtube')
        }
      }

      const [keywords, categories] = await Promise.allSettled([
        fetchRealInflowKeywords(channel_id, accessToken),
        fetchRelatedVideoCategories(channel_id, accessToken),
      ])
      if (keywords.status === 'fulfilled')   realInflowKeywords      = keywords.value
      if (categories.status === 'fulfilled') realAudienceCategories  = categories.value
      if (keywords.status === 'rejected')    console.warn('keyword analytics failed:', keywords.reason)
      if (categories.status === 'rejected')  console.warn('category analytics failed:', categories.reason)
    }

    // ── Claude AI 분석 ────────────────────────────────────────────────────────
    const result = await callClaude(
      channel.channel_name,
      channel.subscriber_count,
      videos,
      comments,
      realInflowKeywords.length > 0,
      realAudienceCategories.length > 0,
    )

    const finalInflowKeywords      = realInflowKeywords.length > 0     ? realInflowKeywords      : result.inflow_keywords
    const finalAudienceCategories  = realAudienceCategories.length > 0 ? realAudienceCategories  : result.audience_categories
    const inflowSource             = realInflowKeywords.length > 0     ? 'analytics' : 'ai'
    const audienceCategoriesSource = realAudienceCategories.length > 0 ? 'analytics' : 'ai'

    // DB 저장
    const { error: dbError } = await supabase
      .from('channel_analyses')
      .upsert({
        user_id,
        channel_id,
        sentiment_score:            result.sentiment_score,
        sentiment_label:            result.sentiment_label,
        audience_keywords:          result.audience_keywords,
        ad_ratio:                   result.ad_ratio,
        insights:                   result.insights,
        inflow_keywords:            finalInflowKeywords,
        audience_categories:        finalAudienceCategories,
        inflow_source:              inflowSource,
        audience_categories_source: audienceCategoriesSource,
        sample_size:                comments.length,
        computed_at:                new Date().toISOString(),
      }, { onConflict: 'user_id,channel_id' })

    if (dbError) console.error('DB upsert error:', dbError)

    return new Response(JSON.stringify({
      ...result,
      inflow_keywords:            finalInflowKeywords,
      audience_categories:        finalAudienceCategories,
      inflow_source:              inflowSource,
      audience_categories_source: audienceCategoriesSource,
      sample_size:                comments.length,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (err) {
    console.error('analyze-channel error:', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
