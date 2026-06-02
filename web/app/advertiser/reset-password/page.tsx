"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Logo from "@/components/Logo";
import { getSupabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [ready, setReady] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const supabase = getSupabase();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) return setError("비밀번호가 일치하지 않습니다.");
    if (password.length < 8) return setError("비밀번호는 8자 이상이어야 합니다.");
    setError(null);
    setLoading(true);
    const supabase = getSupabase();
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setError("비밀번호 변경에 실패했습니다. 링크가 만료됐을 수 있습니다.");
    } else {
      setDone(true);
      setTimeout(() => router.push("/advertiser/login"), 2000);
    }
  }

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#5566DF] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-gray-500">링크 확인 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-[#FAFAFA]">
      <div className="w-full max-w-[400px]">
        <Link href="/advertiser/login" className="inline-block mb-8">
          <Logo size={22} />
        </Link>

        {done ? (
          <div className="text-center">
            <div className="w-14 h-14 rounded-2xl bg-green-50 flex items-center justify-center mx-auto mb-6 text-3xl">✓</div>
            <h1 className="text-xl font-extrabold text-gray-900 mb-2">비밀번호가 변경됐습니다</h1>
            <p className="text-sm text-gray-500">로그인 페이지로 이동합니다...</p>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight mb-1.5">새 비밀번호 설정</h1>
              <p className="text-sm text-gray-500">8자 이상으로 입력해주세요.</p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">새 비밀번호</label>
                <input type="password" required placeholder="8자 이상" className="input-field"
                  value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">비밀번호 확인</label>
                <input type="password" required placeholder="동일하게 입력" className="input-field"
                  value={confirm} onChange={(e) => setConfirm(e.target.value)} />
              </div>
              {error && (
                <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600">{error}</div>
              )}
              <div className="pt-1">
                <button type="submit" disabled={loading} className="btn-primary">
                  {loading ? "변경 중..." : "비밀번호 변경"}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
