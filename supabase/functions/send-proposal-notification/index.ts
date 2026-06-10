// Supabase Edge Function: send-proposal-notification
// Triggered by a Database Webhook on advertiser_proposals INSERT.
//
// Setup in Supabase Dashboard:
//   Database → Webhooks → Create webhook
//   Table: advertiser_proposals, Events: INSERT
//   URL: https://<project>.supabase.co/functions/v1/send-proposal-notification
//   HTTP Headers: x-webhook-secret = <WEBHOOK_SECRET 시크릿과 동일한 값>

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);
const WEBHOOK_SECRET = Deno.env.get('WEBHOOK_SECRET') ?? '';

// Expo 푸시 전송 — 네트워크 오류/5xx/429 시 1회 재시도,
// DeviceNotRegistered 티켓이면 죽은 토큰을 정리한다.
async function sendExpoPush(
  userId: string,
  message: Record<string, unknown>,
): Promise<string> {
  let res: Response | null = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      res = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message),
      });
      if (res.status < 500 && res.status !== 429) break;
      console.error(`expo push attempt ${attempt + 1} got ${res.status}`);
    } catch (e) {
      console.error(`expo push attempt ${attempt + 1} network error:`, e);
      res = null;
    }
    if (attempt === 0) await new Promise((r) => setTimeout(r, 500));
  }
  if (!res) return 'push:failed';

  const body = await res.json().catch(() => null);
  const ticket = body?.data;
  if (ticket?.status === 'error') {
    console.error('expo push ticket error:', ticket.message, ticket.details);
    if (ticket.details?.error === 'DeviceNotRegistered') {
      await supabase.from('profiles').update({ push_token: null }).eq('id', userId);
      console.log(`cleared stale push_token for ${userId}`);
    }
    return `push:ticket_error:${ticket.details?.error ?? 'unknown'}`;
  }
  return `push:${res.status}`;
}

Deno.serve(async (req: Request) => {
  try {
    if (WEBHOOK_SECRET) {
      if (req.headers.get('x-webhook-secret') !== WEBHOOK_SECRET) {
        return new Response('unauthorized', { status: 401 });
      }
    } else {
      console.warn('WEBHOOK_SECRET not set — skipping webhook auth');
    }

    const payload = await req.json();
    const record = payload.record;

    if (!record || record.status !== 'pending') {
      return new Response('skip', { status: 200 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('push_token')
      .eq('id', record.creator_id)
      .single();

    if (!profile?.push_token) {
      console.log(`no push token for creator ${record.creator_id} — skip`);
      return new Response('no push token', { status: 200 });
    }

    const result = await sendExpoPush(record.creator_id, {
      to: profile.push_token,
      title: '새 협찬 제안이 도착했어요',
      body: `${record.brand_name}에서 협찬 제안을 보냈어요`,
      data: {
        type: 'new_proposal',
        proposalId: record.id,
        brandName: record.brand_name,
      },
      sound: 'default',
      priority: 'high',
    });

    console.log(`proposal ${record.id} → creator ${record.creator_id}: ${result}`);
    return new Response(result, { status: 200 });
  } catch (err) {
    console.error('send-proposal-notification error:', err);
    return new Response(String(err), { status: 500 });
  }
});
