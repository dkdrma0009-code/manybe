import { createClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import { Calendar, Plus, Circle, CheckCircle2, Clock, XCircle } from 'lucide-react';

export const metadata = { title: '콘텐츠 캘린더' };

const STATUS_META: Record<string, { label: string; icon: typeof Clock; color: string }> = {
  planned:   { label: '예정',   icon: Clock,        color: '#6366F1' },
  producing: { label: '제작 중', icon: Circle,       color: '#F59E0B' },
  uploaded:  { label: '업로드됨', icon: CheckCircle2, color: '#10B981' },
  cancelled: { label: '취소',   icon: XCircle,      color: '#EF4444' },
};

const PLATFORM_LABEL: Record<string, string> = {
  youtube: 'YouTube', instagram: 'Instagram', tiktok: 'TikTok',
};

function groupByMonth(schedules: any[]) {
  const groups: Record<string, any[]> = {};
  for (const s of schedules) {
    const month = s.scheduled_at.substring(0, 7);
    if (!groups[month]) groups[month] = [];
    groups[month].push(s);
  }
  return groups;
}

export default async function CalendarPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/creator/login?next=/creator/calendar');

  const { data: creator } = await supabase
    .from('creator_profiles')
    .select('id')
    .eq('user_id', user.id)
    .single();

  const now = new Date();
  const from = now.toISOString().slice(0, 7) + '-01';
  const to = new Date(now.getFullYear(), now.getMonth() + 4, 1).toISOString().slice(0, 10);

  const { data: upcoming } = await supabase
    .from('content_schedules')
    .select('*, deal:deals(title)')
    .eq('creator_id', creator?.id ?? '')
    .gte('scheduled_at', from)
    .lt('scheduled_at', to)
    .order('scheduled_at', { ascending: true });

  const { data: past } = await supabase
    .from('content_schedules')
    .select('*, deal:deals(title)')
    .eq('creator_id', creator?.id ?? '')
    .eq('status', 'uploaded')
    .lt('scheduled_at', from)
    .order('scheduled_at', { ascending: false })
    .limit(5);

  const groups = groupByMonth(upcoming ?? []);
  const months = Object.keys(groups).sort();

  const upcomingCount = (upcoming ?? []).filter(s => s.status !== 'cancelled').length;
  const thisMonthStr = now.toISOString().slice(0, 7);
  const thisMonthCount = groups[thisMonthStr]?.filter(s => s.status !== 'cancelled').length ?? 0;

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">콘텐츠 캘린더</h1>
          <p className="text-slate-500 text-sm mt-1">
            이번 달 {thisMonthCount}건 · 향후 3개월 {upcomingCount}건 예정
          </p>
        </div>
        <button
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:scale-105"
          style={{ background: 'linear-gradient(135deg, #6366F1, #EC4899)' }}
        >
          <Plus className="w-4 h-4" />
          일정 추가
        </button>
      </div>

      {months.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-16 text-center">
          <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="font-semibold text-slate-700 mb-1">예정된 콘텐츠가 없습니다</h3>
          <p className="text-sm text-slate-400 mb-6">협찬 일정을 등록하고 업로드 알림을 받으세요</p>
          <button
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{ background: 'linear-gradient(135deg, #6366F1, #EC4899)' }}
          >
            <Plus className="w-4 h-4" />
            일정 추가하기
          </button>
        </div>
      ) : (
        months.map(month => {
          const items = groups[month];
          const [y, m] = month.split('-');
          const isThisMonth = month === thisMonthStr;
          return (
            <div key={month} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className={`px-5 py-3.5 border-b border-slate-100 flex items-center gap-2 ${isThisMonth ? 'bg-indigo-50/50' : ''}`}>
                <Calendar className={`w-4 h-4 ${isThisMonth ? 'text-indigo-600' : 'text-slate-400'}`} />
                <h2 className={`font-semibold text-sm ${isThisMonth ? 'text-indigo-800' : 'text-slate-800'}`}>
                  {y}년 {parseInt(m, 10)}월
                  {isThisMonth && <span className="ml-2 text-xs text-indigo-600">이번 달</span>}
                </h2>
                <span className="ml-auto text-xs text-slate-400">{items.length}건</span>
              </div>
              <div className="divide-y divide-slate-50">
                {items.map(item => {
                  const meta = STATUS_META[item.status] ?? STATUS_META.planned;
                  const Icon = meta.icon;
                  const date = new Date(item.scheduled_at);
                  return (
                    <div key={item.id} className="px-5 py-4 flex items-center gap-4 hover:bg-slate-50 transition-colors cursor-pointer group">
                      <div className="w-12 text-center flex-shrink-0">
                        <p className="text-lg font-bold text-slate-800 leading-none">{date.getDate()}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {['일','월','화','수','목','금','토'][date.getDay()]}요일
                        </p>
                      </div>

                      <div className="w-px h-10 bg-slate-100 flex-shrink-0" />

                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-800 text-sm truncate">{item.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {item.platform && (
                            <span className="text-xs text-slate-400">
                              {PLATFORM_LABEL[item.platform] ?? item.platform}
                            </span>
                          )}
                          {item.deal?.title && (
                            <span className="text-xs text-slate-400">· {item.deal.title}</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <Icon className="w-3.5 h-3.5" style={{ color: meta.color }} />
                        <span className="text-xs font-medium" style={{ color: meta.color }}>
                          {meta.label}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })
      )}

      {(past?.length ?? 0) > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <h2 className="font-semibold text-sm text-slate-800">최근 업로드 완료</h2>
          </div>
          <div className="divide-y divide-slate-50">
            {past!.map(item => (
              <div key={item.id} className="px-5 py-3.5 flex items-center justify-between opacity-70">
                <div>
                  <p className="font-medium text-slate-700 text-sm">{item.title}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {new Date(item.scheduled_at).toLocaleDateString('ko-KR')}
                    {item.platform && ` · ${PLATFORM_LABEL[item.platform] ?? item.platform}`}
                  </p>
                </div>
                {item.content_url && (
                  <a href={item.content_url} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-indigo-600 hover:underline">
                    보기
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
