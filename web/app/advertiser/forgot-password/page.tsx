"use client";

import { useState } from "react";
import Link from "next/link";
import Logo from "@/components/Logo";
import { getSupabase } from "@/lib/supabase";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = getSupabase();
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/advertiser/reset-password`,
    });
    setLoading(false);
    if (error) {
      setError("이메일 전송에 실패했습니다. 다시 시도해주세요.");
    } else {
      setSent(true);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-[#FAFAFA]">
      <div className="w-full max-w-[400px]">
        <Link href="/advertiser/login" className="inline-block mb-8">
          <Logo size={22} />
        </Link>

        {sent ? (
          <div className="text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#ECEFFE] flex items-center justify-center mx-auto mb-6 text-2xl">
              ✉️
            </div>
            <h1 className="text-xl font-extrabold text-gray-900 mb-2">이메일을 확인해주세요</h1>
            <p className="text-sm text-gray-500 mb-8">
              <span className="font-semibold text-gray-700">{email}</span>으로<br />
              비밀번호 재설정 링크를 보냈습니다.
            </p>
            <Link
              href="/advertiser/login"
              className="text-sm font-semibold"
              style={{ color: "var(--brand)" }}
            >
              로그인으로 돌아가기
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight mb-1.5">비밀번호 찾기</h1>
              <p className="text-sm text-gray-500">가입한 이메일로 재설정 링크를 보내드립니다.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">이메일</label>
                <input
                  type="email"
                  required
                  placeholder="가입한 이메일"
                  className="input-field"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600">
                  {error}
                </div>
              )}

              <div className="pt-1">
                <button type="submit" disabled={loading} className="btn-primary">
                  {loading ? "전송 중..." : "재설정 링크 보내기"}
                </button>
              </div>

              <p className="text-center text-sm text-gray-500 pt-1">
                <Link href="/advertiser/login" className="font-semibold" style={{ color: "var(--brand)" }}>
                  로그인으로 돌아가기
                </Link>
              </p>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
