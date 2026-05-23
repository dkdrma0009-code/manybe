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
  pending:  { label: "검토 중", color: "text-yellow-700", bg: "bg-yellow-50" },
  accepted: { label: "수락됨",  color: "text-green-700",  bg: "bg-green-50" },
  rejected: { label: "거절됨",  color: "text-red-700",    bg: "bg-red-50" },
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
    const threadIds = initialConversations.map((c) => c.threadId).filter(Boolean);
    if (!threadIds.length) return;

    const channel = supabase
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
                unreadCount:
                  msg.sender_role === "creator" ? c.unreadCount + 1 : c.unreadCount,
              };
            })
          );
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <>
      {convos.length === 0 ? (
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
          {convos.map((c) => {
            const status = STATUS_META[c.status] ?? STATUS_META.pending;
            return (
              <Link
                key={c.proposalId}
                href={`/advertiser/messages/${c.proposalId}`}
                className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="relative shrink-0">
                  <div className="w-12 h-12 rounded-2xl bg-[#6C63FF] flex items-center justify-center text-white font-bold text-base">
                    {c.creatorName.charAt(0).toUpperCase()}
                  </div>
                  {c.unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center border-2 border-white">
                      {c.unreadCount > 9 ? "9+" : c.unreadCount}
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-sm text-gray-900 ${c.unreadCount > 0 ? "font-extrabold" : "font-bold"}`}>
                      {c.creatorName}
                    </span>
                    <span className="text-xs text-gray-400 shrink-0 ml-2">{timeAgo(c.lastAt)}</span>
                  </div>
                  <p className={`text-sm truncate mb-1.5 ${c.unreadCount > 0 ? "text-gray-900 font-medium" : "text-gray-500"}`}>
                    {c.previewText}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${status.bg} ${status.color}`}>
                      {status.label}
                    </span>
                    {c.amount > 0 && (
                      <span className="text-xs text-gray-400">
                        {c.amount >= 10_000 ? `${Math.floor(c.amount / 10_000)}만원` : `${c.amount.toLocaleString("ko-KR")}원`}
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
    </>
  );
}
