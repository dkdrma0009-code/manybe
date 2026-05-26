import { redirect } from "next/navigation";
import Link from "next/link";
import { getAdvertiserSession, createClient } from "@/lib/supabase-server";
import { logoutAdvertiser } from "../signup/actions";
import Logo from "@/components/Logo";

const STATUS_META: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  pending:  { label: "검토 중", color: "text-amber-700",  bg: "bg-amber-50",  dot: "bg-amber-400" },
  accepted: { label: "수락됨",  color: "text-emerald-700", bg: "bg-emerald-50", dot: "bg-emerald-500" },
  rejected: { label: "거절됨",  color: "text-red-600",    bg: "bg-red-50",    dot: "bg-red-400" },
};

function formatKRW(n: number) {
  if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(1).replace(".0", "")}억`;
  if (n >= 10_000) return `${Math.floor(n / 10_000)}만원`;
  return `${n.toLocaleString("ko-KR")}원`;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return "오늘";
  if (days === 1) return "어제";
  if (days < 7) return `${days}일 전`;
  if (days < 30) return `${Math.floor(days / 7)}주 전`;
  return `${Math.floor(days / 30)}개월 전`;
}

export default async function DashboardPage() {
  const session = await getAdvertiserSession();
  if (!session) redirect("/advertiser/login");

  const supabase = await createClient();

  const { data: proposals } = await supabase
    .from("advertiser_proposals")
    .select("id, creator_id, brand_name, message, amount, status, rejection_reason, created_at")
    .eq("advertiser_id", session.user.id)
    .order("created_at", { ascending: false });

  const creatorIds = [...new Set((proposals ?? []).map((p) => p.creator_id))];
  const { data: profiles } = creatorIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", creatorIds)
    : { data: [] };
  const { data: kits } = creatorIds.length
    ? await supabase.from("media_kits").select("user_id, slug").in("user_id", creatorIds)
    : { data: [] };

  const profileMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p.full_name || null]));
  const slugMap = Object.fromEntries((kits ?? []).map((k) => [k.user_id, k.slug]));

  const counts = { total: 0, pending: 0, accepted: 0, rejected: 0 };
  for (const p of proposals ?? []) {
    counts.total++;
    counts[p.status as keyof typeof counts]++;
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--surface-2)" }}>
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10" style={{ borderColor: "var(--border-faint)" }}>
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/discover"><Logo size={18} period /></Link>
            <span className="text-gray-200 text-xs">|</span>
            <span className="text-xs font-medium" style={{ color: "var(--ink-3)" }}>대시보드</span>
          </div>
          <nav className="flex items-center gap-1">
            <span className="text-sm hidden sm:block mr-3" style={{ color: "var(--ink-3)" }}>{session.profile.full_name}</span>
            <Link href="/advertiser/messages" className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors hover:bg-gray-100" style={{ color: "var(--ink-2)" }}>
              메시지
            </Link>
            <Link href="/discover" className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors" style={{ color: "var(--brand)", background: "var(--brand-softer)" }}>
              크리에이터 찾기
            </Link>
            <form action={logoutAdvertiser} className="ml-1">
              <button className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors hover:bg-gray-100" style={{ color: "var(--ink-4)" }}>로그아웃</button>
            </form>
          </nav>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Page title */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-extrabold tracking-tight" style={{ color: "var(--ink)" }}>보낸 제안</h1>
            <p className="text-sm mt-0.5" style={{ color: "var(--ink-3)" }}>크리에이터에게 보낸 협찬 제안 현황</p>
          </div>
          <Link href="/discover" className="hidden sm:inline-flex items-center gap-2 text-sm font-semibold text-white px-4 py-2 rounded-xl transition-colors hover:opacity-90" style={{ background: "var(--brand)" }}>
            + 새 제안 보내기
          </Link>
        </div>

        {/* 요약 카드 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: "전체",   value: counts.total,    valueColor: "var(--ink)",    border: "var(--border)" },
            { label: "검토 중", value: counts.pending,  valueColor: "#d97706",       border: "#fde68a" },
            { label: "수락됨", value: counts.accepted,  valueColor: "#059669",       border: "#a7f3d0" },
            { label: "거절됨", value: counts.rejected,  valueColor: "#dc2626",       border: "#fecaca" },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-2xl p-4 text-center" style={{ border: `1.5px solid ${s.border}` }}>
              <p className="text-3xl font-extrabold tabular-nums" style={{ color: s.valueColor }}>{s.value}</p>
              <p className="text-xs mt-1 font-medium" style={{ color: "var(--ink-3)" }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* 제안 목록 */}
        {!proposals || proposals.length === 0 ? (
          <div className="bg-white rounded-2xl p-16 text-center" style={{ border: "1px solid var(--border-faint)" }}>
            <p className="text-5xl mb-4">📭</p>
            <p className="font-bold text-gray-800 mb-1">아직 보낸 제안이 없습니다</p>
            <p className="text-sm mb-6" style={{ color: "var(--ink-3)" }}>크리에이터를 찾아 첫 제안을 보내보세요</p>
            <Link href="/discover" className="inline-block text-white font-semibold px-6 py-3 rounded-xl transition-colors hover:opacity-90 text-sm" style={{ background: "var(--brand)" }}>
              크리에이터 찾기
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {proposals.map((p) => {
              const creatorName = profileMap[p.creator_id] ?? "알 수 없음";
              const slug = slugMap[p.creator_id];
              const status = STATUS_META[p.status] ?? STATUS_META.pending;

              return (
                <Link
                  key={p.id}
                  href={`/advertiser/messages/${p.id}`}
                  className="group bg-white rounded-2xl p-5 flex items-start gap-4 transition-all hover:shadow-md"
                  style={{ border: "1px solid var(--border-faint)" }}
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0" style={{ background: "var(--brand)" }}>
                    {creatorName.charAt(0).toUpperCase()}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        {slug ? (
                          <span className="font-bold text-sm truncate" style={{ color: "var(--ink)" }}>{creatorName}</span>
                        ) : (
                          <span className="font-bold text-sm truncate" style={{ color: "var(--ink)" }}>{creatorName}</span>
                        )}
                        <span className="text-xs shrink-0" style={{ color: "var(--ink-4)" }}>· {p.brand_name}</span>
                      </div>
                      <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${status.bg} ${status.color}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                        {status.label}
                      </span>
                    </div>

                    {p.message && (
                      <p className="text-sm line-clamp-1 mb-1.5" style={{ color: "var(--ink-3)" }}>{p.message}</p>
                    )}
                    {p.status === "rejected" && p.rejection_reason && (
                      <p className="text-xs mb-1.5 font-medium text-red-500">거절 이유: {p.rejection_reason}</p>
                    )}

                    <div className="flex items-center gap-3 text-xs" style={{ color: "var(--ink-4)" }}>
                      {p.amount > 0 && (
                        <span className="font-bold" style={{ color: "var(--ink-2)" }}>{formatKRW(p.amount)}</span>
                      )}
                      <span>{timeAgo(p.created_at)}</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
