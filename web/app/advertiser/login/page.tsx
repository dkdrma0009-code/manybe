"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { loginAdvertiser } from "../signup/actions";
import Logo from "@/components/Logo";

function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "";
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    if (next) formData.set("next", next);
    const result = await loginAdvertiser(formData);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--surface-1)" }}>
      {/* 상단 로고 */}
      <header className="px-8 pt-8">
        <Link href="/discover"><Logo size={20} period /></Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-[400px]">
          <div className="mb-8">
            <h1 className="text-2xl font-bold tracking-tight mb-1.5" style={{ color: "var(--ink)" }}>로그인</h1>
            <p className="text-sm" style={{ color: "var(--ink-3)" }}>
              {next ? "제안을 보내려면 로그인이 필요합니다" : "광고주 계정으로 계속하기"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--ink-4)" }}>이메일</label>
              <input name="email" type="email" required placeholder="이메일 주소" className="input-field" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--ink-4)" }}>비밀번호</label>
              <input name="password" type="password" required placeholder="비밀번호" className="input-field" />
            </div>

            {error && (
              <div className="rounded-xl px-4 py-3 text-sm" style={{ background: "#FEF2F2", color: "#DC2626", border: "1px solid #FECACA" }}>
                {error}
              </div>
            )}

            <div className="pt-1">
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? "로그인 중..." : "로그인"}
              </button>
            </div>
          </form>

          <div className="mt-5 flex items-center justify-between text-sm">
            <span style={{ color: "var(--ink-4)" }}>
              계정이 없으신가요?{" "}
              <Link href="/advertiser/signup" className="font-semibold" style={{ color: "var(--brand)" }}>가입하기</Link>
            </span>
            <Link href="/advertiser/forgot-password" className="font-medium" style={{ color: "var(--ink-3)" }}>비밀번호 찾기</Link>
          </div>

          <div className="mt-8 pt-6 text-center" style={{ borderTop: "1px solid var(--border-faint)" }}>
            <p className="text-xs" style={{ color: "var(--ink-4)" }}>
              크리에이터라면{" "}
              <span className="font-medium" style={{ color: "var(--ink-3)" }}>매니비 앱</span>을 이용해주세요
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function AdvertiserLoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
