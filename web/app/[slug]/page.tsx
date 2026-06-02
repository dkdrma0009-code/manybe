import { notFound } from "next/navigation";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase";
import { getAdvertiserSession } from "@/lib/supabase-server";
import type { Metadata } from "next";
import AdvertiserNav from "@/components/AdvertiserNav";
import Logo from "@/components/Logo";

interface MediaKit {
  id: string;
  user_id: string;
  slug: string;
  bio: string | null;
  pricing: Record<string, number> | null;
  past_brands: string[] | null;
  is_form_enabled: boolean;
  view_count: number;
  category: string | null;
  badges: string[] | null;
  theme: string | null;
  section_order: string[] | null;
}

interface SocialChannel {
  platform: string;
  channel_name: string;
  subscriber_count: number;
  view_count: number;
  profile_image_url: string;
}

interface Profile {
  full_name: string | null;
  email: string | null;
}

async function getMediaKit(slug: string) {
  const supabase = getSupabase();
  const { data: kit } = await supabase.from("media_kits").select("*").eq("slug", slug).single();
  if (!kit) return null;
  const [{ data: channels }, { data: profile }] = await Promise.all([
    supabase.from("social_channels").select("*").eq("user_id", kit.user_id),
    supabase.from("profiles").select("full_name, email").eq("id", kit.user_id).single(),
  ]);
  supabase.from("media_kits").update({ view_count: (kit.view_count ?? 0) + 1 }).eq("id", kit.id);
  return { kit: kit as MediaKit, channels: (channels ?? []) as SocialChannel[], profile: profile as Profile | null };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const data = await getMediaKit(slug);
  if (!data) return { title: "매니비 — 미디어 키트" };
  const name = data.profile?.full_name ?? slug;
  return {
    title: `${name}의 미디어 키트 — 매니비`,
    description: data.kit.bio ?? `${name} 크리에이터의 미디어 키트`,
  };
}

function formatK(n: number): string {
  if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(1).replace(".0", "")}억`;
  if (n >= 10_000) return `${Math.floor(n / 10_000)}만`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(".0", "")}천`;
  return n.toLocaleString("ko-KR");
}

const PLATFORM_META: Record<string, { label: string; icon: string; color: string }> = {
  youtube:   { label: "YouTube",   icon: "YT", color: "#FF0000" },
  instagram: { label: "Instagram", icon: "IG", color: "#E1306C" },
  tiktok:    { label: "TikTok",    icon: "TK", color: "#010101" },
};

const PRICING_LABELS: Record<string, string> = {
  short_form: "숏폼 (60초 이하)",
  long_form:  "롱폼 (10분 이상)",
  story:      "스토리 / 릴스",
  mention:    "제품 언급",
  dedicated:  "전체 광고 영상",
};

const THEME_CATALOG: Record<string, { primary: string; bg: string; accent: string }> = {
  indigo:  { primary: "#5566DF", bg: "#F0EFFE", accent: "#E8E4FF" },
  rose:    { primary: "#E11D48", bg: "#FFF1F2", accent: "#FFE4E6" },
  emerald: { primary: "#059669", bg: "#ECFDF5", accent: "#D1FAE5" },
  amber:   { primary: "#D97706", bg: "#FFFBEB", accent: "#FEF3C7" },
  slate:   { primary: "#334155", bg: "#F1F5F9", accent: "#E2E8F0" },
};

const BADGE_CATALOG: Record<string, { emoji: string; label: string }> = {
  sub_100k: { emoji: "🔥", label: "10만 구독" }, sub_500k: { emoji: "⚡", label: "50만 구독" },
  sub_1m: { emoji: "💎", label: "100만 구독" }, high_engagement: { emoji: "📈", label: "높은 참여율" },
  fast_growth: { emoji: "🚀", label: "빠른 성장" }, viral: { emoji: "🌊", label: "바이럴 경험" },
  reliable: { emoji: "✅", label: "신뢰할 수 있는" }, on_time: { emoji: "⏰", label: "기한 엄수" },
  good_comm: { emoji: "💬", label: "소통 잘됨" }, creative: { emoji: "🎨", label: "크리에이티브" },
  data_driven: { emoji: "📊", label: "데이터 중심" }, long_term: { emoji: "🤝", label: "장기 협업 선호" },
  food: { emoji: "🍔", label: "푸드" }, travel: { emoji: "✈️", label: "여행" },
  beauty: { emoji: "💄", label: "뷰티" }, tech: { emoji: "💻", label: "테크" },
  fashion: { emoji: "👗", label: "패션" }, fitness: { emoji: "🏋️", label: "피트니스" },
  family: { emoji: "👨‍👩‍👧", label: "가족 콘텐츠" }, education: { emoji: "📚", label: "교육" },
  entertainment: { emoji: "😂", label: "엔터테인먼트" }, gaming: { emoji: "🎮", label: "게이밍" },
  finance: { emoji: "💰", label: "경제/재테크" }, pet: { emoji: "🐾", label: "반려동물" },
  kids: { emoji: "👶", label: "키즈" }, studio: { emoji: "🎬", label: "스튜디오 보유" },
  overseas: { emoji: "🌏", label: "해외 거주" }, multi_platform: { emoji: "📱", label: "멀티 플랫폼" },
  brand_safe: { emoji: "🛡️", label: "브랜드 세이프" },
};

export default async function MediaKitPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [data, session] = await Promise.all([getMediaKit(slug), getAdvertiserSession()]);
  if (!data) notFound();

  const { kit, channels, profile } = data;
  const creatorName = profile?.full_name ?? slug;
  const totalSubs = channels.reduce((s, c) => s + (c.subscriber_count ?? 0), 0);
  const totalViews = channels.reduce((s, c) => s + (c.view_count ?? 0), 0);
  const theme = THEME_CATALOG[kit.theme ?? "indigo"] ?? THEME_CATALOG.indigo;
  const creatorBadges = kit.badges ?? [];
  const sectionOrder = kit.section_order ?? ["channels", "pricing", "brands"];

  return (
    <div className="min-h-screen" style={{ background: "var(--surface-2)", "--brand": theme.primary, "--brand-soft": theme.bg, "--brand-softer": theme.accent } as React.CSSProperties}>
      {/* Header */}
      {session ? (
        <AdvertiserNav userName={session.profile.full_name ?? ""} current="discover" />
      ) : (
        <header className="bg-white sticky top-0 z-10" style={{ borderBottom: "1px solid var(--border-faint)" }}>
          <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
            <Link href="/discover"><Logo size={18} period /></Link>
            <Link href="/advertiser/login" className="text-sm font-semibold px-4 py-2 rounded-lg text-white" style={{ background: "var(--brand)" }}>로그인</Link>
          </div>
        </header>
      )}

      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-3 gap-6">

          {/* 왼쪽: 프로필 + CTA */}
          <div className="space-y-4">
            {/* 프로필 카드 */}
            <div className="bg-white rounded-2xl overflow-hidden" style={{ border: "1px solid var(--border-faint)" }}>
              <div className="h-20" style={{ background: `linear-gradient(135deg, var(--brand-soft) 0%, var(--brand-softer) 100%)` }} />
              <div className="px-6 pb-6">
                <img
                  src={`https://i.pravatar.cc/128?u=${encodeURIComponent(slug)}`}
                  alt={creatorName}
                  width={80} height={80}
                  className="w-20 h-20 rounded-2xl object-cover border-4 border-white -mt-10 mb-3"
                />
                <div className="flex items-start gap-2 mb-1">
                  <h1 className="text-xl font-bold flex-1" style={{ color: "var(--ink)" }}>{creatorName}</h1>
                  {kit.category && (
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 mt-0.5" style={{ background: "var(--brand-soft)", color: "var(--brand)" }}>
                      {kit.category}
                    </span>
                  )}
                </div>
                {kit.bio && <p className="text-sm leading-relaxed" style={{ color: "var(--ink-3)" }}>{kit.bio}</p>}

                {creatorBadges.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {creatorBadges.slice(0, 6).map((id) => {
                      const b = BADGE_CATALOG[id];
                      if (!b) return null;
                      return (
                        <span key={id} className="text-xs font-medium px-2 py-1 rounded-full" style={{ background: "var(--brand-soft)", color: "var(--brand)" }}>
                          {b.emoji} {b.label}
                        </span>
                      );
                    })}
                  </div>
                )}

                {totalSubs > 0 && (
                  <div className="mt-4 pt-4 flex gap-6" style={{ borderTop: "1px solid var(--border-faint)" }}>
                    <div>
                      <p className="text-2xl font-bold tabular-nums" style={{ color: "var(--ink)" }}>{formatK(totalSubs)}</p>
                      <p className="text-xs mt-0.5" style={{ color: "var(--ink-4)" }}>총 팔로워</p>
                    </div>
                    {totalViews > 0 && (
                      <div>
                        <p className="text-2xl font-bold tabular-nums" style={{ color: "var(--ink)" }}>{formatK(totalViews)}</p>
                        <p className="text-xs mt-0.5" style={{ color: "var(--ink-4)" }}>총 조회수</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* 제안 CTA */}
            {kit.is_form_enabled ? (
              session ? (
                <div className="bg-white rounded-2xl p-5" style={{ border: "1px solid var(--border-faint)" }}>
                  <p className="text-sm font-semibold mb-1" style={{ color: "var(--ink)" }}>협찬 제안하기</p>
                  <p className="text-xs mb-4" style={{ color: "var(--ink-3)" }}>{session.profile.full_name} · 인증된 광고주</p>
                  <Link
                    href={`/${slug}/inquiry`}
                    className="block w-full text-center text-sm font-bold py-3 rounded-xl text-white hover:opacity-90 transition-opacity"
                    style={{ background: "var(--brand)" }}
                  >
                    제안서 보내기
                  </Link>
                </div>
              ) : (
                <div className="bg-white rounded-2xl p-5" style={{ border: "1px solid var(--border-faint)" }}>
                  <p className="text-sm font-semibold mb-1" style={{ color: "var(--ink)" }}>협찬 제안하기</p>
                  <p className="text-xs mb-4" style={{ color: "var(--ink-3)" }}>광고주 로그인 후 제안을 보낼 수 있습니다</p>
                  <Link
                    href={`/advertiser/login?next=/${slug}/inquiry`}
                    className="block w-full text-center text-sm font-bold py-3 rounded-xl text-white hover:opacity-90 transition-opacity"
                    style={{ background: "var(--brand)" }}
                  >
                    로그인 후 제안하기
                  </Link>
                  <p className="text-center text-xs mt-3" style={{ color: "var(--ink-4)" }}>
                    계정 없으신가요?{" "}
                    <Link href="/advertiser/signup" className="font-semibold" style={{ color: "var(--brand)" }}>광고주 가입</Link>
                  </p>
                </div>
              )
            ) : (
              <div className="bg-white rounded-2xl p-5" style={{ border: "1px solid var(--border-faint)" }}>
                <p className="text-sm" style={{ color: "var(--ink-3)" }}>
                  현재 협찬 문의를 받지 않습니다.{profile?.email && (<>{" "}<a href={`mailto:${profile.email}`} className="font-semibold" style={{ color: "var(--brand)" }}>{profile.email}</a></>)}
                </p>
              </div>
            )}

            {/* 협업 브랜드 */}
            {kit.past_brands && kit.past_brands.length > 0 && (
              <div className="bg-white rounded-2xl p-5" style={{ border: "1px solid var(--border-faint)" }}>
                <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--ink-4)" }}>협업 브랜드</p>
                <div className="flex flex-wrap gap-2">
                  {kit.past_brands.map((brand) => (
                    <span key={brand} className="text-xs font-medium px-2.5 py-1 rounded-full" style={{ background: "var(--surface-2)", color: "var(--ink-2)" }}>
                      {brand}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 오른쪽: 채널 통계 + 단가 */}
          <div className="lg:col-span-2 space-y-4">
            {/* 채널 현황 */}
            {sectionOrder[0] === "pricing" && kit.pricing && Object.entries(kit.pricing).some(([, v]) => v > 0) && (
              <div className="bg-white rounded-2xl p-6" style={{ border: "1px solid var(--border-faint)" }}>
                <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "var(--ink-4)" }}>광고 단가</p>
                <div className="space-y-0">
                  {Object.entries(kit.pricing).filter(([, v]) => v && v > 0).map(([key, value], idx, arr) => (
                    <div key={key} className="flex items-center justify-between py-3.5"
                      style={{ borderBottom: idx < arr.length - 1 ? "1px solid var(--border-faint)" : "none" }}>
                      <span className="text-sm" style={{ color: "var(--ink-2)" }}>{PRICING_LABELS[key] ?? key}</span>
                      <span className="text-sm font-bold tabular-nums" style={{ color: "var(--ink)" }}>{(value as number).toLocaleString("ko-KR")}원~</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {channels.length > 0 && (
              <div className="bg-white rounded-2xl p-6" style={{ border: "1px solid var(--border-faint)" }}>
                <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "var(--ink-4)" }}>채널 현황</p>
                <div className="space-y-3">
                  {channels.map((ch) => {
                    const meta = PLATFORM_META[ch.platform] ?? { label: ch.platform, icon: "??", color: "#666" };
                    return (
                      <div key={ch.platform} className="flex items-center justify-between py-3 rounded-xl px-4" style={{ background: "var(--surface-2)" }}>
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-bold px-2 py-1 rounded-lg" style={{ background: "#fff", color: meta.color }}>
                            {meta.icon}
                          </span>
                          <div>
                            <p className="text-sm font-semibold" style={{ color: "var(--ink)" }}>{ch.channel_name}</p>
                            <p className="text-xs" style={{ color: "var(--ink-4)" }}>{meta.label}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold tabular-nums" style={{ color: "var(--ink)" }}>{formatK(ch.subscriber_count)}</p>
                          <p className="text-xs" style={{ color: "var(--ink-4)" }}>구독자</p>
                          {ch.view_count > 0 && (
                            <p className="text-xs tabular-nums mt-0.5" style={{ color: "var(--ink-4)" }}>조회 {formatK(ch.view_count)}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 광고 단가 */}
            {kit.pricing && Object.entries(kit.pricing).some(([, v]) => v > 0) && (
              <div className="bg-white rounded-2xl p-6" style={{ border: "1px solid var(--border-faint)" }}>
                <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "var(--ink-4)" }}>광고 단가</p>
                <div className="space-y-0">
                  {Object.entries(kit.pricing)
                    .filter(([, v]) => v && v > 0)
                    .map(([key, value], idx, arr) => (
                      <div key={key} className="flex items-center justify-between py-3.5"
                        style={{ borderBottom: idx < arr.length - 1 ? "1px solid var(--border-faint)" : "none" }}>
                        <span className="text-sm" style={{ color: "var(--ink-2)" }}>{PRICING_LABELS[key] ?? key}</span>
                        <span className="text-sm font-bold tabular-nums" style={{ color: "var(--ink)" }}>
                          {(value as number).toLocaleString("ko-KR")}원~
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <footer className="text-center py-8 text-xs" style={{ color: "var(--ink-4)" }}>
        Powered by{" "}
        <Link href="/discover" className="font-semibold" style={{ color: "var(--brand)" }}>매니비</Link>
      </footer>
    </div>
  );
}
