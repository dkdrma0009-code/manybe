import { NextResponse } from "next/server";

// Instagram 로그인 OAuth 브리지.
// Instagram은 HTTPS redirect만 허용하므로, 여기서 받은 code를
// 앱 커스텀 스킴(manybe://auth/instagram)으로 되돌려보낸다.
export function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  const params = new URLSearchParams();
  if (code) params.set("code", code);
  if (error) params.set("error", error);

  return NextResponse.redirect(`manybe://auth/instagram?${params.toString()}`);
}
