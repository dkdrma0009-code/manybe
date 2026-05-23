"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { loginAdvertiser } from "../signup/actions";

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
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-100 py-4 px-6">
        <div className="max-w-xl mx-auto flex items-center gap-2">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#6C63FF] flex items-center justify-center">
              <span className="text-white font-bold text-xs">M</span>
            </div>
            <span className="font-bold text-gray-900 text-sm">매니비</span>
          </Link>
          <span className="text-gray-300 text-sm">·</span>
          <span className="text-xs text-gray-500">광고주 플랫폼</span>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-extrabold text-gray-900 mb-2">광고주 로그인</h1>
            <p className="text-sm text-gray-500">
              {next ? "제안을 보내려면 로그인이 필요합니다" : "크리에이터를 찾아보세요"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm p-8 space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">이메일</label>
              <input
                name="email"
                type="email"
                required
                placeholder="가입한 이메일"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#6C63FF] focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">비밀번호</label>
              <input
                name="password"
                type="password"
                required
                placeholder="비밀번호"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#6C63FF] focus:border-transparent"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#6C63FF] text-white font-bold py-3.5 rounded-xl hover:bg-[#5B53EE] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? "로그인 중..." : "로그인"}
            </button>

            <p className="text-center text-sm text-gray-500">
              계정이 없으신가요?{" "}
              <Link href="/advertiser/signup" className="text-[#6C63FF] font-semibold hover:underline">
                광고주 회원가입
              </Link>
            </p>
          </form>

          <div className="mt-6 bg-[#F5F3FF] rounded-2xl p-5">
            <p className="text-xs font-semibold text-[#6C63FF] mb-1">매니비 광고주 플랫폼이란?</p>
            <p className="text-xs text-gray-600 leading-relaxed">
              검증된 광고주만 가입하고, 크리에이터에게 직접 협찬 제안을 보낼 수 있습니다.
              스팸 없는 신뢰 기반 매칭 플랫폼입니다.
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
