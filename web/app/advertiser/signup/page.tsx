"use client";

import { useState } from "react";
import Link from "next/link";
import { signUpAdvertiser } from "./actions";
import Logo from "@/components/Logo";

export default function AdvertiserSignupPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = await signUpAdvertiser(new FormData(e.currentTarget));
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--surface-1)" }}>
      <header className="px-8 pt-8">
        <Link href="/discover"><Logo size={20} period /></Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-[400px]">
          <div className="mb-8">
            <h1 className="text-2xl font-bold tracking-tight mb-1.5" style={{ color: "var(--ink)" }}>광고주 가입</h1>
            <p className="text-sm" style={{ color: "var(--ink-3)" }}>사업자 인증 후 크리에이터에게 제안을 보낼 수 있습니다</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--ink-4)" }}>회사명 / 브랜드명</label>
              <input name="company_name" type="text" required placeholder="예: 나이키 코리아" className="input-field" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--ink-4)" }}>사업자등록번호</label>
              <input
                name="business_number"
                type="text"
                required
                placeholder="000-00-00000"
                maxLength={12}
                className="input-field"
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
                  let formatted = digits;
                  if (digits.length > 5) formatted = `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
                  else if (digits.length > 3) formatted = `${digits.slice(0, 3)}-${digits.slice(3)}`;
                  e.target.value = formatted;
                }}
              />
              <p className="text-xs mt-1" style={{ color: "var(--ink-4)" }}>국세청 API로 실시간 검증됩니다</p>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--ink-4)" }}>기업 이메일</label>
              <input name="email" type="email" required placeholder="marketing@brand.com" className="input-field" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--ink-4)" }}>비밀번호</label>
              <input name="password" type="password" required placeholder="8자 이상" className="input-field" />
            </div>

            {error && (
              <div className="rounded-xl px-4 py-3 text-sm" style={{ background: "#FEF2F2", color: "#DC2626", border: "1px solid #FECACA" }}>
                {error}
              </div>
            )}

            <div className="pt-1">
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? "처리 중..." : "광고주로 가입하기"}
              </button>
            </div>
          </form>

          <div className="mt-5 text-sm text-center" style={{ color: "var(--ink-4)" }}>
            이미 계정이 있으신가요?{" "}
            <Link href="/advertiser/login" className="font-semibold" style={{ color: "var(--brand)" }}>로그인</Link>
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
