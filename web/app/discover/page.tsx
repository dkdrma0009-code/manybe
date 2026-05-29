import Link from "next/link";
import { getSupabase } from "@/lib/supabase";
import { getAdvertiserSession } from "@/lib/supabase-server";
import { logoutAdvertiser } from "../advertiser/signup/actions";
import Logo from "@/components/Logo";
import AdvertiserNav from "@/components/AdvertiserNav";
import CreatorList from "./CreatorList";

const CATEGORIES: { key: string; label: string }[] = [
  { key: "전체",         label: "전체" },
  { key: "뷰티/패션",    label: "뷰티/패션" },
  { key: "게임",         label: "게임" },
  { key: "음식/요리",    label: "음식/요리" },
  { key: "라이프스타일", label: "라이프" },
  { key: "테크/IT",      label: "테크/IT" },
  { key: "여행",         label: "여행" },
  { key: "스포츠",       label: "스포츠" },
  { key: "교육",         label: "교육" },
  { key: "엔터테인먼트", label: "엔터" },
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

const PLATFORM_ICON: Record<string, string> = { youtube: "YT", instagram: "IG", tiktok: "TK" };
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
    <div className="min-h-screen bg-white">
      {/* Header */}
      {session ? (
        <AdvertiserNav userName={session.profile.full_name ?? ""} current="discover" />
      ) : (
        <header className="bg-white sticky top-0 z-10" style={{ borderBottom: "1px solid var(--border-faint)" }}>
          <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between gap-6">
            <Link href="/discover"><Logo size={18} period /></Link>
            <Link href="/advertiser/login" className="text-sm font-semibold px-4 py-2 rounded-lg text-white" style={{ background: "var(--brand)" }}>
              로그인
            </Link>
          </div>
        </header>
      )}

      <div className="max-w-7xl mx-auto px-6 flex gap-8 py-8">

        {/* 사이드바 필터 */}
        <aside className="hidden lg:block w-52 shrink-0">
          <div className="sticky top-22 space-y-6">
            {/* 카테고리 */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--ink-4)" }}>카테고리</p>
              <div className="space-y-0.5">
                {CATEGORIES.map((cat) => {
                  const isActive = activeCategory === cat.key;
                  return (
                    <Link
                      key={cat.key}
                      href={filterUrl({ category: cat.key })}
                      className="flex items-center justify-between w-full px-3 py-2 rounded-lg text-sm transition-colors"
                      style={isActive
                        ? { background: "var(--brand-soft)", color: "var(--brand)", fontWeight: 600 }
                        : { color: "var(--ink-3)" }}
                    >
                      {cat.label}
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* 플랫폼 */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--ink-4)" }}>플랫폼</p>
              <div className="space-y-0.5">
                {PLATFORMS.map((pl) => {
                  const isActive = activePlatform === pl;
                  return (
                    <Link
                      key={pl}
                      href={filterUrl({ platform: pl })}
                      className="flex items-center w-full px-3 py-2 rounded-lg text-sm transition-colors"
                      style={isActive
                        ? { background: "var(--brand-soft)", color: "var(--brand)", fontWeight: 600 }
                        : { color: "var(--ink-3)" }}
                    >
                      {pl === "전체" ? "전체" : PLATFORM_LABEL[pl]}
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* 규모 */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--ink-4)" }}>팔로워 규모</p>
              <div className="space-y-0.5">
                {SCALE_OPTIONS.map((s) => {
                  const isActive = activeScale === s.label;
                  return (
                    <Link
                      key={s.label}
                      href={filterUrl({ scale: s.label })}
                      className="flex items-center w-full px-3 py-2 rounded-lg text-sm transition-colors"
                      style={isActive
                        ? { background: "var(--brand-soft)", color: "var(--brand)", fontWeight: 600 }
                        : { color: "var(--ink-3)" }}
                    >
                      {s.label === "전체" ? "전체" : s.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </aside>

        {/* 메인 콘텐츠 */}
        <main className="flex-1 min-w-0">
          {/* 모바일 필터 */}
          <div className="lg:hidden flex gap-2 mb-4 overflow-x-auto pb-1 -mx-6 px-6">
            {CATEGORIES.map((cat) => (
              <Link key={cat.key} href={filterUrl({ category: cat.key })}
                className="px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0"
                style={activeCategory === cat.key
                  ? { background: "var(--ink)", color: "#fff" }
                  : { background: "var(--surface-2)", color: "var(--ink-3)" }}>
                {cat.label}
              </Link>
            ))}
          </div>

          {/* 헤더 row */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold" style={{ color: "var(--ink)" }}>
              크리에이터 <span style={{ color: "var(--ink-3)", fontWeight: 400 }}>{creators.length}명</span>
            </p>
          </div>

          {/* 리스트 */}
          {creators.length === 0 ? (
            <div className="py-24 text-center">
              <p className="font-semibold mb-1" style={{ color: "var(--ink-2)" }}>조건에 맞는 크리에이터가 없습니다</p>
              <p className="text-sm" style={{ color: "var(--ink-4)" }}>필터를 바꾸거나 검색어를 다르게 입력해보세요</p>
            </div>
          ) : (
            <CreatorList creators={creators} isLoggedIn={!!session} />
          )}

          {/* 비로그인 배너 */}
          {!session && (
            <div className="mt-10 p-8 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4"
              style={{ background: "var(--surface-2)", border: "1px solid var(--border)" }}>
              <div>
                <p className="font-semibold mb-1" style={{ color: "var(--ink)" }}>크리에이터에게 제안하려면 로그인하세요</p>
                <p className="text-sm" style={{ color: "var(--ink-3)" }}>사업자 인증 광고주만 제안서를 보낼 수 있습니다.</p>
              </div>
              <div className="flex gap-3 shrink-0">
                <Link href="/advertiser/login" className="text-sm font-semibold px-5 py-2.5 rounded-lg"
                  style={{ border: "1px solid var(--border)", color: "var(--ink-2)" }}>로그인</Link>
                <Link href="/advertiser/signup" className="text-sm font-semibold px-5 py-2.5 rounded-lg text-white"
                  style={{ background: "var(--brand)" }}>광고주 가입</Link>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
