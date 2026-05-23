import { redirect } from "next/navigation";
import Link from "next/link";
import { getAdvertiserSession, createClient } from "@/lib/supabase-server";
import { logoutAdvertiser } from "../signup/actions";

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const days = Math.floor(hr / 24);
  if (days === 1) return "어제";
  if (days < 7) return `${days}일 전`;
  return new Date(dateStr).toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
}

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  pending:  { label: "검토 중", color: "text-yellow-700", bg: "bg-yellow-50" },
  accepted: { label: "수락됨",  color: "text-green-700",  bg: "bg-green-50" },
  rejected: { label: "거절됨",  color: "text-red-700",    bg: "bg-red-50" },
};

export default async function MessagesPage() {
  const session = await getAdvertiserSession();
  if (!session) redirect("/advertiser/login");

  const supabase = await createClient();

  const { data: proposals } = await supabase
    .from("advertiser_proposals")
    .select("id, creator_id, brand_name, message, amount, status, created_at")
    .eq("advertiser_id", session.user.id)
    .order("created_at", { ascending: false });

  const creatorIds = [...new Set((proposals ?? []).map((p) => p.creator_id))];
  const [{ data: profiles }, { data: kits }, { data: threads }] = await Promise.all([
    creatorIds.length
      ? supabase.from("profiles").select("id, full_name").in("id", creatorIds)
      : Promise.resolve({ data: [] }),
    creatorIds.length
      ? supabase.from("media_kits").select("user_id, slug").in("user_id", creatorIds)
      : Promise.resolve({ data: [] }),
    proposals && proposals.length > 0
      ? supabase
          .from("message_threads")
          .select("id, proposal_id, last_message_at")
          .in("proposal_id", proposals.map((p) => p.id))
      : Promise.resolve({ data: [] }),
  ]);

  const slugMap = Object.fromEntries((kits ?? []).map((k) => [k.user_id, k.slug]));
  const profileMap = Object.fromEntries(
    (profiles ?? []).map((p) => [p.id, p.full_name || slugMap[p.id] || "알 수 없음"])
  );
  const threadMap = Object.fromEntries((threads ?? []).map((t) => [t.proposal_id, t]));

  // Fetch last message and unread count per thread
  const threadIds = (threads ?? []).map((t) => t.id);
  let unreadMap: Record<string, number> = {};
  let lastMsgMap: Record<string, { content: string; sender_role: string }> = {};

  if (threadIds.length > 0) {
    const [{ data: unread }, { data: lastMsgs }] = await Promise.all([
      supabase
        .from("chat_messages")
        .select("thread_id")
        .in("thread_id", threadIds)
        .eq("sender_role", "creator")
        .eq("is_read", false),
      supabase
        .from("chat_messages")
        .select("thread_id, content, sender_role")
        .in("thread_id", threadIds)
        .order("created_at", { ascending: false }),
    ]);

    (unread ?? []).forEach((u) => {
      unreadMap[u.thread_id] = (unreadMap[u.thread_id] ?? 0) + 1;
    });

    // Keep only the latest message per thread
    (lastMsgs ?? []).forEach((m) => {
      if (!lastMsgMap[m.thread_id]) {
        lastMsgMap[m.thread_id] = { content: m.content, sender_role: m.sender_role };
      }
    });
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
            <span className="text-xs text-gray-500">메시지</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/advertiser/dashboard" className="text-xs font-semibold text-gray-500 hover:text-gray-900">보낸 제안</Link>
            <Link href="/discover" className="text-xs font-semibold text-[#6C63FF] hover:underline">크리에이터 찾기</Link>
            <form action={logoutAdvertiser}>
              <button className="text-xs text-gray-400 hover:text-gray-600 transition-colors">로그아웃</button>
            </form>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-extrabold text-gray-900 mb-6">메시지</h1>

        {!proposals || proposals.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
            <p className="text-4xl mb-3">💬</p>
            <p className="font-semibold text-gray-700 mb-1">아직 대화가 없습니다</p>
            <p className="text-sm text-gray-400 mb-6">크리에이터에게 제안을 보내면 여기서 대화할 수 있습니다.</p>
            <Link
              href="/discover"
              className="inline-block bg-[#6C63FF] text-white font-semibold px-6 py-3 rounded-xl hover:bg-[#5B53EE] transition-colors text-sm"
            >
              크리에이터 찾기
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-50">
            {proposals.map((p) => {
              const creatorName = profileMap[p.creator_id] ?? "알 수 없음";
              const thread = threadMap[p.id];
              const unread = thread ? (unreadMap[thread.id] ?? 0) : 0;
              const lastAt = thread?.last_message_at ?? p.created_at;
              const lastMsg = thread ? lastMsgMap[thread.id] : null;
              const previewText = lastMsg
                ? (lastMsg.sender_role === "brand" ? `나: ${lastMsg.content}` : lastMsg.content)
                : p.message;
              const status = STATUS_META[p.status] ?? STATUS_META.pending;

              return (
                <Link
                  key={p.id}
                  href={`/advertiser/messages/${p.id}`}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="relative shrink-0">
                    <div className="w-12 h-12 rounded-2xl bg-[#6C63FF] flex items-center justify-center text-white font-bold text-base">
                      {creatorName.charAt(0).toUpperCase()}
                    </div>
                    {unread > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center border-2 border-white">
                        {unread > 9 ? "9+" : unread}
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-sm text-gray-900 ${unread > 0 ? "font-extrabold" : "font-bold"}`}>
                        {creatorName}
                      </span>
                      <span className="text-xs text-gray-400 shrink-0 ml-2">{timeAgo(lastAt)}</span>
                    </div>
                    <p className={`text-sm truncate mb-1.5 ${unread > 0 ? "text-gray-900 font-medium" : "text-gray-500"}`}>
                      {previewText}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${status.bg} ${status.color}`}>
                        {status.label}
                      </span>
                      {p.amount > 0 && (
                        <span className="text-xs text-gray-400">
                          {p.amount >= 10_000 ? `${Math.floor(p.amount / 10_000)}만원` : `${p.amount.toLocaleString("ko-KR")}원`}
                        </span>
                      )}
                    </div>
                  </div>

                  <span className="text-gray-300 text-lg shrink-0">›</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
