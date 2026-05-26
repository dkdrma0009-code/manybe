// Supabase Edge Function: send-status-notification
// Triggered by a Database Webhook on advertiser_proposals UPDATE.
//
// Setup in Supabase Dashboard:
//   Database → Webhooks → Create webhook
//   Table: advertiser_proposals, Events: UPDATE
//   URL: https://<project>.supabase.co/functions/v1/send-status-notification
//
// Required secrets:
//   RESEND_API_KEY

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;

Deno.serve(async (req: Request) => {
  try {
    const payload = await req.json();
    const record = payload.record;
    const old = payload.old_record;

    // 상태가 pending → accepted/rejected 로 변경된 경우만 처리
    if (old?.status !== 'pending' || !['accepted', 'rejected'].includes(record?.status)) {
      return new Response('skip', { status: 200 });
    }

    const isAccepted = record.status === 'accepted';
    const subject = isAccepted
      ? `[매니비] ${record.brand_name} 협찬 제안이 수락됐습니다`
      : `[매니비] ${record.brand_name} 협찬 제안이 거절됐습니다`;

    const rejectionLine = !isAccepted && record.rejection_reason
      ? `<p style="color:#666;margin-top:8px;">거절 이유: <strong>${record.rejection_reason}</strong></p>`
      : '';

    const html = `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
        <h2 style="color:${isAccepted ? '#16a34a' : '#dc2626'};margin-bottom:8px">
          ${isAccepted ? '✅ 제안이 수락됐습니다' : '❌ 제안이 거절됐습니다'}
        </h2>
        <p style="color:#111;font-size:15px">
          크리에이터가 <strong>${record.brand_name}</strong> 협찬 제안을
          ${isAccepted ? '수락했습니다. 채팅에서 다음 단계를 진행하세요.' : '거절했습니다.'}
        </p>
        ${rejectionLine}
        <a href="https://www.manybe.site/advertiser/messages/${record.id}"
           style="display:inline-block;margin-top:24px;background:${isAccepted ? '#6C63FF' : '#6b7280'};color:#fff;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:700">
          대화 보기
        </a>
      </div>`;

    // 광고주 이메일 가져오기 (auth.users는 서비스 롤로만 접근 가능)
    const userRes = await fetch(
      `${Deno.env.get('SUPABASE_URL')}/auth/v1/admin/users/${record.advertiser_id}`,
      { headers: { Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`, apikey: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')! } }
    );
    const userData = await userRes.json();
    const email = userData?.email;

    if (!email) return new Response('no email', { status: 200 });

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: '매니비 <noreply@manybe.site>',
        to: email,
        subject,
        html,
      }),
    });

    const body = await res.text();
    return new Response(body, { status: res.status });
  } catch (err) {
    console.error('send-status-notification error:', err);
    return new Response(String(err), { status: 500 });
  }
});
