"use client";

import { useState } from "react";
import Link from "next/link";
import { signUpAdvertiser } from "./actions";

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
            <h1 className="text-2xl font-extrabold text-gray-900 mb-2">광고주 회원가입</h1>
            <p className="text-sm text-gray-500">검증된 광고주만 크리에이터에게 제안을 보낼 수 있습니다</p>
          </div>

          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm p-8 space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                회사명 / 브랜드명 <span className="text-[#6C63FF]">*</span>
              </label>
              <input
                name="company_name"
                type="text"
                required
                placeholder="예: 나이키 코리아"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#6C63FF] focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                기업 이메일 <span className="text-[#6C63FF]">*</span>
              </label>
              <input
                name="email"
                type="email"
                required
                placeholder="예: marketing@brand.com"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#6C63FF] focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                비밀번호 <span className="text-[#6C63FF]">*</span>
              </label>
              <input
                name="password"
                type="password"
                required
                placeholder="8자 이상"
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
              {loading ? "처리 중..." : "광고주로 가입하기"}
            </button>

            <p className="text-center text-sm text-gray-500">
              이미 계정이 있으신가요?{" "}
              <Link href="/advertiser/login" className="text-[#6C63FF] font-semibold hover:underline">
                로그인
              </Link>
            </p>
          </form>

          <p className="text-center text-xs text-gray-400 mt-6">
            크리에이터라면{" "}
            <span className="text-gray-600 font-medium">매니비 앱</span>을 이용해주세요.
          </p>
        </div>
      </main>
    </div>
  );
}
