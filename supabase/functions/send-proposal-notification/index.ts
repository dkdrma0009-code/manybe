// Supabase Edge Function: send-proposal-notification
// Triggered by a Database Webhook on advertiser_proposals INSERT.
//
// Setup in Supabase Dashboard:
//   Database → Webhooks → Create webhook
//   Table: advertiser_proposals, Events: INSERT
//   URL: https://<project>.supabase.co/functions/v1/send-proposal-notification

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

Deno.serve(async (req: Request) => {
  try {
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
      return new Response('no push token', { status: 200 });
    }

    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
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
      }),
    });

    const body = await res.text();
    return new Response(body, { status: res.status });
  } catch (err) {
    console.error('send-proposal-notification error:', err);
    return new Response(String(err), { status: 500 });
  }
});
