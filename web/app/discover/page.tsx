import Link from "next/link";
import { getSupabase } from "@/lib/supabase";
import { getAdvertiserSession } from "@/lib/supabase-server";
import { logoutAdvertiser } from "../advertiser/signup/actions";

const CATEGORIES: { key: string; label: string; emoji: string; color: string }[] = [
  { key: "전체",        label: "전체",       emoji: "✨", color: "#6C63FF" },
  { key: "뷰티/패션",   label: "뷰티",   emoji: "💄", color: "#E91E8C" },
  { key: "게임",        label: "게임",   emoji: "🎮", color: "#5C6BC0" },
  { key: "음식/요리",   label: "푸드",   emoji: "🍳", color: "#F57C00" },
  { key: "라이프스타일",label: "라이프", emoji: "🌿", color: "#43A047" },
  { key: "테크/IT",     label: "테크",   emoji: "💻", color: "#0288D1" },
  { key: "여행",        label: "여행",   emoji: "✈️", color: "#00897B" },
  { key: "스포츠",      label: "스포츠", emoji: "⚽", color: "#E53935" },
  { key: "교육",        label: "교육",   emoji: "📚", color: "#7B1FA2" },
  { key: "엔터테인먼트",label: "엔터",   emoji: "🎬", color: "#D81B60" },
];

const PLATFORMS  = ["전체", "youtube", "instagram", "tiktok"];
const PLATFORM_LABEL: Record<string, string> = { youtube: "YouTube", instagram: "Instagram", tiktok: "TikTok" };
const PLATFORM_EMOJI: Record<string, string> = { youtube: "▶", instagram: "◎", tiktok: "♪" };

const SCALE_OPTIONS = [
  { label: "전체", min: 0, max: Infinity },
  { label: "나노 (1만↓)", min: 0, max: 10_000 },
  { label: "마이크로 (1만~10만)", min: 10_000, max: 100_000 },
  { label: "미드 (10만~100만)", min: 100_000, max: 1_000_000 },
  { label: "매크로 (100만↑)", min: 1_000_000, max: Infinity },
];

function formatK(n: number): string {
  if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(1).replace(".0", "")}억`;
  if (n >= 10_000) return `${Math.floor(n / 10_000)}만`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(".0", "")}천`;
  return n.toLocaleString("ko-KR");
}

const AVATAR_COLORS = ["#E8472A", "#3D5AFE", "#1D8348", "#C48A40", "#8B5CF6", "#0F9B8E"];
function avatarColor(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = s.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

const PLATFORM_ICON: Record<string, string> = { youtube: "▶", instagram: "◎", tiktok: "♪" };
const PLATFORM_COLOR: Record<string, string> = { youtube: "#FF0000", instagram: "#E1306C", tiktok: "#010101" };

interface SearchParams {
  category?: string;
  platform?: string;
  scale?: string;
  q?: string;
}

export default async function DiscoverPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const session = await getAdvertiserSession();
  const supabase = getSupabase();

  const { data: kits } = await supabase
    .from("media_kits")
    .select("id, user_id, slug, bio, category, past_brands, pricing")
    .eq("is_form_enabled", true);

  const userIds = (kits ?? []).map((k) => k.user_id);

  const [{ data: profiles }, { data: channels }] = await Promise.all([
    supabase.from("profiles").select("id, full_name").in("id", userIds),
    supabase.from("social_channels").select("user_id, platform, channel_name, subscriber_count").in("user_id", userIds),
  ]);

  const profileMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]));
  const channelMap: Record<string, typeof channels> = {};
  for (const ch of channels ?? []) {
    channelMap[ch.user_id] ??= [];
    channelMap[ch.user_id]!.push(ch);
  }

  const activeCategory = params.category ?? "전체";
  const activePlatform = params.platform ?? "전체";
  const activeScale    = params.scale ?? "전체";
  const query          = params.q ?? "";

  const scaleOption = SCALE_OPTIONS.find((s) => s.label === activeScale) ?? SCALE_OPTIONS[0];

  const creators = (kits ?? [])
    .map((kit) => ({
      kit,
      profile: profileMap[kit.user_id],
      channels: channelMap[kit.user_id] ?? [],
    }))
    .filter(({ kit, profile, channels: chs }) => {
      if (!profile) return false;
      if (activeCategory !== "전체" && kit.category !== activeCategory) return false;  // key 기준 비교
      if (activePlatform !== "전체" && !chs.some((c) => c.platform === activePlatform)) return false;
      if (query) {
        const name = profile.full_name?.toLowerCase() ?? "";
        if (!name.includes(query.toLowerCase())) return false;
      }
      if (scaleOption.max !== Infinity || scaleOption.min !== 0) {
        const maxSubs = Math.max(...chs.map((c) => c.subscriber_count ?? 0), 0);
        if (maxSubs < scaleOption.min || maxSubs > scaleOption.max) return false;
      }
      return true;
    });

  function filterUrl(patch: Partial<SearchParams>) {
    const p = new URLSearchParams();
    const merged = { category: activeCategory, platform: activePlatform, scale: activeScale, q: query, ...patch };
    if (merged.category && merged.category !== "전체") p.set("category", merged.category);
    if (merged.platform && merged.platform !== "전체") p.set("platform", merged.platform);
    if (merged.scale && merged.scale !== "전체") p.set("scale", merged.scale);
    if (merged.q) p.set("q", merged.q);
    return `/discover${p.toString() ? "?" + p.toString() : ""}`;
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--surface-2)" }}>
      {/* Header */}
      <header className="bg-white sticky top-0 z-10" style={{ borderBottom: "1px solid var(--border-faint)" }}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <Link href="/discover" className="flex items-center gap-2 shrink-0">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "var(--brand)" }}>
              <span className="text-white font-bold text-xs">M</span>
            </div>
            <span className="font-bold text-gray-900 text-sm hidden sm:block">매니비</span>
          </Link>

          <form method="get" action="/discover" className="flex-1 max-w-md">
            <input
              name="q"
              defaultValue={query}
              placeholder="크리에이터 검색..."
              className="input-field"
              style={{ paddingTop: "0.5rem", paddingBottom: "0.5rem" }}
            />
            {activePlatform !== "전체" && <input type="hidden" name="platform" value={activePlatform} />}
            {activeCategory !== "전체" && <input type="hidden" name="category" value={activeCategory} />}
            {activeScale !== "전체" && <input type="hidden" name="scale" value={activeScale} />}
          </form>

          <div className="flex items-center gap-3 shrink-0">
            {session ? (
              <>
                <Link
                  href="/advertiser/dashboard"
                  className="text-xs font-semibold hidden sm:block"
                  style={{ color: "var(--brand)" }}
                >
                  보낸 제안
                </Link>
                <span className="text-sm hidden sm:block" style={{ color: "var(--ink-3)" }}>{session.profile.full_name}</span>
                <form action={logoutAdvertiser}>
                  <button className="text-xs transition-colors" style={{ color: "var(--ink-4)" }}>로그아웃</button>
                </form>
              </>
            ) : (
              <Link
                href="/advertiser/login"
                className="text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors hover:opacity-90"
                style={{ background: "var(--brand)" }}
              >
                로그인
              </Link>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-6">

        {/* 카테고리 — 배달앱 스타일 아이콘 그리드 */}
        <div className="bg-white rounded-2xl p-5 mb-4" style={{ border: "1px solid var(--border-faint)" }}>
          <div className="grid grid-cols-5 sm:grid-cols-10 gap-1">
            {CATEGORIES.map((cat) => {
              const isActive = activeCategory === cat.key;
              return (
                <Link
                  key={cat.key}
                  href={filterUrl({ category: cat.key })}
                  className="flex flex-col items-center gap-1.5 py-2 px-1 rounded-xl transition-colors hover:bg-gray-50 group"
                >
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl transition-all"
                    style={{
                      backgroundColor: isActive ? cat.color : "#F3F4F6",
                    }}
                  >
                    {cat.emoji}
                  </div>
                  <span
                    className="text-xs font-medium text-center leading-tight transition-colors"
                    style={{ color: isActive ? cat.color : "#6B7280" }}
                  >
                    {cat.label}
                  </span>
                  {isActive && (
                    <div className="w-1 h-1 rounded-full" style={{ backgroundColor: cat.color }} />
                  )}
                </Link>
              );
            })}
          </div>
        </div>

        {/* 플랫폼 + 규모 필터 칩 — 가로 스크롤 */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1 scrollbar-none -mx-6 px-6">
          {PLATFORMS.map((pl) => (
            <Link
              key={pl}
              href={filterUrl({ platform: pl })}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border whitespace-nowrap shrink-0"
              style={activePlatform === pl
                ? { background: "var(--ink)", color: "#fff", borderColor: "var(--ink)" }
                : { background: "#fff", color: "var(--ink-3)", borderColor: "var(--border)" }}
            >
              {pl !== "전체" && <span>{PLATFORM_EMOJI[pl]}</span>}
              {pl === "전체" ? "플랫폼 전체" : PLATFORM_LABEL[pl]}
            </Link>
          ))}
          <div className="w-px mx-1 shrink-0" style={{ background: "var(--border)" }} />
          {SCALE_OPTIONS.map((s) => (
            <Link
              key={s.label}
              href={filterUrl({ scale: s.label })}
              className="px-3 py-1.5 rounded-full text-xs font-semibold transition-all border whitespace-nowrap shrink-0"
              style={activeScale === s.label
                ? { background: "var(--ink)", color: "#fff", borderColor: "var(--ink)" }
                : { background: "#fff", color: "var(--ink-3)", borderColor: "var(--border)" }}
            >
              {s.label === "전체" ? "규모 전체" : s.label}
            </Link>
          ))}
        </div>

        {/* 결과 수 */}
        <p className="text-sm mb-5" style={{ color: "var(--ink-3)" }}>
          크리에이터 <span className="font-bold" style={{ color: "var(--ink)" }}>{creators.length}</span>명
        </p>

        {/* 크리에이터 그리드 */}
        {creators.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-5xl mb-4">🔍</p>
            <p className="font-bold text-lg mb-2" style={{ color: "var(--ink-2)" }}>조건에 맞는 크리에이터가 없습니다</p>
            <p className="text-sm" style={{ color: "var(--ink-4)" }}>필터를 바꾸거나 검색어를 다르게 입력해보세요</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {creators.map(({ kit, profile, channels: chs }) => {
              const name = profile?.full_name ?? kit.slug;
              const initial = name.charAt(0).toUpperCase();
              const color = avatarColor(name);
              const topChannels = [...chs].sort((a, b) => (b.subscriber_count ?? 0) - (a.subscriber_count ?? 0)).slice(0, 2);
              const totalSubs = chs.reduce((s, c) => s + (c.subscriber_count ?? 0), 0);

              return (
                <Link
                  key={kit.id}
                  href={`/${kit.slug}`}
                  className="bg-white rounded-2xl p-5 transition-all hover:shadow-md group"
                  style={{ border: "1px solid var(--border-faint)" }}
                >
                  {/* 아바타 + 이름 */}
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-extrabold text-lg shrink-0"
                      style={{ backgroundColor: color }}
                    >
                      {initial}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-sm truncate transition-colors" style={{ color: "var(--ink)" }}>
                        {name}
                      </p>
                      {kit.category && (
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ color: "var(--brand)", background: "var(--brand-soft)" }}>
                          {kit.category}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* bio */}
                  {kit.bio && (
                    <p className="text-xs mb-4 line-clamp-2 leading-relaxed" style={{ color: "var(--ink-3)" }}>{kit.bio}</p>
                  )}

                  {/* 채널 통계 */}
                  {topChannels.length > 0 ? (
                    <div className="space-y-2">
                      {topChannels.map((ch) => (
                        <div key={ch.platform} className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs" style={{ color: PLATFORM_COLOR[ch.platform] ?? "#666" }}>
                              {PLATFORM_ICON[ch.platform] ?? "◦"}
                            </span>
                            <span className="text-xs truncate max-w-[100px]" style={{ color: "var(--ink-3)" }}>{ch.channel_name}</span>
                          </div>
                          <span className="text-xs font-bold" style={{ color: "var(--ink)" }}>
                            {formatK(ch.subscriber_count ?? 0)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs" style={{ color: "var(--ink-4)" }}>채널 미연동</p>
                  )}

                  {/* 총 팔로워 */}
                  {totalSubs > 0 && chs.length > 1 && (
                    <div className="mt-3 pt-3 flex justify-between items-center" style={{ borderTop: "1px solid var(--border-faint)" }}>
                      <span className="text-xs" style={{ color: "var(--ink-4)" }}>총 팔로워</span>
                      <span className="text-xs font-extrabold" style={{ color: "var(--ink)" }}>{formatK(totalSubs)}</span>
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        )}

        {/* 광고주 가입 배너 (비로그인) */}
        {!session && (
          <div className="mt-12 rounded-2xl p-8 text-center text-white" style={{ background: "var(--brand)" }}>
            <p className="text-xl font-extrabold mb-2">크리에이터에게 제안하고 싶으신가요?</p>
            <p className="text-sm mb-6" style={{ color: "rgba(255,255,255,0.75)" }}>
              광고주로 가입하면 원하는 크리에이터에게 직접 협찬을 제안할 수 있습니다.
            </p>
            <Link
              href="/advertiser/signup"
              className="inline-block font-bold px-8 py-3 rounded-xl transition-colors hover:opacity-90"
              style={{ background: "#fff", color: "var(--brand)" }}
            >
              광고주 무료 가입
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
