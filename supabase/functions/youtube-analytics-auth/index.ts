// Supabase Edge Function: youtube-analytics-auth
// 앱에서 받은 Google OAuth auth code를 토큰으로 교환하고
// social_channels 테이블에 저장합니다.
//
// Required secrets:
//   GOOGLE_CLIENT_ID      (Google Cloud Console Web Client ID)
//   GOOGLE_CLIENT_SECRET  (Google Cloud Console Web Client Secret)
//   SUPABASE_SERVICE_ROLE_KEY (auto-injected)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

const GOOGLE_CLIENT_ID     = Deno.env.get('GOOGLE_CLIENT_ID')!
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET')!
const TOKEN_URL = 'https://oauth2.googleapis.com/token'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

// access_token이 만료됐을 때 refresh_token으로 갱신
export async function refreshAccessToken(refreshToken: string): Promise<{
  access_token: string
  expires_in: number
} | null> {
  const res = await fetch(TOKEN_URL, {
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
  if (!data.access_token) return null
  return { access_token: data.access_token, expires_in: data.expires_in ?? 3600 }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const { code, redirectUri, userId } = await req.json()
    if (!code || !redirectUri || !userId) {
      return json({ error: 'code, redirectUri, userId required' }, 400)
    }

    // 1. auth code → access_token + refresh_token
    const tokenRes = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id:     GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri:  redirectUri,
        grant_type:    'authorization_code',
      }),
    })
    const tokenData = await tokenRes.json()
    if (tokenData.error) return json({ error: tokenData.error_description ?? tokenData.error }, 400)

    const { access_token, refresh_token, expires_in } = tokenData
    if (!access_token) return json({ error: 'No access_token received' }, 400)

    const expiresAt = new Date(Date.now() + (expires_in ?? 3600) * 1000).toISOString()

    // 2. 토큰을 social_channels에 저장 (youtube 채널 행 업데이트)
    const { error: dbErr } = await supabase
      .from('social_channels')
      .update({
        youtube_access_token:    access_token,
        youtube_refresh_token:   refresh_token ?? null,
        youtube_token_expires_at: expiresAt,
      })
      .eq('user_id', userId)
      .eq('platform', 'youtube')

    if (dbErr) return json({ error: dbErr.message }, 500)

    return json({ success: true })
  } catch (err) {
    console.error('youtube-analytics-auth error:', err)
    return json({ error: String(err) }, 500)
  }
})
