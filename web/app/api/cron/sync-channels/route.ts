import { NextResponse } from "next/server";

// Vercel Cron (매일 18:00 UTC = 03:00 KST) → Supabase sync-channels 배치 호출.
// 토큰 갱신 + 채널 지표 재동기화. 실제 작업은 Supabase Edge Function에서
// (OAuth 시크릿이 거기에만 있으므로). 여기는 인증된 트리거 역할.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  // Vercel Cron은 CRON_SECRET 설정 시 Authorization: Bearer <CRON_SECRET> 를 보냄
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return new NextResponse("unauthorized", { status: 401 });
    }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const webhookSecret = process.env.WEBHOOK_SECRET;
  if (!supabaseUrl || !webhookSecret) {
    return NextResponse.json({ error: "missing config" }, { status: 500 });
  }

  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/sync-channels`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        "x-webhook-secret": webhookSecret,
        "Content-Type": "application/json",
      },
    });
    const body = await res.json().catch(() => ({}));
    return NextResponse.json({ triggered: true, status: res.status, result: body });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
