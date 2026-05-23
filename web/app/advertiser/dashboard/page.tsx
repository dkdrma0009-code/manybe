import { redirect } from "next/navigation";
import Link from "next/link";
import { getAdvertiserSession, createClient } from "@/lib/supabase-server";
import { logoutAdvertiser } from "../signup/actions";

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  pending:  { label: "검토 중",  color: "text-yellow-700", bg: "bg-yellow-50" },
  accepted: { label: "수락됨",   color: "text-green-700",  bg: "bg-green-50" },
  rejected: { label: "거절됨",   color: "text-red-700",    bg: "bg-red-50" },
};

function formatKRW(n: number) {
  if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(1).replace(".0", "")}억원`;
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
    .select("id, creator_id, brand_name, message, amount, status, created_at")
    .eq("advertiser_id", session.user.id)
    .order("created_at", { ascending: false });

  const creatorIds = [...new Set((proposals ?? []).map((p) => p.creator_id))];
  const { data: profiles } = creatorIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", creatorIds)
    : { data: [] };

  const { data: kits } = creatorIds.length
    ? await supabase.from("media_kits").select("user_id, slug").in("user_id", creatorIds)
    : { data: [] };

  const profileMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p.full_name]));
  const slugMap = Object.fromEntries((kits ?? []).map((k) => [k.user_id, k.slug]));

  const counts = { total: 0, pending: 0, accepted: 0, rejected: 0 };
  for (const p of proposals ?? []) {
    counts.total++;
    counts[p.status as keyof typeof counts]++;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/discover" className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#6C63FF] flex items-center justify-center">
                <span className="text-white font-bold text-xs">M</span>
              </div>
              <span className="font-bold text-gray-900 text-sm hidden sm:block">매니비</span>
            </Link>
            <span className="text-gray-300">·</span>
            <span className="text-xs text-gray-500">광고주 대시보드</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600 hidden sm:block">{session.profile.full_name}</span>
            <Link
              href="/discover"
              className="text-xs font-semibold text-[#6C63FF] hover:underline"
            >
              크리에이터 찾기
            </Link>
            <form action={logoutAdvertiser}>
              <button className="text-xs text-gray-400 hover:text-gray-600 transition-colors">로그아웃</button>
            </form>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-extrabold text-gray-900 mb-6">보낸 제안</h1>

        {/* 요약 카드 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {[
            { label: "전체",   value: counts.total,    color: "text-gray-900" },
            { label: "검토 중", value: counts.pending,  color: "text-yellow-600" },
            { label: "수락됨", value: counts.accepted,  color: "text-green-600" },
            { label: "거절됨", value: counts.rejected,  color: "text-red-500" },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
              <p className={`text-3xl font-extrabold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* 제안 목록 */}
        {!proposals || proposals.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
            <p className="text-4xl mb-3">📭</p>
            <p className="font-semibold text-gray-700 mb-1">아직 보낸 제안이 없습니다</p>
            <p className="text-sm text-gray-400 mb-6">크리에이터를 찾아 첫 제안을 보내보세요.</p>
            <Link
              href="/discover"
              className="inline-block bg-[#6C63FF] text-white font-semibold px-6 py-3 rounded-xl hover:bg-[#5B53EE] transition-colors text-sm"
            >
              크리에이터 찾기
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {proposals.map((p) => {
              const creatorName = profileMap[p.creator_id] ?? "알 수 없음";
              const slug = slugMap[p.creator_id];
              const status = STATUS_META[p.status] ?? STATUS_META.pending;

              return (
                <div
                  key={p.id}
                  className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-start gap-4"
                >
                  {/* 아바타 */}
                  <div className="w-10 h-10 rounded-xl bg-[#6C63FF] flex items-center justify-center text-white font-bold text-sm shrink-0">
                    {creatorName.charAt(0).toUpperCase()}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        {slug ? (
                          <Link
                            href={`/${slug}`}
                            className="font-bold text-gray-900 text-sm hover:text-[#6C63FF] transition-colors truncate"
                          >
                            {creatorName}
                          </Link>
                        ) : (
                          <span className="font-bold text-gray-900 text-sm truncate">{creatorName}</span>
                        )}
                        <span className="text-gray-300 text-xs shrink-0">·</span>
                        <span className="text-xs text-gray-400 shrink-0">{p.brand_name}</span>
                      </div>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${status.bg} ${status.color}`}>
                        {status.label}
                      </span>
                    </div>

                    {p.message && (
                      <p className="text-sm text-gray-500 line-clamp-2 mb-2">{p.message}</p>
                    )}

                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      {p.amount > 0 && (
                        <span className="font-semibold text-gray-700">{formatKRW(p.amount)}</span>
                      )}
                      <span>{timeAgo(p.created_at)}</span>
                    </div>
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
