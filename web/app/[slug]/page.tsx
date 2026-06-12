import { notFound } from "next/navigation";
import Link from "next/link";

// 방문마다 서버 렌더 — 조회 기록(media_kit_views) 적재 + 킷 수정사항 즉시 반영
export const dynamic = "force-dynamic";
import { getSupabase } from "@/lib/supabase";
import { getAdvertiserSession } from "@/lib/supabase-server";
import type { Metadata } from "next";
import AdvertiserNav from "@/components/AdvertiserNav";
import Logo from "@/components/Logo";

interface HighlightItem {
  label: string;
  value: string;
  note?: string;
  thumbnail?: string;
}

interface HighlightSection {
  id: string;
  title: string;
  items: HighlightItem[];
}

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
  cover_image_url: string | null;
  highlights: HighlightSection[] | null;
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
  // 방문자 통계 기록 (대시보드 '미디어 키트 조회' 카운트의 데이터 소스)
  await supabase.from("media_kit_views").insert({ user_id: kit.user_id });
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
  const highlights = kit.highlights ?? [];
  const hasCover = !!kit.cover_image_url;
  const heroText = hasCover ? "#ffffff" : "var(--ink)";
  const heroSubText = hasCover ? "rgba(255,255,255,0.75)" : "var(--ink-3)";

  return (
    <div className="min-h-screen bg-white" style={{ "--brand": theme.primary, "--brand-soft": theme.bg, "--brand-softer": theme.accent } as React.CSSProperties}>
      {/* Header */}
      {session ? (
        <AdvertiserNav userName={session.profile.full_name ?? ""} current="discover" />
      ) : (
        <header className="bg-white/80 backdrop-blur sticky top-0 z-10" style={{ borderBottom: "1px solid var(--border-faint)" }}>
          <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
            <Link href="/discover"><Logo size={18} period /></Link>
            <Link href="/advertiser/login" className="text-sm font-semibold px-4 py-2 rounded-lg text-white" style={{ background: "var(--brand)" }}>로그인</Link>
          </div>
        </header>
      )}

      {/* Hero */}
      <section className="relative" style={kit.cover_image_url
        ? { backgroundImage: `url(${kit.cover_image_url})`, backgroundSize: "cover", backgroundPosition: "center" }
        : { background: `linear-gradient(160deg, var(--brand-soft) 0%, var(--brand-softer) 60%, #fff 100%)` }
      }>
        {kit.cover_image_url && <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.62)" }} />}
        <div className="relative max-w-4xl mx-auto px-6 py-12">
          <div className="flex flex-col md:flex-row md:items-center gap-8">
            {/* 프로필 */}
            <div className="flex items-start gap-5 flex-1">
              <img
                src={`https://i.pravatar.cc/128?u=${encodeURIComponent(slug)}`}
                alt={creatorName}
                width={96} height={96}
                className="w-24 h-24 rounded-3xl object-cover shadow-md shrink-0"
              />
              <div>
                {kit.category && (
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: "var(--brand)", color: "#fff" }}>
                    {kit.category}
                  </span>
                )}
                <h1 className="text-3xl font-extrabold mt-2 mb-1 tracking-tight" style={{ color: heroText }}>{creatorName}</h1>
                {kit.bio && <p className="text-sm leading-relaxed max-w-md" style={{ color: heroSubText }}>{kit.bio}</p>}
                {creatorBadges.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {creatorBadges.slice(0, 5).map((id) => {
                      const b = BADGE_CATALOG[id];
                      if (!b) return null;
                      return (
                        <span key={id} className="text-xs font-medium px-2.5 py-1 rounded-full bg-white/70" style={{ color: "var(--brand)" }}>
                          {b.emoji} {b.label}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* 스탯 + CTA */}
            <div className="flex flex-col gap-5 md:items-end shrink-0">
              <div className="flex gap-6">
                {totalSubs > 0 && (
                  <div className="text-center">
                    <p className="text-3xl font-extrabold tabular-nums" style={{ color: heroText }}>{formatK(totalSubs)}</p>
                    <p className="text-xs mt-0.5" style={{ color: heroSubText }}>총 팔로워</p>
                  </div>
                )}
                {totalViews > 0 && (
                  <div className="text-center">
                    <p className="text-3xl font-extrabold tabular-nums" style={{ color: heroText }}>{formatK(totalViews)}</p>
                    <p className="text-xs mt-0.5" style={{ color: heroSubText }}>총 조회수</p>
                  </div>
                )}
                <div className="text-center">
                  <p className="text-3xl font-extrabold tabular-nums" style={{ color: heroText }}>{channels.length}</p>
                  <p className="text-xs mt-0.5" style={{ color: heroSubText }}>채널</p>
                </div>
              </div>

              {kit.is_form_enabled ? (
                session ? (
                  <Link href={`/${slug}/inquiry`}
                    className="px-8 py-3 rounded-2xl text-white font-bold text-sm shadow-md hover:opacity-90 transition-opacity"
                    style={{ background: "var(--brand)" }}>
                    협찬 제안하기 →
                  </Link>
                ) : (
                  <div className="flex flex-col items-end gap-1.5">
                    <Link href={`/advertiser/login?next=/${slug}/inquiry`}
                      className="px-8 py-3 rounded-2xl text-white font-bold text-sm shadow-md hover:opacity-90 transition-opacity"
                      style={{ background: "var(--brand)" }}>
                      로그인 후 제안하기 →
                    </Link>
                    <p className="text-xs" style={{ color: "var(--ink-4)" }}>
                      계정 없으신가요?{" "}
                      <Link href="/advertiser/signup" className="font-semibold" style={{ color: "var(--brand)" }}>광고주 가입</Link>
                    </p>
                  </div>
                )
              ) : profile?.email && (
                <a href={`mailto:${profile.email}`} className="text-sm font-semibold" style={{ color: "var(--brand)" }}>
                  {profile.email}로 문의하기
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 콘텐츠 */}
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">

        {/* 크리에이터 하이라이트 */}
        {highlights.length > 0 && (
          <div className="space-y-6">
            {highlights.map((section) => (
              <div key={section.id}>
                <p className="text-sm font-bold mb-3" style={{ color: "var(--ink)" }}>{section.title}</p>
                <div className="grid sm:grid-cols-2 gap-3">
                  {section.items.map((item, idx) => (
                    item.thumbnail ? (
                      /* 썸네일 카드 */
                      <div key={idx} className="bg-white rounded-2xl overflow-hidden flex" style={{ border: "1px solid var(--border-faint)" }}>
                        <img
                          src={item.thumbnail}
                          alt={item.label}
                          className="w-32 h-24 object-cover shrink-0"
                        />
                        <div className="flex-1 p-4 flex flex-col justify-between min-w-0">
                          <div>
                            <p className="text-sm font-semibold leading-snug" style={{ color: "var(--ink)" }}>{item.label}</p>
                            {item.note && <p className="text-xs mt-1" style={{ color: "var(--ink-4)" }}>{item.note}</p>}
                          </div>
                          <p className="text-base font-extrabold tabular-nums mt-2" style={{ color: "var(--brand)" }}>{item.value}</p>
                        </div>
                      </div>
                    ) : (
                      /* 일반 카드 */
                      <div key={idx} className="bg-white rounded-2xl p-5 flex items-center justify-between gap-4" style={{ border: "1px solid var(--border-faint)" }}>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold" style={{ color: "var(--ink)" }}>{item.label}</p>
                          {item.note && <p className="text-xs mt-0.5" style={{ color: "var(--ink-4)" }}>{item.note}</p>}
                        </div>
                        <p className="text-xl font-extrabold tabular-nums shrink-0" style={{ color: "var(--brand)" }}>{item.value}</p>
                      </div>
                    )
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 채널 현황 */}
        {channels.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--ink-4)" }}>채널 현황</p>
            <div className="grid sm:grid-cols-2 gap-3">
              {channels.map((ch) => {
                const meta = PLATFORM_META[ch.platform] ?? { label: ch.platform, icon: "??", color: "#666" };
                return (
                  <div key={ch.platform} className="bg-white rounded-2xl p-5 flex items-center gap-4" style={{ border: "1px solid var(--border-faint)" }}>
                    <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xs font-extrabold text-white shrink-0" style={{ background: meta.color }}>
                      {meta.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate" style={{ color: "var(--ink)" }}>{ch.channel_name}</p>
                      <p className="text-xs" style={{ color: "var(--ink-4)" }}>{meta.label}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xl font-extrabold tabular-nums" style={{ color: "var(--brand)" }}>{formatK(ch.subscriber_count)}</p>
                      <p className="text-xs" style={{ color: "var(--ink-4)" }}>구독자</p>
                      {ch.view_count > 0 && <p className="text-xs tabular-nums" style={{ color: "var(--ink-4)" }}>조회 {formatK(ch.view_count)}</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 광고 단가 */}
        {kit.pricing && Object.entries(kit.pricing).some(([, v]) => v > 0) && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--ink-4)" }}>광고 단가</p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Object.entries(kit.pricing).filter(([, v]) => v && v > 0).map(([key, value]) => (
                <div key={key} className="bg-white rounded-2xl p-5" style={{ border: "1px solid var(--border-faint)" }}>
                  <p className="text-xs mb-2" style={{ color: "var(--ink-4)" }}>{PRICING_LABELS[key] ?? key}</p>
                  <p className="text-2xl font-extrabold tabular-nums" style={{ color: "var(--brand)" }}>
                    {(value as number).toLocaleString("ko-KR")}
                    <span className="text-sm font-normal ml-1" style={{ color: "var(--ink-4)" }}>원~</span>
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 협업 브랜드 */}
        {kit.past_brands && kit.past_brands.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--ink-4)" }}>협업 브랜드</p>
            <div className="bg-white rounded-2xl p-5 flex flex-wrap gap-2" style={{ border: "1px solid var(--border-faint)" }}>
              {kit.past_brands.map((brand) => (
                <span key={brand} className="text-sm font-semibold px-3 py-1.5 rounded-full" style={{ background: "var(--brand-soft)", color: "var(--brand)" }}>
                  {brand}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <footer className="text-center py-8 text-xs" style={{ color: "var(--ink-4)" }}>
        Powered by{" "}
        <Link href="/discover" className="font-semibold" style={{ color: "var(--brand)" }}>매니비</Link>
      </footer>
    </div>
  );
}
