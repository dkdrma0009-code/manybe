import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const YOUTUBE_KEY = Deno.env.get('YOUTUBE_API_KEY') ?? ''
const ANTHROPIC_KEY = Deno.env.get('ANTHROPIC_API_KEY') ?? ''
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function fetchRecentVideos(channelId: string): Promise<{ id: string; title: string; viewCount: number }[]> {
  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&maxResults=10&order=date&type=video&key=${YOUTUBE_KEY}`
  const res = await fetch(url)
  const json = await res.json()
  if (!json.items?.length) return []

  // Get video stats
  const videoIds = json.items.map((i: { id: { videoId: string } }) => i.id.videoId).join(',')
  const statsUrl = `https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${videoIds}&key=${YOUTUBE_KEY}`
  const statsRes = await fetch(statsUrl)
  const statsJson = await statsRes.json()

  return (statsJson.items ?? []).map((v: { id: string; snippet: { title: string }; statistics: { viewCount: string } }) => ({
    id: v.id,
    title: v.snippet.title,
    viewCount: parseInt(v.statistics.viewCount ?? '0', 10),
  }))
}

async function fetchTopComments(videoId: string, maxResults = 100): Promise<string[]> {
  const url = `https://www.googleapis.com/youtube/v3/commentThreads?part=snippet&videoId=${videoId}&maxResults=${maxResults}&order=relevance&key=${YOUTUBE_KEY}`
  const res = await fetch(url)
  const json = await res.json()
  if (!json.items?.length) return []
  return json.items.map((item: { snippet: { topLevelComment: { snippet: { textDisplay: string } } } }) =>
    item.snippet.topLevelComment.snippet.textDisplay
  )
}

async function callClaude(channelName: string, subscriberCount: number, videoTitles: string[], comments: string[]): Promise<{
  sentiment_score: number
  sentiment_label: string
  audience_keywords: string[]
  ad_ratio: number
  insights: { icon: string; text: string }[]
}> {
  const titlesText = videoTitles.slice(0, 10).map((t, i) => `${i + 1}. ${t}`).join('\n')
  const commentsText = comments.slice(0, 100).join('\n')

  const prompt = `당신은 한국 유튜브 크리에이터 채널 분석 전문가입니다.

채널 정보:
- 채널명: ${channelName}
- 구독자: ${subscriberCount.toLocaleString()}명

최근 영상 제목 (최신순):
${titlesText}

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
  ]
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

  // Extract JSON even if wrapped in backticks
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('Claude returned invalid JSON')
  return JSON.parse(jsonMatch[0])
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { channel_id, user_id } = await req.json()
    if (!channel_id || !user_id) {
      return new Response(JSON.stringify({ error: 'channel_id and user_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // Get channel info from DB
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

    // Fetch videos and comments
    const videos = await fetchRecentVideos(channel_id)
    if (!videos.length) {
      return new Response(JSON.stringify({ error: '최근 영상을 찾을 수 없습니다' }), {
        status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Use most viewed video for comments
    const topVideo = videos.sort((a, b) => b.viewCount - a.viewCount)[0]
    const comments = await fetchTopComments(topVideo.id)
    const videoTitles = videos.map((v) => v.title)

    // Call Claude
    const result = await callClaude(
      channel.channel_name,
      channel.subscriber_count,
      videoTitles,
      comments,
    )

    // Upsert into DB
    const { error: dbError } = await supabase
      .from('channel_analyses')
      .upsert({
        user_id,
        channel_id,
        sentiment_score: result.sentiment_score,
        sentiment_label: result.sentiment_label,
        audience_keywords: result.audience_keywords,
        ad_ratio: result.ad_ratio,
        insights: result.insights,
        sample_size: comments.length,
        computed_at: new Date().toISOString(),
      }, { onConflict: 'user_id,channel_id' })

    if (dbError) console.error('DB upsert error:', dbError)

    return new Response(JSON.stringify({ ...result, sample_size: comments.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('analyze-channel error:', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
