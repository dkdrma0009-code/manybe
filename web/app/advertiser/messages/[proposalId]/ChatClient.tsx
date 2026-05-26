"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

interface ChatMessage {
  id: string;
  sender_role: string;
  content: string;
  created_at: string;
  is_read: boolean;
}

interface Props {
  proposalId: string;
  creatorId: string;
  creatorName: string;
  brandName: string;
  proposalMessage: string;
  amount: number;
  initialStatus: string;
  rejectionReason: string | null;
  initialMessages: ChatMessage[];
  threadId: string | null;
  supabaseUrl: string;
  supabaseAnonKey: string;
}

function formatTime(ts: string) {
  return new Date(ts).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
}

export default function ChatClient({
  proposalId,
  creatorId,
  creatorName,
  brandName,
  proposalMessage,
  amount,
  initialStatus,
  rejectionReason,
  initialMessages,
  threadId: initialThreadId,
  supabaseUrl,
  supabaseAnonKey,
}: Props) {
  const router = useRouter();
  const supabaseRef = useRef(
    createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: true } })
  );
  const supabase = supabaseRef.current;

  const [threadId, setThreadId] = useState<string | null>(initialThreadId);
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState(initialStatus);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Initialize thread if not exists and send first brand message
  useEffect(() => {
    if (initialThreadId) return;
    (async () => {
      const { data: thread, error } = await supabase
        .from("message_threads")
        .insert({ proposal_id: proposalId, creator_id: creatorId })
        .select("id")
        .single();
      if (error || !thread) return;
      setThreadId(thread.id);
      await supabase.from("chat_messages").insert({
        thread_id: thread.id,
        sender_role: "brand",
        content: proposalMessage,
      });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Realtime subscription
  useEffect(() => {
    if (!threadId) return;
    const channel = supabase
      .channel(`chat:${threadId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `thread_id=eq.${threadId}` },
        (payload) => {
          const msg = payload.new as ChatMessage;
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            // Mark creator messages as read immediately
            if (msg.sender_role === "creator") {
              supabase.from("chat_messages").update({ is_read: true }).eq("id", msg.id);
              msg.is_read = true;
            }
            return [...prev, msg];
          });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage() {
    const content = text.trim();
    if (!content || !threadId || sending) return;
    setText("");
    setSending(true);
    await supabase.from("chat_messages").insert({
      thread_id: threadId,
      sender_role: "brand",
      content,
    });
    setSending(false);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  const amountStr = amount > 0 ? `₩${amount.toLocaleString()}` : "";

  const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
    pending:  { label: "검토 중", color: "text-yellow-700", bg: "bg-yellow-50" },
    accepted: { label: "수락됨",  color: "text-green-700",  bg: "bg-green-50" },
    rejected: { label: "거절됨",  color: "text-red-700",    bg: "bg-red-50" },
  };
  const statusMeta = STATUS_META[status] ?? STATUS_META.pending;

  return (
    <div className="flex flex-col h-screen" style={{ background: "var(--surface-2)" }}>
      {/* Header */}
      <header className="bg-white px-4 py-3 flex items-center gap-3 shrink-0" style={{ borderBottom: "1px solid var(--border-faint)" }}>
        <button onClick={() => router.back()} className="text-2xl leading-none px-1" style={{ color: "var(--ink-3)" }}>‹</button>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0" style={{ background: "var(--brand)" }}>
          {creatorName.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm truncate" style={{ color: "var(--ink)" }}>{creatorName}</p>
          {amountStr && <p className="text-xs" style={{ color: "var(--ink-4)" }}>{amountStr}</p>}
        </div>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${statusMeta.bg} ${statusMeta.color}`}>
          {statusMeta.label}
        </span>
        <Link href="/advertiser/messages" className="text-xs ml-2 transition-colors" style={{ color: "var(--ink-4)" }}>목록</Link>
      </header>

      {/* 거절 이유 배너 */}
      {status === "rejected" && rejectionReason && (
        <div className="mx-4 mt-3 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">
          <span className="font-semibold">거절 이유: </span>{rejectionReason}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
        {messages.map((msg, i) => {
          const isBrand = msg.sender_role === "brand";
          const prev = i > 0 ? messages[i - 1] : null;
          const next = i < messages.length - 1 ? messages[i + 1] : null;
          const sameGroup = prev?.sender_role === msg.sender_role;
          const isLastInGroup = !next || next.sender_role !== msg.sender_role;

          return (
            <div key={msg.id} className={`flex items-end gap-2 ${isBrand ? "justify-end" : "justify-start"}`}>
              {!isBrand && !sameGroup && (
                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0 mb-1" style={{ background: "var(--brand)" }}>
                  {creatorName.charAt(0).toUpperCase()}
                </div>
              )}
              {!isBrand && sameGroup && <div className="w-8 shrink-0" />}
              <div className="max-w-[72%]">
                {!isBrand && !sameGroup && (
                  <p className="text-xs mb-1 ml-1" style={{ color: "var(--ink-4)" }}>{creatorName}</p>
                )}
                <div
                  className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${isBrand ? "rounded-br-sm" : "rounded-bl-sm"}`}
                  style={isBrand
                    ? { background: "var(--brand)", color: "#fff" }
                    : { background: "#fff", color: "var(--ink)", boxShadow: "0 1px 2px rgba(0,0,0,0.06)" }}
                >
                  {msg.content}
                </div>
                {isLastInGroup && (
                  <div className={`flex items-center gap-1 mt-1 text-xs ${isBrand ? "justify-end mr-1" : "ml-1"}`} style={{ color: "var(--ink-4)" }}>
                    {isBrand && msg.is_read && <span className="font-semibold" style={{ color: "var(--brand)" }}>읽음</span>}
                    <span>{formatTime(msg.created_at)}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="bg-white px-4 py-3 flex items-end gap-2 shrink-0" style={{ borderTop: "1px solid var(--border-faint)" }}>
        <textarea
          className="flex-1 rounded-2xl px-4 py-2.5 text-sm resize-none focus:outline-none max-h-32"
          style={{ background: "var(--brand-softer)", border: "1px solid var(--border)", color: "var(--ink)" }}
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="메시지를 입력하세요..."
          maxLength={500}
        />
        <button
          onClick={sendMessage}
          disabled={!text.trim() || sending || !threadId}
          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0 disabled:opacity-40 transition-colors hover:opacity-90"
          style={{ background: "var(--brand)" }}
        >
          {sending ? (
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            "↑"
          )}
        </button>
      </div>
    </div>
  );
}
