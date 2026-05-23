import { redirect, notFound } from "next/navigation";
import { getAdvertiserSession, createClient } from "@/lib/supabase-server";
import ChatClient from "./ChatClient";

export default async function ChatPage({ params }: { params: Promise<{ proposalId: string }> }) {
  const { proposalId } = await params;
  const session = await getAdvertiserSession();
  if (!session) redirect(`/advertiser/login?next=/advertiser/messages/${proposalId}`);

  const supabase = await createClient();

  // Verify this proposal belongs to the advertiser
  const { data: proposal } = await supabase
    .from("advertiser_proposals")
    .select("id, creator_id, brand_name, message, amount, status")
    .eq("id", proposalId)
    .eq("advertiser_id", session.user.id)
    .single();

  if (!proposal) notFound();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", proposal.creator_id)
    .single();

  const creatorName = profile?.full_name || profile?.email || "크리에이터";

  // Get or initialize thread + existing messages
  let { data: thread } = await supabase
    .from("message_threads")
    .select("id")
    .eq("proposal_id", proposalId)
    .single();

  let initialMessages: { id: string; sender_role: string; content: string; created_at: string; is_read: boolean }[] = [];

  if (thread) {
    const { data: msgs } = await supabase
      .from("chat_messages")
      .select("id, sender_role, content, created_at, is_read")
      .eq("thread_id", thread.id)
      .order("created_at", { ascending: true });
    initialMessages = msgs ?? [];

    // Mark creator messages as read
    await supabase
      .from("chat_messages")
      .update({ is_read: true })
      .eq("thread_id", thread.id)
      .eq("sender_role", "creator")
      .eq("is_read", false);
  }

  return (
    <ChatClient
      proposalId={proposalId}
      creatorId={proposal.creator_id}
      creatorName={creatorName}
      brandName={proposal.brand_name}
      proposalMessage={proposal.message}
      amount={proposal.amount}
      initialStatus={proposal.status}
      initialMessages={initialMessages}
      threadId={thread?.id ?? null}
      supabaseUrl={process.env.NEXT_PUBLIC_SUPABASE_URL!}
      supabaseAnonKey={process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}
    />
  );
}
