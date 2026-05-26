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

const STATUS_META: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  pending:  { label: "검토 중", color: "text-amber-700",   bg: "bg-amber-50",   dot: "bg-amber-400" },
  accepted: { label: "수락됨",  color: "text-emerald-700", bg: "bg-emerald-50", dot: "bg-emerald-500" },
  rejected: { label: "거절됨",  color: "text-red-600",     bg: "bg-red-50",     dot: "bg-red-400" },
};

export default function MessagesClient({
  initialConversations,
  supabaseUrl,
  supabaseAnonKey,
  advertiserName,
}: {
  initialConversations: Conversation[];
  supabaseUrl: string;
  supabaseAnonKey: string;
  advertiserName: string;
}) {
  const [convos, setConvos] = useState<Conversation[]>(initialConversations);
  const supabaseRef = useRef<SupabaseClient | null>(null);

  if (!supabaseRef.current) {
    supabaseRef.current = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: true },
    });
  }

  useEffect(() => {
    const supabase = supabaseRef.current!;

    // message_threads INSERT 구독 — 새 스레드 생성 시 threadId 업데이트
    const threadChannel = supabase
      .channel("messages-list-threads")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "message_threads" },
        (payload) => {
          const thread = payload.new as { id: string; proposal_id: string };
          setConvos((prev) =>
            prev.map((c) =>
              c.proposalId === thread.proposal_id && !c.threadId
                ? { ...c, threadId: thread.id }
                : c
            )
          );
        }
      )
      .subscribe();

    // chat_messages INSERT 구독 — 필터 없이 전체, 클라이언트에서 매칭
    const msgChannel = supabase
      .channel("messages-list-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages" },
        (payload) => {
          const msg = payload.new as {
            thread_id: string;
            sender_role: string;
            content: string;
            created_at: string;
          };
          setConvos((prev) =>
            prev.map((c) => {
              if (c.threadId !== msg.thread_id) return c;
              return {
                ...c,
                previewText: msg.sender_role === "brand" ? `나: ${msg.content}` : msg.content,
                lastAt: msg.created_at,
                unreadCount: msg.sender_role === "creator" ? c.unreadCount + 1 : c.unreadCount,
              };
            })
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(threadChannel);
      supabase.removeChannel(msgChannel);
    };
  }, []);

  return (
    <>
      {convos.length === 0 ? (
        <div className="bg-white rounded-2xl p-16 text-center" style={{ border: "1px solid var(--border-faint)" }}>
          <p className="text-5xl mb-4">💬</p>
          <p className="font-bold text-gray-800 mb-1">아직 대화가 없습니다</p>
          <p className="text-sm mb-6" style={{ color: "var(--ink-3)" }}>크리에이터에게 제안을 보내면 여기서 대화할 수 있습니다</p>
          <Link href="/discover" className="inline-block text-white font-semibold px-6 py-3 rounded-xl transition-colors hover:opacity-90 text-sm" style={{ background: "var(--brand)" }}>
            크리에이터 찾기
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border-faint)" }}>
          {convos.map((c, i) => {
            const status = STATUS_META[c.status] ?? STATUS_META.pending;
            return (
              <Link
                key={c.proposalId}
                href={`/advertiser/messages/${c.proposalId}`}
                className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-gray-50"
                style={{ borderTop: i > 0 ? "1px solid var(--border-faint)" : undefined }}
              >
                <div className="relative shrink-0">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-sm" style={{ background: "var(--brand)" }}>
                    {c.creatorName.charAt(0).toUpperCase()}
                  </div>
                  {c.unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center border-2 border-white">
                      {c.unreadCount > 9 ? "9+" : c.unreadCount}
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-sm font-bold truncate" style={{ color: "var(--ink)" }}>{c.creatorName}</span>
                    <span className="text-xs shrink-0 ml-2" style={{ color: "var(--ink-4)" }}>{timeAgo(c.lastAt)}</span>
                  </div>
                  <p className="text-sm truncate mb-1.5" style={{ color: c.unreadCount > 0 ? "var(--ink)" : "var(--ink-3)", fontWeight: c.unreadCount > 0 ? "600" : "400" }}>
                    {c.previewText}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${status.bg} ${status.color}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                      {status.label}
                    </span>
                    {c.amount > 0 && (
                      <span className="text-xs" style={{ color: "var(--ink-3)" }}>
                        {c.amount >= 10_000 ? `${Math.floor(c.amount / 10_000)}만원` : `${c.amount.toLocaleString("ko-KR")}원`}
                      </span>
                    )}
                  </div>
                </div>

                <span className="shrink-0 text-lg" style={{ color: "var(--ink-4)" }}>›</span>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
