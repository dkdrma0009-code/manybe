"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export interface Conversation {
  proposalId: string;
  creatorName: string;
  threadId: string | null;
  previewText: string;
  lastAt: string;
  unreadCount: number;
  status: string;
  amount: number;
}

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
  pending:  { label: "검토 중", color: "#92400E", bg: "#FEF3C7" },
  accepted: { label: "수락됨",  color: "#065F46", bg: "#D1FAE5" },
  rejected: { label: "거절됨",  color: "#991B1B", bg: "#FEE2E2" },
};

export default function MessagesClient({
  initialConversations,
  supabaseUrl,
  supabaseAnonKey,
}: {
  initialConversations: Conversation[];
  supabaseUrl: string;
  supabaseAnonKey: string;
  advertiserName: string;
}) {
  const [convos, setConvos] = useState<Conversation[]>(initialConversations);
  const [query, setQuery] = useState("");
  const supabaseRef = useRef<SupabaseClient | null>(null);

  const filtered = query.trim()
    ? convos.filter((c) => c.creatorName.toLowerCase().includes(query.toLowerCase()))
    : convos;

  useEffect(() => {
    if (!supabaseRef.current) {
      supabaseRef.current = createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: true } });
    }
    const supabase = supabaseRef.current;

    const threadChannel = supabase
      .channel("messages-list-threads")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "message_threads" },
        (payload) => {
          const thread = payload.new as { id: string; proposal_id: string };
          setConvos((prev) => prev.map((c) =>
            c.proposalId === thread.proposal_id && !c.threadId ? { ...c, threadId: thread.id } : c
          ));
        }
      ).subscribe();

    const msgChannel = supabase
      .channel("messages-list-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages" },
        (payload) => {
          const msg = payload.new as { thread_id: string; sender_role: string; content: string; created_at: string };
          setConvos((prev) => prev.map((c) => {
            if (c.threadId !== msg.thread_id) return c;
            return {
              ...c,
              previewText: msg.sender_role === "brand" ? `나: ${msg.content}` : msg.content,
              lastAt: msg.created_at,
              unreadCount: msg.sender_role === "creator" ? c.unreadCount + 1 : c.unreadCount,
            };
          }));
        }
      ).subscribe();

    return () => {
      supabase.removeChannel(threadChannel);
      supabase.removeChannel(msgChannel);
    };
  }, []);

  if (convos.length === 0) {
    return (
      <div className="py-24 text-center">
        <p className="font-semibold mb-1" style={{ color: "var(--ink-2)" }}>아직 대화가 없습니다</p>
        <p className="text-sm mb-6" style={{ color: "var(--ink-3)" }}>크리에이터에게 제안을 보내면 여기서 대화할 수 있습니다</p>
        <Link href="/discover" className="inline-block text-white font-semibold px-6 py-2.5 rounded-xl text-sm hover:opacity-90" style={{ background: "var(--brand)" }}>
          크리에이터 찾기
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* 검색 */}
      <div className="mb-4">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="크리에이터 이름으로 검색"
          className="w-full sm:w-72 text-sm px-4 py-2 rounded-lg outline-none"
          style={{ background: "var(--surface-2)", color: "var(--ink)", border: "1px solid var(--border-faint)" }}
        />
      </div>

      <div className="rounded-xl overflow-hidden bg-white" style={{ border: "1px solid var(--border-faint)" }}>
        {filtered.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm" style={{ color: "var(--ink-3)" }}>&ldquo;{query}&rdquo;에 해당하는 대화가 없습니다</p>
          </div>
        ) : filtered.map((c, i) => {
          const status = STATUS_META[c.status] ?? STATUS_META.pending;
          return (
            <Link
              key={c.proposalId}
              href={`/advertiser/messages/${c.proposalId}`}
              className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-[#FAFAFA]"
              style={{ borderTop: i > 0 ? "1px solid var(--border-faint)" : undefined }}
            >
              {/* 아바타 */}
              <div className="relative shrink-0">
                <img
                  src={`https://i.pravatar.cc/80?u=${encodeURIComponent(c.proposalId)}`}
                  alt={c.creatorName}
                  width={40} height={40}
                  className="w-10 h-10 rounded-xl object-cover"
                />
                {c.unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center" style={{ background: "var(--brand)" }}>
                    {c.unreadCount > 9 ? "9+" : c.unreadCount}
                  </span>
                )}
              </div>

              {/* 내용 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-sm font-semibold truncate" style={{ color: "var(--ink)" }}>{c.creatorName}</span>
                  <span className="text-xs shrink-0 ml-2" style={{ color: "var(--ink-4)" }}>{timeAgo(c.lastAt)}</span>
                </div>
                <p className="text-sm truncate" style={{ color: c.unreadCount > 0 ? "var(--ink)" : "var(--ink-3)", fontWeight: c.unreadCount > 0 ? 600 : 400 }}>
                  {c.previewText}
                </p>
              </div>

              {/* 상태 + 금액 */}
              <div className="shrink-0 flex flex-col items-end gap-1">
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ color: status.color, background: status.bg }}>
                  {status.label}
                </span>
                {c.amount > 0 && (
                  <span className="text-xs" style={{ color: "var(--ink-4)" }}>
                    {c.amount >= 10_000 ? `${Math.floor(c.amount / 10_000)}만원` : `${c.amount.toLocaleString("ko-KR")}원`}
                  </span>
                )}
              </div>

              <span className="shrink-0 text-base" style={{ color: "var(--ink-4)" }}>›</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
