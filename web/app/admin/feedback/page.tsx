import { redirect } from "next/navigation";
import { getAdvertiserSession } from "@/lib/supabase-server";
import { getAdminClient, OWNER_EMAIL } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

const CATEGORY_COLOR: Record<string, string> = {
  "버그": "bg-red-50 text-red-700",
  "개선": "bg-blue-50 text-blue-700",
  "기타": "bg-gray-100 text-gray-600",
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  return `${Math.floor(hr / 24)}일 전`;
}

export default async function AdminFeedbackPage() {
  const session = await getAdvertiserSession();
  if (!session || session.user.email !== OWNER_EMAIL) redirect("/");

  // feedback에는 SELECT RLS 정책이 없어 일반 클라이언트로는 항상 빈 목록 —
  // owner 게이트 통과 후 service-role로 읽는다.
  const supabase = getAdminClient();
  const { data: rows } = await supabase
    .from("feedback")
    .select("id, category, content, created_at, user_id")
    .order("created_at", { ascending: false });

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-extrabold text-gray-900 mb-2">피드백</h1>
        <p className="text-sm text-gray-400 mb-8">{rows?.length ?? 0}개</p>

        {!rows?.length && (
          <p className="text-gray-400 text-center py-20">아직 피드백이 없습니다</p>
        )}

        <div className="space-y-3">
          {(rows ?? []).map((r) => (
            <div key={r.id} className="bg-white rounded-2xl border border-gray-100 px-5 py-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${CATEGORY_COLOR[r.category] ?? "bg-gray-100 text-gray-600"}`}>
                  {r.category}
                </span>
                <span className="text-xs text-gray-400">{timeAgo(r.created_at)}</span>
              </div>
              <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{r.content}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
