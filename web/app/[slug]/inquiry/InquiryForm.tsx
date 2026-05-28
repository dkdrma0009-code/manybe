"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { submitProposal } from "./actions";
import Logo from "@/components/Logo";

interface Props {
  slug: string;
  creatorId: string;
  creatorName: string;
  advertiserName: string;
}

interface Submitted {
  brandName: string;
  amount: number;
  message: string;
}

export default function InquiryForm({ slug, creatorId, creatorName, advertiserName }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState<Submitted | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    formData.set("creator_id", creatorId);

    const brandName = (formData.get("brand_name") as string)?.trim();
    const amount = Number(formData.get("amount") ?? 0);
    const message = (formData.get("message") as string)?.trim();

    const result = await submitProposal(formData);

    if (result.error) {
      setError(result.error);
      setLoading(false);
    } else {
      setSubmitted({ brandName, amount, message });
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen" style={{ background: "var(--surface-2)" }}>
        <header className="bg-white sticky top-0 z-10" style={{ borderBottom: "1px solid var(--border-faint)" }}>
          <div className="max-w-xl mx-auto px-6 h-14 flex items-center justify-between">
            <Link href={`/${slug}`}><Logo size={18} period /></Link>
          </div>
        </header>

        <main className="max-w-xl mx-auto px-6 py-16">
          {/* 완료 헤더 */}
          <div className="mb-8">
            <div className="w-10 h-10 rounded-full flex items-center justify-center mb-4" style={{ background: "var(--brand)" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h1 className="text-xl font-bold mb-1" style={{ color: "var(--ink)" }}>제안서를 보냈습니다</h1>
            <p className="text-sm" style={{ color: "var(--ink-3)" }}>{creatorName}님이 검토 후 응답할 예정입니다.</p>
          </div>

          {/* 제안 요약 */}
          <div className="bg-white rounded-2xl overflow-hidden mb-6" style={{ border: "1px solid var(--border-faint)" }}>
            <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--border-faint)" }}>
              <p className="text-xs font-semibold uppercase tracking-wider mb-0.5" style={{ color: "var(--ink-4)" }}>받는 크리에이터</p>
              <p className="text-sm font-semibold" style={{ color: "var(--ink)" }}>{creatorName}</p>
            </div>
            <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--border-faint)" }}>
              <p className="text-xs font-semibold uppercase tracking-wider mb-0.5" style={{ color: "var(--ink-4)" }}>브랜드명</p>
              <p className="text-sm font-semibold" style={{ color: "var(--ink)" }}>{submitted.brandName}</p>
            </div>
            {submitted.amount > 0 && (
              <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--border-faint)" }}>
                <p className="text-xs font-semibold uppercase tracking-wider mb-0.5" style={{ color: "var(--ink-4)" }}>예산</p>
                <p className="text-sm font-semibold" style={{ color: "var(--ink)" }}>
                  {submitted.amount.toLocaleString("ko-KR")}원
                </p>
              </div>
            )}
            {submitted.message && (
              <div className="px-5 py-4">
                <p className="text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--ink-4)" }}>제안 내용</p>
                <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "var(--ink-2)" }}>{submitted.message}</p>
              </div>
            )}
          </div>

          {/* 액션 버튼 */}
          <div className="flex flex-col gap-3">
            <button
              onClick={() => router.push("/advertiser/dashboard")}
              className="w-full text-sm font-semibold py-3 rounded-xl text-white transition-colors hover:opacity-90"
              style={{ background: "var(--brand)" }}
            >
              보낸 제안 목록 보기
            </button>
            <Link
              href="/discover"
              className="w-full text-sm font-semibold py-3 rounded-xl text-center transition-colors"
              style={{ border: "1px solid var(--border)", color: "var(--ink-2)" }}
            >
              다른 크리에이터 찾기
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--surface-2)" }}>
      <header className="bg-white sticky top-0 z-10" style={{ borderBottom: "1px solid var(--border-faint)" }}>
        <div className="max-w-xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href={`/${slug}`}><Logo size={18} period /></Link>
          <span className="text-xs" style={{ color: "var(--ink-4)" }}>협찬 제안</span>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-xl font-bold mb-1" style={{ color: "var(--ink)" }}>
            {creatorName}님께 제안하기
          </h1>
          <p className="text-sm" style={{ color: "var(--ink-3)" }}>{advertiserName} · 인증된 광고주</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-white rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border-faint)" }}>
            <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--border-faint)" }}>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--ink-4)" }}>
                브랜드명 *
              </label>
              <input
                name="brand_name"
                type="text"
                required
                defaultValue={advertiserName}
                placeholder="예: 나이키 코리아"
                className="w-full text-sm outline-none bg-transparent"
                style={{ color: "var(--ink)" }}
              />
            </div>
            <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--border-faint)" }}>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--ink-4)" }}>
                예산 <span className="normal-case font-normal">(선택)</span>
              </label>
              <input
                name="amount"
                type="number"
                min="0"
                step="10000"
                placeholder="예: 3000000"
                className="w-full text-sm outline-none bg-transparent"
                style={{ color: "var(--ink)" }}
              />
            </div>
            <div className="px-5 py-4">
              <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--ink-4)" }}>
                제안 내용 *
              </label>
              <textarea
                name="message"
                rows={6}
                required
                placeholder="제품 소개, 협찬 방식, 원하시는 내용을 자유롭게 작성해주세요."
                className="w-full text-sm outline-none bg-transparent resize-none"
                style={{ color: "var(--ink)" }}
              />
            </div>
          </div>

          {error && (
            <div className="rounded-xl px-4 py-3 text-sm" style={{ background: "#FEF2F2", color: "#DC2626", border: "1px solid #FECACA" }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full text-sm font-semibold py-3.5 rounded-xl text-white transition-colors hover:opacity-90 disabled:opacity-50"
            style={{ background: "var(--brand)" }}
          >
            {loading ? "전송 중..." : "제안서 보내기"}
          </button>
        </form>
      </main>
    </div>
  );
}
