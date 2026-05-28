import { redirect } from "next/navigation";
import Link from "next/link";
import { getAdvertiserSession, createClient } from "@/lib/supabase-server";
import MessagesClient, { type Conversation } from "./MessagesClient";
import AdvertiserNav from "@/components/AdvertiserNav";

export const dynamic = "force-dynamic";

export default async function MessagesPage() {
  const session = await getAdvertiserSession();
  if (!session) redirect("/advertiser/login");

  const supabase = await createClient();

  const { data: proposals } = await supabase
    .from("advertiser_proposals")
    .select("id, creator_id, brand_name, message, amount, status, created_at")
    .eq("advertiser_id", session.user.id)
    .order("created_at", { ascending: false });

  if (!proposals || proposals.length === 0) {
    return (
      <div className="min-h-screen" style={{ background: "var(--surface-2)" }}>
        <MessagesPageShell session={session}>
          <MessagesClient initialConversations={[]} supabaseUrl={process.env.NEXT_PUBLIC_SUPABASE_URL!} supabaseAnonKey={process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!} advertiserName={session.profile.full_name ?? ""} />
        </MessagesPageShell>
      </div>
    );
  }

  const proposalIds = proposals.map((p) => p.id);
  const creatorIds = [...new Set(proposals.map((p) => p.creator_id))];

  // Fetch all threads this advertiser can access (RLS handles filtering)
  const [{ data: profiles }, { data: kits }, { data: threads }] = await Promise.all([
    supabase.from("profiles").select("id, full_name").in("id", creatorIds),
    supabase.from("media_kits").select("user_id, slug").in("user_id", creatorIds),
    supabase.from("message_threads").select("id, proposal_id, last_message_at").in("proposal_id", proposalIds),
  ]);

  const slugMap = Object.fromEntries((kits ?? []).map((k) => [k.user_id, k.slug]));
  const profileMap = Object.fromEntries(
    (profiles ?? []).map((p) => [p.id, p.full_name || slugMap[p.id] || "알 수 없음"])
  );
  const threadMap = Object.fromEntries((threads ?? []).map((t) => [t.proposal_id, t]));
  const threadIds = (threads ?? []).map((t) => t.id);

  let unreadMap: Record<string, number> = {};
  let lastMsgMap: Record<string, string> = {};

  if (threadIds.length > 0) {
    const { data: msgs, error: msgsError } = await supabase
      .from("chat_messages")
      .select("thread_id, content, sender_role, is_read")
      .in("thread_id", threadIds)
      .order("created_at", { ascending: false });

    (msgs ?? []).forEach((m) => {
      // unread: creator messages not yet read by advertiser
      if (m.sender_role === "creator" && !m.is_read) {
        unreadMap[m.thread_id] = (unreadMap[m.thread_id] ?? 0) + 1;
      }
      // latest message preview (first per thread in desc order)
      if (!lastMsgMap[m.thread_id]) {
        lastMsgMap[m.thread_id] = m.sender_role === "brand" ? `나: ${m.content}` : m.content;
      }
    });
  }

  const conversations: Conversation[] = proposals.map((p) => {
    const thread = threadMap[p.id];
    return {
      proposalId: p.id,
      creatorName: profileMap[p.creator_id] ?? "알 수 없음",
      threadId: thread?.id ?? null,
      previewText: (thread && lastMsgMap[thread.id]) ? lastMsgMap[thread.id] : p.message,
      lastAt: thread?.last_message_at ?? p.created_at,
      unreadCount: thread ? (unreadMap[thread.id] ?? 0) : 0,
      status: p.status,
      amount: p.amount,
    };
  });

  return (
    <div className="min-h-screen" style={{ background: "var(--surface-2)" }}>
      <MessagesPageShell session={session}>
        <MessagesClient
          initialConversations={conversations}
          supabaseUrl={process.env.NEXT_PUBLIC_SUPABASE_URL!}
          supabaseAnonKey={process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}
          advertiserName={session.profile.full_name ?? ""}
        />
      </MessagesPageShell>
    </div>
  );
}

function MessagesPageShell({ session, children }: { session: { profile: { full_name: string | null } }; children: React.ReactNode }) {
  return (
    <>
      <AdvertiserNav userName={session.profile.full_name ?? ""} current="messages" />
      <div className="max-w-6xl mx-auto px-6 py-8">
        <h1 className="text-xl font-bold tracking-tight mb-6" style={{ color: "var(--ink)" }}>메시지</h1>
        {children}
      </div>
    </>
  );
}
