import { redirect } from "next/navigation";
import Link from "next/link";
import { getAdvertiserSession, createClient } from "@/lib/supabase-server";
import { withdrawProposal } from "./actions";
import AdvertiserNav from "@/components/AdvertiserNav";

const STATUS_META: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  pending:  { label: "검토 중", color: "text-amber-700",  bg: "bg-amber-50",  dot: "bg-amber-400" },
  accepted: { label: "수락됨",  color: "text-emerald-700", bg: "bg-emerald-50", dot: "bg-emerald-500" },
  rejected: { label: "거절됨",  color: "text-red-600",    bg: "bg-red-50",    dot: "bg-red-400" },
};

const FILTER_TABS = [
  { key: "all",      label: "전체" },
  { key: "pending",  label: "검토 중" },
  { key: "accepted", label: "수락됨" },
  { key: "rejected", label: "거절됨" },
];

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

interface SearchParams { filter?: string }

export default async function DashboardPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const [session, params] = await Promise.all([getAdvertiserSession(), searchParams]);
  if (!session) redirect("/advertiser/login");

  const activeFilter = params.filter ?? "all";
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

  const filtered = (proposals ?? []).filter((p) => activeFilter === "all" || p.status === activeFilter);

  return (
    <div className="min-h-screen" style={{ background: "var(--surface-2)" }}>
      <AdvertiserNav userName={session.profile.full_name ?? ""} current="dashboard" />

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* 페이지 타이틀 + 새 제안 버튼 */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold tracking-tight" style={{ color: "var(--ink)" }}>보낸 제안</h1>
            <p className="text-sm mt-0.5" style={{ color: "var(--ink-3)" }}>크리에이터에게 보낸 협찬 제안 현황</p>
          </div>
          <Link href="/discover" className="hidden sm:inline-flex items-center gap-2 text-sm font-semibold text-white px-4 py-2 rounded-xl hover:opacity-90" style={{ background: "var(--brand)" }}>
            + 새 제안
          </Link>
        </div>

        {/* 요약 카드 */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { label: "전체",    value: counts.total },
            { label: "검토 중", value: counts.pending },
            { label: "수락됨",  value: counts.accepted },
            { label: "거절됨",  value: counts.rejected },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl p-4 text-center" style={{ border: "1px solid var(--border-faint)" }}>
              <p className="text-2xl font-bold tabular-nums" style={{ color: "var(--ink)" }}>{s.value}</p>
              <p className="text-xs mt-0.5 font-medium" style={{ color: "var(--ink-4)" }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* 상태 필터 탭 */}
        <div className="flex gap-1 mb-4">
          {FILTER_TABS.map((tab) => {
            const count = tab.key === "all" ? counts.total : counts[tab.key as keyof typeof counts];
            const isActive = activeFilter === tab.key;
            return (
              <Link
                key={tab.key}
                href={`/advertiser/dashboard${tab.key === "all" ? "" : `?filter=${tab.key}`}`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                style={isActive
                  ? { background: "var(--ink)", color: "#fff" }
                  : { color: "var(--ink-3)" }}
              >
                {tab.label}
                <span className="text-xs tabular-nums" style={{ opacity: 0.6 }}>{count}</span>
              </Link>
            );
          })}
        </div>

        {/* 제안 목록 */}
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl p-16 text-center" style={{ border: "1px solid var(--border-faint)" }}>
            <p className="font-semibold mb-1" style={{ color: "var(--ink-2)" }}>
              {activeFilter === "all" ? "아직 보낸 제안이 없습니다" : `${FILTER_TABS.find(t => t.key === activeFilter)?.label} 제안이 없습니다`}
            </p>
            <p className="text-sm mb-6" style={{ color: "var(--ink-3)" }}>크리에이터를 찾아 첫 제안을 보내보세요</p>
            <Link href="/discover" className="inline-block text-white font-semibold px-6 py-2.5 rounded-xl text-sm hover:opacity-90" style={{ background: "var(--brand)" }}>
              크리에이터 찾기
            </Link>
          </div>
        ) : (
          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border-faint)" }}>
            {filtered.map((p, idx) => {
              const creatorName = profileMap[p.creator_id] ?? "알 수 없음";
              const slug = slugMap[p.creator_id];
              const status = STATUS_META[p.status] ?? STATUS_META.pending;

              return (
                <div
                  key={p.id}
                  className="bg-white flex items-center gap-4 px-5 py-4 transition-colors hover:bg-[#FAFAFA]"
                  style={{ borderTop: idx === 0 ? "none" : "1px solid var(--border-faint)" }}
                >
                  {/* 아바타 */}
                  {slug ? (
                    <img src={`https://i.pravatar.cc/72?u=${encodeURIComponent(slug)}`} alt={creatorName} width={36} height={36} className="w-9 h-9 rounded-lg object-cover shrink-0" />
                  ) : (
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-semibold text-sm shrink-0" style={{ background: "var(--ink)" }}>
                      {creatorName.charAt(0).toUpperCase()}
                    </div>
                  )}

                  {/* 정보 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-semibold text-sm truncate" style={{ color: "var(--ink)" }}>{creatorName}</span>
                      <span className="text-xs shrink-0" style={{ color: "var(--ink-4)" }}>· {p.brand_name}</span>
                    </div>
                    {p.message && (
                      <p className="text-xs line-clamp-1" style={{ color: "var(--ink-3)" }}>{p.message}</p>
                    )}
                    {p.status === "rejected" && p.rejection_reason && (
                      <p className="text-xs mt-0.5 font-medium" style={{ color: "#DC2626" }}>거절 이유: {p.rejection_reason}</p>
                    )}
                  </div>

                  {/* 금액 + 날짜 */}
                  <div className="hidden sm:flex flex-col items-end gap-0.5 shrink-0">
                    {p.amount > 0 && (
                      <span className="text-sm font-semibold tabular-nums" style={{ color: "var(--ink)" }}>{formatKRW(p.amount)}</span>
                    )}
                    <span className="text-xs" style={{ color: "var(--ink-4)" }}>{timeAgo(p.created_at)}</span>
                  </div>

                  {/* 상태 뱃지 */}
                  <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${status.bg} ${status.color}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                    {status.label}
                  </span>

                  {/* 액션 버튼 */}
                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      href={`/advertiser/messages/${p.id}`}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors hover:bg-gray-100"
                      style={{ color: "var(--ink-2)", border: "1px solid var(--border)" }}
                    >
                      채팅
                    </Link>
                    {p.status === "pending" && (
                      <form action={async () => {
                        "use server";
                        await withdrawProposal(p.id);
                      }}>
                        <button
                          type="submit"
                          className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors hover:bg-red-50"
                          style={{ color: "#DC2626", border: "1px solid #FECACA" }}
                        >
                          철회
                        </button>
                      </form>
                    )}
                    {p.status === "rejected" && slugMap[p.creator_id] && (
                      <Link
                        href={`/${slugMap[p.creator_id]}/inquiry`}
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors hover:opacity-90"
                        style={{ color: "var(--brand)", border: "1px solid var(--brand-soft)", background: "var(--brand-softer)" }}
                      >
                        다시 제안
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
