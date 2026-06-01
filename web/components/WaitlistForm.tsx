"use client";

import { useState } from "react";
import { joinWaitlist } from "@/app/waitlist/actions";

export default function WaitlistForm() {
  const [role, setRole] = useState<"creator" | "advertiser">("creator");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [already, setAlready] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    fd.set("role", role);
    const result = await joinWaitlist(fd);
    setLoading(false);
    if (result.already) { setAlready(true); setDone(true); return; }
    if (result.error) { setError(result.error); return; }
    setDone(true);
  }

  if (done) {
    return (
      <div className="text-center">
        <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "var(--brand-soft)" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
        <p className="font-bold text-lg mb-1" style={{ color: "var(--ink)" }}>
          {already ? "이미 등록되어 있습니다" : "사전등록 완료!"}
        </p>
        <p className="text-sm" style={{ color: "var(--ink-3)" }}>
          출시 소식을 가장 먼저 알려드릴게요.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* 역할 선택 */}
      <div className="flex gap-2 mb-4">
        {(["creator", "advertiser"] as const).map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRole(r)}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={role === r
              ? { background: "var(--brand)", color: "#fff" }
              : { background: "var(--surface-2)", color: "var(--ink-3)" }}
          >
            {r === "creator" ? "크리에이터" : "광고주"}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          name="email"
          type="email"
          required
          placeholder="이메일 주소 입력"
          className="flex-1 text-sm px-4 py-3 rounded-xl outline-none"
          style={{ background: "var(--surface-2)", color: "var(--ink)", border: "1.5px solid var(--border)" }}
        />
        <button
          type="submit"
          disabled={loading}
          className="text-sm font-bold px-5 py-3 rounded-xl text-white shrink-0 disabled:opacity-50 hover:opacity-90 transition-opacity"
          style={{ background: "var(--brand)" }}
        >
          {loading ? "..." : "사전등록"}
        </button>
      </div>

      {error && (
        <p className="text-xs mt-2" style={{ color: "#DC2626" }}>{error}</p>
      )}
      <p className="text-xs mt-3 text-center" style={{ color: "var(--ink-4)" }}>
        스팸 없음. 출시 알림만 보내드립니다.
      </p>
    </form>
  );
}
