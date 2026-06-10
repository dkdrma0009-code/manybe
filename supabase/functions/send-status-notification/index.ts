// Supabase Edge Function: send-status-notification
// Triggered by a Database Webhook on advertiser_proposals UPDATE.
//
// Setup in Supabase Dashboard:
//   Database → Webhooks → Create webhook
//   Table: advertiser_proposals, Events: UPDATE
//   URL: https://<project>.supabase.co/functions/v1/send-status-notification
//   HTTP Headers: x-webhook-secret = <WEBHOOK_SECRET 시크릿과 동일한 값>

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''
const WEBHOOK_SECRET = Deno.env.get('WEBHOOK_SECRET') ?? ''

// Expo 푸시 전송 — 네트워크 오류/5xx/429 시 1회 재시도,
// DeviceNotRegistered 티켓이면 죽은 토큰을 정리한다.
async function sendExpoPush(
  userId: string,
  message: Record<string, unknown>,
): Promise<string> {
  let res: Response | null = null
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      res = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message),
      })
      if (res.status < 500 && res.status !== 429) break
      console.error(`expo push attempt ${attempt + 1} got ${res.status}`)
    } catch (e) {
      console.error(`expo push attempt ${attempt + 1} network error:`, e)
      res = null
    }
    if (attempt === 0) await new Promise((r) => setTimeout(r, 500))
  }
  if (!res) return 'push:failed'

  const body = await res.json().catch(() => null)
  const ticket = body?.data
  if (ticket?.status === 'error') {
    console.error('expo push ticket error:', ticket.message, ticket.details)
    if (ticket.details?.error === 'DeviceNotRegistered') {
      await supabase.from('profiles').update({ push_token: null }).eq('id', userId)
      console.log(`cleared stale push_token for ${userId}`)
    }
    return `push:ticket_error:${ticket.details?.error ?? 'unknown'}`
  }
  return `push:${res.status}`
}

Deno.serve(async (req: Request) => {
  try {
    if (WEBHOOK_SECRET) {
      if (req.headers.get('x-webhook-secret') !== WEBHOOK_SECRET) {
        return new Response('unauthorized', { status: 401 })
      }
    } else {
      console.warn('WEBHOOK_SECRET not set — skipping webhook auth')
    }

    const payload = await req.json()
    const record  = payload.record
    const old     = payload.old_record

    // pending → accepted / rejected 상태 변경만 처리
    if (old?.status !== 'pending' || !['accepted', 'rejected'].includes(record?.status)) {
      return new Response('skip', { status: 200 })
    }

    const isAccepted = record.status === 'accepted'
    const statusLabel = isAccepted ? '수락' : '거절'

    // 광고주 push_token 조회
    const { data: advertiserProfile } = await supabase
      .from('profiles')
      .select('push_token')
      .eq('id', record.advertiser_id)
      .single()

    const results: string[] = []

    // ── 1. Expo 푸시 알림 (광고주 앱) ─────────────────────────────────────
    if (advertiserProfile?.push_token) {
      const result = await sendExpoPush(record.advertiser_id, {
        to: advertiserProfile.push_token,
        title: isAccepted ? '협찬 제안이 수락됐어요 ✅' : '협찬 제안이 거절됐어요',
        body: `${record.brand_name} 제안을 크리에이터가 ${statusLabel}했습니다`,
        data: {
          type: 'proposal_status',
          proposalId: record.id,
          status: record.status,
        },
        sound: 'default',
        priority: 'high',
      })
      results.push(result)
    } else {
      console.log(`no push token for advertiser ${record.advertiser_id}`)
    }

    // ── 2. 이메일 (Resend) — 웹 광고주의 주 채널, RESEND_API_KEY 있을 때만 ──
    if (RESEND_API_KEY) {
      const userRes = await fetch(
        `${Deno.env.get('SUPABASE_URL')}/auth/v1/admin/users/${record.advertiser_id}`,
        {
          headers: {
            Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
            apikey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
          },
        },
      )
      const userData = await userRes.json()
      const email = userData?.email

      if (email) {
        const subject = isAccepted
          ? `[매니비] ${record.brand_name} 협찬 제안이 수락됐습니다`
          : `[매니비] ${record.brand_name} 협찬 제안이 거절됐습니다`

        const html = `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
            <h2 style="color:${isAccepted ? '#16a34a' : '#dc2626'};margin-bottom:8px">
              ${isAccepted ? '✅ 제안이 수락됐습니다' : '❌ 제안이 거절됐습니다'}
            </h2>
            <p style="color:#111;font-size:15px">
              크리에이터가 <strong>${record.brand_name}</strong> 협찬 제안을
              ${isAccepted ? '수락했습니다. 채팅에서 다음 단계를 진행하세요.' : '거절했습니다.'}
            </p>
          </div>`

        const emailRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: '매니비 <noreply@manybe.site>',
            to: email,
            subject,
            html,
          }),
        })
        if (!emailRes.ok) {
          console.error('resend email failed:', emailRes.status, await emailRes.text())
        }
        results.push(`email:${emailRes.status}`)
      } else {
        console.log(`no email for advertiser ${record.advertiser_id}`)
      }
    } else {
      console.warn('RESEND_API_KEY not set — email notification skipped')
    }

    console.log(`proposal ${record.id} status=${record.status}: ${results.join(', ')}`)
    return new Response(JSON.stringify({ ok: true, results }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('send-status-notification error:', err)
    return new Response(String(err), { status: 500 })
  }
})
