"use client";

import { useState } from "react";
import Link from "next/link";
import { submitProposal } from "./actions";
import Logo from "@/components/Logo";

interface Props {
  slug: string;
  creatorId: string;
  creatorName: string;
  advertiserName: string;
}

export default function InquiryForm({ slug, creatorId, creatorName, advertiserName }: Props) {
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    formData.set("creator_id", creatorId);

    const result = await submitProposal(formData);

    if (result.error) {
      setError(result.error);
    } else {
      setSubmitted(true);
    }
    setLoading(false);
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 rounded-2xl bg-[#6C63FF] flex items-center justify-center mx-auto mb-6">
            <span className="text-white text-2xl">✓</span>
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900 mb-2">제안서가 전달되었습니다</h1>
          <p className="text-gray-500 text-sm mb-8">
            {creatorName}님이 확인 후 앱에서 응답할 예정입니다.
          </p>
          <Link
            href={`/${slug}`}
            className="inline-block bg-[#6C63FF] text-white font-semibold px-6 py-3 rounded-xl hover:bg-[#5B53EE] transition-colors"
          >
            미디어 키트로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 py-4 px-6">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <Link href={`/${slug}`}><Logo size={28} /></Link>
          <span className="text-xs text-gray-400">협찬 제안</span>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-2xl font-extrabold text-gray-900 mb-1">
            {creatorName}님께 제안하기
          </h1>
          <p className="text-gray-500 text-sm">{advertiserName} · 인증된 광고주</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="bg-white rounded-2xl p-6 shadow-sm space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                브랜드명 <span className="text-[#6C63FF]">*</span>
              </label>
              <input
                name="brand_name"
                type="text"
                required
                defaultValue={advertiserName}
                placeholder="예: 나이키 코리아"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#6C63FF] focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                예산 <span className="text-gray-400 font-normal">(원, 선택)</span>
              </label>
              <input
                name="amount"
                type="number"
                min="0"
                step="10000"
                placeholder="예: 3000000"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#6C63FF] focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                제안 내용
              </label>
              <textarea
                name="message"
                rows={6}
                placeholder="제품 소개, 협찬 방식, 원하시는 내용을 자유롭게 작성해주세요."
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#6C63FF] focus:border-transparent resize-none"
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#6C63FF] text-white font-bold py-4 rounded-xl hover:bg-[#5B53EE] transition-colors disabled:opacity-60 disabled:cursor-not-allowed text-base"
          >
            {loading ? "전송 중..." : "제안서 보내기"}
          </button>
        </form>
      </main>

      <footer className="text-center py-8 text-xs text-gray-400">
        Powered by{" "}
        <Link href="/" className="text-[#6C63FF] font-semibold hover:underline">
          매니비
        </Link>
      </footer>
    </div>
  );
}
