import { notFound } from "next/navigation";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase";
import type { Metadata } from "next";

interface MediaKit {
  id: string;
  user_id: string;
  slug: string;
  bio: string | null;
  pricing: Record<string, number> | null;
  past_brands: string[] | null;
  is_form_enabled: boolean;
  view_count: number;
}

interface SocialChannel {
  platform: string;
  channel_name: string;
  subscriber_count: number;
  total_view_count: number;
  profile_image_url: string;
}

interface Profile {
  full_name: string | null;
  email: string | null;
}

async function getMediaKit(slug: string) {
  const supabase = getSupabase();

  const { data: kit } = await supabase
    .from("media_kits")
    .select("*")
    .eq("slug", slug)
    .single();

  if (!kit) return null;

  const [{ data: channels }, { data: profile }] = await Promise.all([
    supabase.from("social_channels").select("*").eq("user_id", kit.user_id),
    supabase.from("profiles").select("full_name, email").eq("id", kit.user_id).single(),
  ]);

  // increment view count (fire and forget)
  supabase.from("media_kits").update({ view_count: (kit.view_count ?? 0) + 1 }).eq("id", kit.id);

  return {
    kit: kit as MediaKit,
    channels: (channels ?? []) as SocialChannel[],
    profile: profile as Profile | null,
  };
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

const PLATFORM_META: Record<string, { label: string; color: string; textColor: string; icon: string }> = {
  youtube:   { label: "YouTube",    color: "bg-red-50",    textColor: "text-red-600",    icon: "▶" },
  instagram: { label: "Instagram",  color: "bg-pink-50",   textColor: "text-pink-600",   icon: "📸" },
  tiktok:    { label: "TikTok",     color: "bg-gray-50",   textColor: "text-gray-800",   icon: "🎵" },
};

export default async function MediaKitPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getMediaKit(slug);

  if (!data) notFound();

  const { kit, channels, profile } = data;
  const creatorName = profile?.full_name ?? slug;
  const initial = creatorName.charAt(0).toUpperCase();
  const PRICING_LABELS: Record<string, string> = {
    short_form: "숏폼 (60초 이하)",
    long_form:  "롱폼 (10분 이상)",
    story:      "스토리 / 릴스",
    mention:    "제품 언급",
    dedicated:  "전체 광고 영상",
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 py-4 px-6">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#6C63FF] flex items-center justify-center">
              <span className="text-white font-bold text-xs">M</span>
            </div>
            <span className="font-bold text-gray-900 text-sm">매니비</span>
          </div>
          <span className="text-xs text-gray-400">미디어 키트</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12 space-y-6">
        {/* Profile card */}
        <div className="bg-white rounded-2xl p-8 shadow-sm text-center">
          <div className="w-20 h-20 rounded-2xl bg-[#6C63FF] flex items-center justify-center mx-auto mb-4 text-3xl font-extrabold text-white">
            {initial}
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900 mb-1">{creatorName}</h1>
          {kit.bio && <p className="text-gray-500 text-sm leading-relaxed max-w-sm mx-auto">{kit.bio}</p>}
        </div>

        {/* Social channels */}
        {channels.length > 0 && (
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h2 className="font-bold text-gray-900 text-lg mb-4">채널 현황</h2>
            <div className="space-y-4">
              {channels.map((ch) => {
                const meta = PLATFORM_META[ch.platform] ?? { label: ch.platform, color: "bg-gray-50", textColor: "text-gray-700", icon: "📡" };
                return (
                  <div key={ch.platform} className={`${meta.color} rounded-xl p-4`}>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-9 h-9 rounded-xl bg-white shadow-sm flex items-center justify-center text-lg">
                        {meta.icon}
                      </div>
                      <div>
                        <p className={`font-bold text-sm ${meta.textColor}`}>{ch.channel_name}</p>
                        <p className="text-xs text-gray-400">{meta.label}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-2xl font-extrabold text-gray-900">{formatK(ch.subscriber_count)}</p>
                        <p className="text-xs text-gray-500">구독자</p>
                      </div>
                      <div>
                        <p className="text-2xl font-extrabold text-gray-900">{formatK(ch.total_view_count)}</p>
                        <p className="text-xs text-gray-500">총 조회수</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Pricing */}
        {kit.pricing && Object.keys(kit.pricing).length > 0 && (
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h2 className="font-bold text-gray-900 text-lg mb-4">광고 단가</h2>
            <div className="space-y-3">
              {Object.entries(kit.pricing).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                  <span className="text-sm text-gray-600">{PRICING_LABELS[key] ?? key}</span>
                  <span className="font-bold text-gray-900 text-sm">
                    {(value as number).toLocaleString("ko-KR")}원~
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Past brands */}
        {kit.past_brands && kit.past_brands.length > 0 && (
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h2 className="font-bold text-gray-900 text-lg mb-4">협업 브랜드</h2>
            <div className="flex flex-wrap gap-2">
              {kit.past_brands.map((brand: string) => (
                <span key={brand} className="bg-gray-100 text-gray-700 text-sm font-medium px-3 py-1.5 rounded-full">
                  {brand}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Inquiry form CTA */}
        {kit.is_form_enabled ? (
          <div className="bg-[#6C63FF] rounded-2xl p-8 text-center text-white">
            <p className="text-xl font-extrabold mb-2">협찬 문의하기</p>
            <p className="text-purple-200 text-sm mb-6">브랜드 담당자라면 아래 버튼으로 협찬을 제안해보세요.</p>
            <a
              href={`/${slug}/inquiry`}
              className="inline-block bg-white text-[#6C63FF] font-bold px-8 py-3 rounded-xl hover:bg-purple-50 transition-colors"
            >
              협찬 제안서 보내기
            </a>
          </div>
        ) : (
          <div className="bg-gray-100 rounded-2xl p-6 text-center">
            <p className="text-gray-500 text-sm">
              협찬 문의는{" "}
              {profile?.email && (
                <a href={`mailto:${profile.email}`} className="text-[#6C63FF] font-semibold">
                  {profile.email}
                </a>
              )}
              {!profile?.email && "크리에이터에게 직접 연락해주세요."}
            </p>
          </div>
        )}

        {/* AE 모드 / CSV 다운로드 */}
        <div className="text-center">
          <a
            href={`/${slug}/export`}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors underline underline-offset-2"
          >
            AE 모드 (핵심 지표 텍스트 복사)
          </a>
        </div>
      </main>

      <footer className="text-center py-8 text-xs text-gray-400">
        <p>
          Powered by{" "}
          <Link href="/" className="text-[#6C63FF] font-semibold hover:underline">
            매니비
          </Link>
        </p>
      </footer>
    </div>
  );
}
