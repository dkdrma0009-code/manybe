// Supabase Edge Function: send-chat-notification
// Triggered by a Database Webhook on chat_messages INSERT.
// 보낸 사람의 반대편(크리에이터↔광고주)에게 푸시를 보낸다.
//
// Setup in Supabase Dashboard:
//   Database → Webhooks → Create webhook
//   Table: chat_messages, Events: INSERT
//   URL: https://<project>.supabase.co/functions/v1/send-chat-notification
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
    if (!record?.thread_id || !record?.sender_role) {
      return new Response('skip', { status: 200 });
    }

    // 스레드 → 제안 → 양쪽 당사자 식별
    const { data: thread } = await supabase
      .from('message_threads')
      .select('proposal_id, creator_id')
      .eq('id', record.thread_id)
      .single();
    if (!thread) return new Response('no thread', { status: 200 });

    const { data: proposal } = await supabase
      .from('advertiser_proposals')
      .select('brand_name, advertiser_id, creator_id, message')
      .eq('id', thread.proposal_id)
      .single();
    if (!proposal) return new Response('no proposal', { status: 200 });

    // 스레드 생성 시 자동 삽입되는 원본 제안 메시지는 제안 도착 푸시와 중복 — 스킵
    if (record.sender_role === 'brand' && record.content === proposal.message) {
      return new Response('skip initial proposal message', { status: 200 });
    }

    const recipientId = record.sender_role === 'brand'
      ? proposal.creator_id
      : proposal.advertiser_id;

    const { data: recipient } = await supabase
      .from('profiles')
      .select('push_token, full_name')
      .eq('id', recipientId)
      .single();

    if (!recipient?.push_token) {
      console.log(`no push token for ${recipientId} — skip`);
      return new Response('no push token', { status: 200 });
    }

    // 보낸 쪽 표시 이름: 브랜드면 brand_name, 크리에이터면 프로필 이름
    let senderName = proposal.brand_name;
    if (record.sender_role === 'creator') {
      const { data: sender } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', proposal.creator_id)
        .single();
      senderName = sender?.full_name ?? '크리에이터';
    }

    const preview = String(record.content ?? '').slice(0, 80);
    const result = await sendExpoPush(recipientId, {
      to: recipient.push_token,
      title: `💬 ${senderName}`,
      body: preview,
      data: {
        type: 'chat_message',
        proposalId: thread.proposal_id,
        threadId: record.thread_id,
      },
      sound: 'default',
      priority: 'high',
    });

    console.log(`chat msg → ${recipientId}: ${result}`);
    return new Response(result, { status: 200 });
  } catch (err) {
    console.error('send-chat-notification error:', err);
    return new Response(String(err), { status: 500 });
  }
});
