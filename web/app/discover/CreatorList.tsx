"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const PLATFORM_ICON: Record<string, string> = { youtube: "YT", instagram: "IG", tiktok: "TK" };

function formatK(n: number): string {
  if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(1).replace(".0", "")}억`;
  if (n >= 10_000) return `${Math.floor(n / 10_000)}만`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(".0", "")}천`;
  return n.toLocaleString("ko-KR");
}

function formatPrice(pricing: Record<string, number> | null): string | null {
  if (!pricing) return null;
  const values = Object.values(pricing).filter((v) => typeof v === "number" && v > 0);
  if (!values.length) return null;
  const min = Math.min(...values);
  if (min >= 10_000_000) return `${(min / 10_000_000).toFixed(0)}천만~`;
  if (min >= 1_000_000) return `${Math.floor(min / 1_000_000)}백만~`;
  if (min >= 10_000) return `${Math.floor(min / 10_000)}만~`;
  return `${min.toLocaleString()}원~`;
}

export interface CreatorItem {
  kit: { id: string; slug: string; bio: string | null; category: string | null; pricing: Record<string, number> | null };
  profile: { full_name: string | null } | null;
  channels: { platform: string; channel_name: string; subscriber_count: number }[];
}

interface Props {
  creators: CreatorItem[];
  isLoggedIn: boolean;
}

export default function CreatorList({ creators, isLoggedIn }: Props) {
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [compareOpen, setCompareOpen] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("manybe_bookmarks") ?? "[]");
      setBookmarks(new Set(saved));
    } catch {}
  }, []);

  function toggleBookmark(e: React.MouseEvent, slug: string) {
    e.preventDefault();
    e.stopPropagation();
    setBookmarks((prev) => {
      const next = new Set(prev);
      next.has(slug) ? next.delete(slug) : next.add(slug);
      localStorage.setItem("manybe_bookmarks", JSON.stringify([...next]));
      return next;
    });
  }

  function toggleSelect(e: React.MouseEvent, slug: string) {
    e.preventDefault();
    e.stopPropagation();
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) { next.delete(slug); return next; }
      if (next.size >= 3) return prev;
      next.add(slug);
      return next;
    });
  }

  const selectedCreators = creators.filter((c) => selected.has(c.kit.slug));

  return (
    <>
      <div className="rounded-xl overflow-hidden bg-white" style={{ border: "1px solid var(--border-faint)" }}>
        {creators.map(({ kit, profile, channels: chs }, idx) => {
          const name = profile?.full_name ?? kit.slug;
          const topChannels = [...chs].sort((a, b) => (b.subscriber_count ?? 0) - (a.subscriber_count ?? 0)).slice(0, 2);
          const totalSubs = chs.reduce((s, c) => s + (c.subscriber_count ?? 0), 0);
          const minPrice = formatPrice(kit.pricing);
          const isBookmarked = bookmarks.has(kit.slug);
          const isSelected = selected.has(kit.slug);

          return (
            <div
              key={kit.id}
              className="flex items-center gap-5 px-6 py-5 transition-colors hover:bg-[#FAFAFA] group relative"
              style={{ borderTop: idx === 0 ? "none" : "1px solid var(--border-faint)" }}
            >
              {/* 비교 체크박스 */}
              {isLoggedIn && (
                <button
                  onClick={(e) => toggleSelect(e, kit.slug)}
                  className="shrink-0 w-5 h-5 rounded flex items-center justify-center transition-all"
                  style={isSelected
                    ? { background: "var(--brand)", border: "2px solid var(--brand)" }
                    : { border: "2px solid var(--border)", background: "#fff" }}
                >
                  {isSelected && (
                    <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="2">
                      <polyline points="2 6 5 9 10 3"/>
                    </svg>
                  )}
                </button>
              )}

              {/* 아바타 */}
              <Link href={isLoggedIn ? `/${kit.slug}` : `/advertiser/login?next=/discover`} className="shrink-0">
                <img
                  src={`https://i.pravatar.cc/96?u=${encodeURIComponent(kit.slug)}`}
                  alt={name}
                  width={48} height={48}
                  className="w-12 h-12 rounded-xl object-cover"
                />
              </Link>

              {/* 이름 + 카테고리 */}
              <Link href={isLoggedIn ? `/${kit.slug}` : `/advertiser/login?next=/discover`} className="w-40 shrink-0">
                <p className="font-semibold text-sm truncate" style={{ color: "var(--ink)" }}>{name}</p>
                {kit.category && (
                  <span className="inline-block text-xs px-2 py-0.5 rounded-full mt-1" style={{ background: "var(--surface-2)", color: "var(--ink-3)" }}>
                    {kit.category}
                  </span>
                )}
              </Link>

              {/* bio */}
              <Link href={isLoggedIn ? `/${kit.slug}` : `/advertiser/login?next=/discover`} className="flex-1 min-w-0 hidden md:block">
                {isLoggedIn ? (
                  kit.bio
                    ? <p className="text-sm line-clamp-1 leading-relaxed" style={{ color: "var(--ink-3)" }}>{kit.bio}</p>
                    : null
                ) : (
                  <p className="text-sm blur-sm select-none pointer-events-none" style={{ color: "var(--ink-3)" }}>
                    로그인하면 크리에이터 소개를 확인할 수 있습니다
                  </p>
                )}
              </Link>

              {/* 채널 통계 */}
              <Link href={isLoggedIn ? `/${kit.slug}` : `/advertiser/login?next=/discover`} className="shrink-0 hidden lg:flex flex-col gap-2 w-48">
                {isLoggedIn ? topChannels.map((ch) => (
                  <div key={ch.platform} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0"
                        style={{ background: "var(--surface-2)", color: "var(--ink-3)" }}>
                        {PLATFORM_ICON[ch.platform] ?? "??"}
                      </span>
                      <span className="text-xs truncate" style={{ color: "var(--ink-3)" }}>{ch.channel_name}</span>
                    </div>
                    <span className="text-sm font-semibold tabular-nums shrink-0" style={{ color: "var(--ink)" }}>
                      {formatK(ch.subscriber_count ?? 0)}
                    </span>
                  </div>
                )) : (
                  <div className="flex items-center gap-1.5">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: "var(--ink-4)" }}>
                      <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                    <span className="text-xs" style={{ color: "var(--ink-4)" }}>로그인 후 확인</span>
                  </div>
                )}
              </Link>

              {/* 단가 */}
              <div className="shrink-0 text-right w-20 hidden xl:block">
                {isLoggedIn && minPrice ? (
                  <>
                    <p className="text-sm font-bold tabular-nums" style={{ color: "var(--brand)" }}>{minPrice}</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--ink-4)" }}>최저 단가</p>
                  </>
                ) : isLoggedIn ? (
                  <p className="text-xs" style={{ color: "var(--ink-4)" }}>단가 미등록</p>
                ) : (
                  <p className="text-sm font-bold blur-sm select-none" style={{ color: "var(--brand)" }}>000만~</p>
                )}
              </div>

              {/* 총 팔로워 */}
              <div className="shrink-0 text-right w-16">
                {isLoggedIn ? (
                  totalSubs > 0 && (
                    <>
                      <p className="text-base font-bold tabular-nums" style={{ color: "var(--ink)" }}>{formatK(totalSubs)}</p>
                      <p className="text-xs mt-0.5" style={{ color: "var(--ink-4)" }}>팔로워</p>
                    </>
                  )
                ) : (
                  <p className="text-base font-bold blur-sm select-none" style={{ color: "var(--ink)" }}>00만</p>
                )}
              </div>

              {/* 북마크 */}
              <button
                onClick={(e) => toggleBookmark(e, kit.slug)}
                className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-gray-100"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill={isBookmarked ? "var(--brand)" : "none"} stroke={isBookmarked ? "var(--brand)" : "var(--ink-4)"} strokeWidth="2">
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
                </svg>
              </button>
            </div>
          );
        })}
      </div>

      {/* 비교 floating bar */}
      {selected.size >= 2 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 px-6 py-3 rounded-2xl shadow-xl"
          style={{ background: "var(--ink)", color: "#fff" }}>
          <span className="text-sm font-semibold">{selected.size}명 선택됨</span>
          <button
            onClick={() => setCompareOpen(true)}
            className="text-sm font-bold px-4 py-1.5 rounded-lg"
            style={{ background: "var(--brand)" }}
          >
            비교하기
          </button>
          <button onClick={() => setSelected(new Set())} className="text-sm opacity-60 hover:opacity-100">
            취소
          </button>
        </div>
      )}

      {/* 비교 모달 */}
      {compareOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-auto">
            {/* 모달 헤더 */}
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid var(--border-faint)" }}>
              <h2 className="text-lg font-bold" style={{ color: "var(--ink)" }}>크리에이터 비교</h2>
              <button onClick={() => setCompareOpen(false)} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100" style={{ color: "var(--ink-3)" }}>✕</button>
            </div>

            {/* 비교 테이블 */}
            <div className="p-6">
              <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${selectedCreators.length}, 1fr)` }}>
                {selectedCreators.map(({ kit, profile, channels: chs }) => {
                  const name = profile?.full_name ?? kit.slug;
                  const totalSubs = chs.reduce((s, c) => s + (c.subscriber_count ?? 0), 0);
                  const minPrice = formatPrice(kit.pricing);

                  return (
                    <div key={kit.id} className="flex flex-col gap-4">
                      {/* 프로필 */}
                      <div className="text-center">
                        <img
                          src={`https://i.pravatar.cc/96?u=${encodeURIComponent(kit.slug)}`}
                          alt={name}
                          width={64} height={64}
                          className="w-16 h-16 rounded-2xl object-cover mx-auto mb-3"
                        />
                        <p className="font-bold" style={{ color: "var(--ink)" }}>{name}</p>
                        {kit.category && <p className="text-xs mt-1" style={{ color: "var(--ink-3)" }}>{kit.category}</p>}
                      </div>

                      {/* 총 팔로워 */}
                      <div className="rounded-xl p-4 text-center" style={{ background: "var(--surface-2)" }}>
                        <p className="text-2xl font-bold tabular-nums" style={{ color: "var(--ink)" }}>{formatK(totalSubs)}</p>
                        <p className="text-xs mt-1" style={{ color: "var(--ink-4)" }}>총 팔로워</p>
                      </div>

                      {/* 채널별 통계 */}
                      <div className="space-y-2">
                        {chs.sort((a, b) => (b.subscriber_count ?? 0) - (a.subscriber_count ?? 0)).map((ch) => (
                          <div key={ch.platform} className="flex items-center justify-between px-3 py-2 rounded-lg" style={{ border: "1px solid var(--border-faint)" }}>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: "var(--surface-2)", color: "var(--ink-3)" }}>
                                {PLATFORM_ICON[ch.platform] ?? "??"}
                              </span>
                              <span className="text-xs truncate max-w-[80px]" style={{ color: "var(--ink-3)" }}>{ch.channel_name}</span>
                            </div>
                            <span className="text-sm font-bold tabular-nums" style={{ color: "var(--ink)" }}>{formatK(ch.subscriber_count ?? 0)}</span>
                          </div>
                        ))}
                      </div>

                      {/* 단가 */}
                      {minPrice && (
                        <div className="rounded-xl p-4 text-center" style={{ background: "var(--brand-softer)" }}>
                          <p className="text-lg font-bold" style={{ color: "var(--brand)" }}>{minPrice}</p>
                          <p className="text-xs mt-1" style={{ color: "var(--ink-4)" }}>최저 단가</p>
                        </div>
                      )}

                      {/* bio */}
                      {kit.bio && (
                        <p className="text-xs leading-relaxed" style={{ color: "var(--ink-3)" }}>{kit.bio}</p>
                      )}

                      {/* 제안 버튼 */}
                      <Link
                        href={`/${kit.slug}/inquiry`}
                        onClick={() => setCompareOpen(false)}
                        className="w-full text-center text-sm font-semibold py-2.5 rounded-xl text-white"
                        style={{ background: "var(--brand)" }}
                      >
                        제안서 보내기
                      </Link>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
