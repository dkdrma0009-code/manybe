"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { loginAdvertiser } from "../signup/actions";
import Logo from "@/components/Logo";

const PERKS = [
  { icon: "🔍", text: "검증된 크리에이터 직접 검색" },
  { icon: "💬", text: "제안 → 협의 → 계약 원스톱" },
  { icon: "📊", text: "채널 통계 기반 매칭" },
];

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
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-[480px] xl:w-[520px] shrink-0 flex-col justify-between p-12"
        style={{ background: "linear-gradient(150deg, #6C63FF 0%, #4A44CC 100%)" }}>
        <Link href="/"><Logo size={22} onDark /></Link>

        <div>
          <p className="text-white/60 text-sm font-semibold uppercase tracking-widest mb-4">광고주 플랫폼</p>
          <h2 className="text-white text-4xl font-extrabold leading-tight tracking-tight mb-6">
            크리에이터를 찾는<br />가장 스마트한 방법
          </h2>
          <p className="text-white/70 text-base leading-relaxed mb-10">
            국내 크리에이터의 채널 통계, 카테고리, 협찬 이력을 기반으로 최적의 파트너를 찾아보세요.
          </p>
          <div className="space-y-4">
            {PERKS.map((p) => (
              <div key={p.text} className="flex items-center gap-3">
                <span className="text-xl">{p.icon}</span>
                <span className="text-white/80 text-sm font-medium">{p.text}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-white/30 text-xs">© 2026 매니비</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-[#FAFAFA]">
        {/* Mobile logo */}
        <Link href="/" className="mb-10 lg:hidden"><Logo size={32} /></Link>

        <div className="w-full max-w-[400px]">
          <div className="mb-8">
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight mb-1.5">로그인</h1>
            <p className="text-sm text-gray-500">
              {next ? "제안을 보내려면 로그인이 필요합니다" : "광고주 계정으로 로그인하세요"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">이메일</label>
              <input name="email" type="email" required placeholder="가입한 이메일" className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">비밀번호</label>
              <input name="password" type="password" required placeholder="비밀번호" className="input-field" />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <div className="pt-1">
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? "로그인 중..." : "로그인"}
              </button>
            </div>

            <p className="text-center text-sm text-gray-500 pt-1">
              계정이 없으신가요?{" "}
              <Link href="/advertiser/signup" className="font-semibold" style={{ color: "var(--brand)" }}>
                회원가입
              </Link>
            </p>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-400">
              크리에이터라면 <span className="text-gray-600 font-medium">매니비 앱</span>을 이용해주세요
            </p>
          </div>
        </div>
      </div>
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
