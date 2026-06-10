import { createClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import {
  TrendingUp, DollarSign, Star, Eye,
  Calendar, ExternalLink, Users, ShieldCheck,
} from 'lucide-react';
import PricingCard from './PricingCard';

export const metadata = { title: '크리에이터 대시보드' };

const DEAL_STAGE_LABEL: Record<string, { label: string; color: string }> = {
  inquiry:     { label: '문의',       color: '#6366F1' },
  reviewing:   { label: '검토 중',    color: '#F59E0B' },
  in_progress: { label: '진행 중',    color: '#0EA5E9' },
  uploaded:    { label: '업로드 완료', color: '#10B981' },
  settled:     { label: '정산 완료',  color: '#6B7280' },
};

function fmt(n: number) {
  if (n >= 100000000) return `${(n / 100000000).toFixed(1)}억`;
  if (n >= 10000) return `${(n / 10000).toFixed(1)}만`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toLocaleString();
}

function fmtWon(n: number) {
  if (n >= 100000000) return `${(n / 100000000).toFixed(1)}억원`;
  if (n >= 10000) return `${Math.round(n / 10000).toLocaleString()}만원`;
  return `${n.toLocaleString()}원`;
}

function Sparkline({
  data, color = '#6366F1', gradId, height = 56,
}: {
  data: number[]; color?: string; gradId: string; height?: number;
}) {
  if (data.length < 2) {
    return <div className="w-full bg-slate-50 rounded-xl" style={{ height }} />;
  }
  const W = 400;
  const H = height;
  const pad = 6;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * W;
    const y = H - pad - ((v - min) / range) * (H - pad * 2);
    return [x, y] as [number, number];
  });

  const polyline = pts.map(([x, y]) => `${x},${y}`).join(' ');
  const area =
    `M${pts[0][0]},${H} ` +
    pts.map(([x, y]) => `L${x},${y}`).join(' ') +
    ` L${pts[pts.length - 1][0]},${H} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full" style={{ height }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradId})`} />
      <polyline
        points={polyline}
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle
        cx={pts[pts.length - 1][0]}
        cy={pts[pts.length - 1][1]}
        r="4"
        fill={color}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export default async function CreatorDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/creator/login?next=/creator/dashboard');

  const currentMonth = new Date().toISOString().slice(0, 7);
  const nextMonth = new Date();
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  const nextMonthStart = nextMonth.toISOString().slice(0, 7) + '-01';

  const [
    { data: channelRows }, { data: kit }, { data: profile },
    { data: revenue }, { data: activeDeals }, { count: kitViews },
  ] = await Promise.all([
    supabase.from('social_channels').select('*').eq('user_id', user.id),
    supabase.from('media_kits').select('slug').eq('user_id', user.id).maybeSingle(),
    supabase.from('profiles').select('niche').eq('id', user.id).maybeSingle(),
    supabase.from('revenues').select('amount')
      .eq('user_id', user.id)
      .gte('date', `${currentMonth}-01`).lt('date', nextMonthStart),
    supabase.from('deals').select('id, title, brand, status, amount, updated_at')
      .eq('user_id', user.id).neq('status', 'settled')
      .order('updated_at', { ascending: false }).limit(5),
    supabase.from('media_kit_views').select('*', { count: 'exact', head: true })
      .eq('user_id', user.id).gte('created_at', `${currentMonth}-01`),
  ]);

  const totalRevenue = revenue?.reduce((s, r) => s + r.amount, 0) ?? 0;
  const totalTax     = Math.round(totalRevenue * 0.033); // 원천징수 3.3% 추정

  type Channel = {
    platform: string; channel_name: string | null; profile_image_url: string | null;
    subscriber_count: number | null; avg_views: number | null; engagement_rate: number | null;
    updated_at: string | null;
    subscriber_history: Array<{ date: string; count: number }> | null;
    views_history: Array<{ date: string; views: number }> | null;
  };
  const channels = (channelRows ?? []) as Channel[];
  const yt = channels.find(c => c.platform === 'youtube') ?? null;

  const subHistory = (yt?.subscriber_history ?? []).slice(-60);
  const subData    = subHistory.map(h => h.count);

  const viewHistory = (yt?.views_history ?? []).slice(-30);
  const viewData    = viewHistory.map(h => h.views);

  const hasPricing = (yt?.avg_views ?? 0) > 0;

  const kpis = [
    {
      label: '이번 달 수익', icon: DollarSign, color: '#EC4899',
      value: totalRevenue > 0 ? fmtWon(totalRevenue) : '–',
      sub: totalTax > 0 ? `세금 ${fmtWon(totalTax)} 예상` : undefined,
    },
    {
      label: '진행 중인 협찬', icon: Star, color: '#6366F1',
      value: `${activeDeals?.length ?? 0}건`,
    },
    {
      label: '미디어 키트 조회', icon: Eye, color: '#0EA5E9',
      value: `${kitViews ?? 0}회`, sub: '이번 달',
    },
    {
      label: '미디어 키트 상태', icon: ExternalLink, color: '#10B981',
      value: kit?.slug ? '공개 중' : '미설정',
      sub: kit?.slug ? `manybe.io/${kit.slug}` : undefined,
    },
  ];

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">안녕하세요 👋</h1>
        <p className="text-slate-500 text-sm mt-1">
          {currentMonth.replace('-', '년 ')}월 현황을 확인하세요
        </p>
      </div>

      {yt ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 pt-5 pb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {yt.profile_image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={yt.profile_image_url} alt="" className="w-10 h-10 rounded-full object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                  <svg className="w-5 h-5 text-red-500" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                  </svg>
                </div>
              )}
              <div>
                <p className="font-bold text-slate-900 text-sm">{yt.channel_name ?? 'YouTube 채널'}</p>
                {yt.updated_at && (
                  <p className="text-[11px] text-slate-400">
                    {new Date(yt.updated_at).toLocaleDateString('ko-KR')} 동기화
                  </p>
                )}
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-600 text-xs font-bold border border-indigo-100">
              <ShieldCheck className="w-3.5 h-3.5" /> Manybe Verified
            </span>
          </div>

          <div className="grid grid-cols-3 divide-x divide-slate-100 border-y border-slate-100">
            {[
              { label: '구독자',   value: yt.subscriber_count ? fmt(yt.subscriber_count) : '–', icon: Users },
              { label: '평균 조회수', value: yt.avg_views ? fmt(yt.avg_views) : '–', icon: Eye },
              { label: '참여율(ER)', value: yt.engagement_rate ? `${Number(yt.engagement_rate).toFixed(1)}%` : '–', icon: TrendingUp },
            ].map(s => (
              <div key={s.label} className="py-4 text-center">
                <p className="text-xl font-bold text-slate-900">{s.value}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
            <div className="px-5 py-4">
              <p className="text-xs font-semibold text-slate-500 mb-2">구독자 추이</p>
              {subData.length >= 2 ? (
                <>
                  <Sparkline data={subData} color="#6366F1" gradId="grad-sub" height={56} />
                  <div className="flex justify-between mt-1.5 text-[10px] text-slate-400">
                    <span>{subHistory[0]?.date.slice(5)}</span>
                    <span>{subHistory[subHistory.length - 1]?.date.slice(5)}</span>
                  </div>
                </>
              ) : (
                <div className="h-14 flex items-center justify-center text-xs text-slate-400">
                  로그인을 더 자주 해야 데이터가 쌓여요
                </div>
              )}
            </div>

            <div className="px-5 py-4">
              <p className="text-xs font-semibold text-slate-500 mb-2">최근 30일 일별 조회수</p>
              {viewData.length >= 2 ? (
                <>
                  <Sparkline data={viewData} color="#EC4899" gradId="grad-views" height={56} />
                  <div className="flex justify-between mt-1.5 text-[10px] text-slate-400">
                    <span>{viewHistory[0]?.date.slice(5)}</span>
                    <span>{viewHistory[viewHistory.length - 1]?.date.slice(5)}</span>
                  </div>
                </>
              ) : (
                <div className="h-14 flex items-center justify-center text-xs text-slate-400">
                  재로그인하면 조회수 데이터가 연동돼요
                </div>
              )}
            </div>
          </div>

          <div className="mx-5 mb-5 mt-1 px-3 py-2 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
            <p className="text-[11px] text-indigo-700">
              이 데이터는 공식 YouTube API로 100% 검증되었습니다. 광고주에게 신뢰도 높은 포트폴리오를 제공합니다.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
              <svg className="w-5 h-5 text-red-500" viewBox="0 0 24 24" fill="currentColor">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">YouTube 채널 미연결</p>
              <p className="text-xs text-slate-500 mt-0.5">Google로 로그인하면 채널이 자동 연동됩니다</p>
            </div>
          </div>
          <a href="/creator/login"
            className="text-xs font-semibold text-indigo-600 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 transition-colors">
            연결하기
          </a>
        </div>
      )}

      {hasPricing && (
        <PricingCard
          avgViews={yt!.avg_views!}
          er={yt?.engagement_rate ? Number(yt.engagement_rate) : null}
          defaultCategory={profile?.niche ?? undefined}
        />
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(kpi => (
          <div key={kpi.label} className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-medium text-slate-500">{kpi.label}</p>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: kpi.color + '15' }}>
                <kpi.icon className="w-4 h-4" style={{ color: kpi.color }} />
              </div>
            </div>
            <p className="text-xl font-bold text-slate-900">{kpi.value}</p>
            {kpi.sub && <p className="text-xs text-slate-400 mt-1">{kpi.sub}</p>}
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">협찬 파이프라인</h2>
          <a href="/creator/deals" className="text-xs text-indigo-600 font-medium flex items-center gap-1">
            전체 보기 <TrendingUp className="w-3 h-3" />
          </a>
        </div>
        {!activeDeals?.length ? (
          <div className="px-5 py-10 text-center text-slate-400 text-sm">진행 중인 협찬이 없습니다</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                {['협찬 제목', '단계', '금액', '업데이트'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {activeDeals.map(deal => {
                const stage = DEAL_STAGE_LABEL[deal.status] ?? { label: deal.status, color: '#6B7280' };
                return (
                  <tr key={deal.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-800">{deal.title || deal.brand}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold"
                        style={{ backgroundColor: stage.color + '15', color: stage.color }}>
                        {stage.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 tabular-nums">
                      {deal.amount ? fmtWon(deal.amount) : '–'}
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs">
                      {new Date(deal.updated_at).toLocaleDateString('ko-KR')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { href: '/creator/deals',    icon: Star,        label: '협찬 관리',   color: '#6366F1' },
          { href: '/creator/revenue',  icon: DollarSign,  label: '수익 & 세금', color: '#EC4899' },
          { href: '/creator/calendar', icon: Calendar,    label: '콘텐츠 캘린더', color: '#F59E0B' },
          { href: '/creator/media-kit',icon: Eye,         label: '미디어 키트', color: '#0EA5E9' },
        ].map(item => (
          <a key={item.href} href={item.href}
            className="flex flex-col items-center gap-2 py-4 rounded-2xl bg-white border border-slate-100 hover:border-slate-200 shadow-sm transition-all hover:-translate-y-0.5">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: item.color + '15' }}>
              <item.icon className="w-5 h-5" style={{ color: item.color }} />
            </div>
            <span className="text-xs font-medium text-slate-700">{item.label}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
