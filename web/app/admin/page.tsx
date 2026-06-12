import { redirect } from "next/navigation";
import Link from "next/link";
import { getAdvertiserSession } from "@/lib/supabase-server";
import { getAdminClient, OWNER_EMAIL } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";
export const metadata = { title: "매니비 운영 현황" };

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  return `${Math.floor(hr / 24)}일 전`;
}

export default async function AdminIndexPage() {
  const session = await getAdvertiserSession();
  if (!session || session.user.email !== OWNER_EMAIL) redirect("/");

  const admin = getAdminClient();
  const since30 = new Date(Date.now() - 30 * 86400000).toISOString();

  const count = (table: string) =>
    admin.from(table).select("*", { count: "exact", head: true });

  const [
    profiles, creators, advertisers, channels, kits,
    waitlistCnt, feedbackCnt, proposals, pendingProposals, deals,
    views30, recentWaitlist, recentSignups,
  ] = await Promise.all([
    count("profiles"),
    admin.from("profiles").select("*", { count: "exact", head: true }).eq("role", "creator"),
    admin.from("profiles").select("*", { count: "exact", head: true }).eq("role", "advertiser"),
    count("social_channels"),
    count("media_kits"),
    count("waitlist"),
    count("feedback"),
    count("advertiser_proposals"),
    admin.from("advertiser_proposals").select("*", { count: "exact", head: true }).eq("status", "pending"),
    count("deals"),
    admin.from("media_kit_views").select("*", { count: "exact", head: true }).gte("created_at", since30),
    admin.from("waitlist").select("email, created_at").order("created_at", { ascending: false }).limit(5),
    admin.from("profiles").select("full_name, role, created_at").order("created_at", { ascending: false }).limit(5),
  ]);

  const stats = [
    { label: "가입자", value: profiles.count ?? 0, sub: `크리에이터 ${creators.count ?? 0} · 광고주 ${advertisers.count ?? 0}` },
    { label: "연동 채널", value: channels.count ?? 0 },
    { label: "미디어킷", value: kits.count ?? 0, sub: `최근 30일 조회 ${views30.count ?? 0}회` },
    { label: "협찬 제안", value: proposals.count ?? 0, sub: `대기 중 ${pendingProposals.count ?? 0}건` },
    { label: "협찬 딜", value: deals.count ?? 0 },
    { label: "사전등록", value: waitlistCnt.count ?? 0 },
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">운영 현황</h1>
            <p className="text-sm text-gray-400 mt-1">매니비 핵심 지표 한눈에</p>
          </div>
          <Link
            href="/admin/feedback"
            className="text-sm font-semibold text-[#6C63FF] bg-purple-50 px-4 py-2 rounded-xl hover:bg-purple-100 transition-colors"
          >
            피드백 {feedbackCnt.count ?? 0}건 →
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-10">
          {stats.map((s) => (
            <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <p className="text-xs font-medium text-gray-400 mb-1">{s.label}</p>
              <p className="text-3xl font-extrabold text-gray-900">{s.value.toLocaleString()}</p>
              {s.sub && <p className="text-xs text-gray-400 mt-1">{s.sub}</p>}
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900 text-sm">최근 가입</h2>
            </div>
            <div className="divide-y divide-gray-50">
              {(recentSignups.data ?? []).length === 0 && (
                <p className="px-5 py-8 text-center text-gray-400 text-sm">아직 없음</p>
              )}
              {(recentSignups.data ?? []).map((p, i) => (
                <div key={i} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{p.full_name ?? "(이름 없음)"}</p>
                    <p className="text-xs text-gray-400">{p.role === "advertiser" ? "광고주" : "크리에이터"}</p>
                  </div>
                  <span className="text-xs text-gray-400">{p.created_at ? timeAgo(p.created_at) : ""}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900 text-sm">최근 사전등록</h2>
            </div>
            <div className="divide-y divide-gray-50">
              {(recentWaitlist.data ?? []).length === 0 && (
                <p className="px-5 py-8 text-center text-gray-400 text-sm">아직 없음</p>
              )}
              {(recentWaitlist.data ?? []).map((w, i) => (
                <div key={i} className="px-5 py-3 flex items-center justify-between">
                  <p className="text-sm text-gray-800">{w.email}</p>
                  <span className="text-xs text-gray-400">{timeAgo(w.created_at)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
