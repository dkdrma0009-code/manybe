import { createClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import { Star, Plus, ChevronRight, Inbox } from 'lucide-react';
import DealActions from './DealActions';

export const metadata = { title: '협찬 관리' };

const STAGES = [
  { key: 'proposed',    label: '제안 수신',  color: '#6366F1', bg: '#6366F115' },
  { key: 'negotiating', label: '협상 중',    color: '#F59E0B', bg: '#F59E0B15' },
  { key: 'producing',   label: '제작 중',    color: '#0EA5E9', bg: '#0EA5E915' },
  { key: 'completed',   label: '납품 완료',  color: '#10B981', bg: '#10B98115' },
  { key: 'settled',     label: '정산 완료',  color: '#6B7280', bg: '#6B728015' },
  { key: 'cancelled',   label: '취소',       color: '#EF4444', bg: '#EF444415' },
] as const;

const PLATFORM_LABEL: Record<string, string> = {
  youtube: 'YouTube', instagram: 'Instagram', tiktok: 'TikTok', multiple: '복합',
};

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

export default async function DealsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/creator/login?next=/creator/deals');

  const { data: creator } = await supabase
    .from('creator_profiles').select('id').eq('user_id', user.id).single();

  const { data: deals } = await supabase
    .from('deals').select('*').eq('creator_id', creator?.id ?? '')
    .order('created_at', { ascending: false });

  const inbound = (deals ?? []).filter(
    d => d.status === 'proposed' && d.contact_info != null
  );
  const pipeline = (deals ?? []).filter(
    d => !(d.status === 'proposed' && d.contact_info != null)
  );

  const grouped = STAGES.reduce<Record<string, typeof pipeline>>((acc, s) => {
    acc[s.key] = pipeline.filter(d => d.status === s.key);
    return acc;
  }, {});

  const activeCount = (deals ?? []).filter(d => !['settled', 'cancelled'].includes(d.status)).length;
  const totalEarned = (deals ?? []).filter(d => d.status === 'settled')
    .reduce((s, d) => s + (d.amount ?? 0), 0);

  return (
    <div className="p-6 max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">협찬 관리</h1>
          <p className="text-slate-500 text-sm mt-1">
            진행 중 {activeCount}건 · 누적 정산 {Math.round(totalEarned / 10000).toLocaleString()}만원
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white hover:scale-105 transition-all"
          style={{ background: 'linear-gradient(135deg, #6366F1, #EC4899)' }}>
          <Plus className="w-4 h-4" /> 새 딜 추가
        </button>
      </div>

      {inbound.length > 0 && (
        <div className="rounded-2xl overflow-hidden border-2 border-indigo-200 shadow-sm bg-white">
          <div className="px-5 py-3.5 bg-gradient-to-r from-indigo-50 to-pink-50 border-b border-indigo-100 flex items-center gap-2">
            <Inbox className="w-4 h-4 text-indigo-600" />
            <h2 className="font-bold text-indigo-900 text-sm">새 협찬 제안</h2>
            <span className="ml-1 flex items-center justify-center w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-bold">
              {inbound.length}
            </span>
          </div>

          <div className="divide-y divide-slate-50">
            {inbound.map(deal => {
              const info = (deal.contact_info ?? {}) as Record<string, any>;
              const contentTypes = (info.content_types ?? []) as string[];
              return (
                <div key={deal.id} className="px-5 py-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-base font-bold text-white flex-shrink-0"
                      style={{ background: 'linear-gradient(135deg, #6366F1, #EC4899)' }}>
                      {(info.company?.[0] ?? '?').toUpperCase()}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-slate-900 text-sm">{deal.title}</p>
                        {deal.platform && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium">
                            {PLATFORM_LABEL[deal.platform] ?? deal.platform}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        <span className="font-medium text-slate-700">{info.company}</span>
                        {info.name && ` · ${info.name}`}
                        {` · ${info.email}`}
                      </p>
                      {contentTypes.length > 0 && (
                        <div className="flex gap-1 mt-1.5 flex-wrap">
                          {contentTypes.map((t: string) => (
                            <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 font-medium">
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center gap-3 mt-2">
                        {deal.amount && (
                          <span className="text-sm font-bold text-indigo-700">
                            {Math.round(deal.amount / 10000).toLocaleString()}만원
                          </span>
                        )}
                        {info.timeline && (
                          <span className="text-xs text-slate-400">{info.timeline}</span>
                        )}
                        <span className="text-xs text-slate-400">{relativeTime(deal.created_at)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 ml-13 flex">
                    <DealActions dealId={deal.id} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {STAGES.filter(s => s.key !== 'cancelled').map(stage => {
        const list = grouped[stage.key] ?? [];
        return (
          <div key={stage.key} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: stage.color }} />
              <h2 className="font-semibold text-slate-800 text-sm">{stage.label}</h2>
              <span className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                style={{ backgroundColor: stage.bg, color: stage.color }}>
                {list.length}
              </span>
            </div>

            {list.length === 0 ? (
              <div className="px-5 py-6 text-center text-slate-400 text-xs">이 단계에 딜이 없습니다</div>
            ) : (
              <div className="divide-y divide-slate-50">
                {list.map(deal => (
                  <div key={deal.id}
                    className="px-5 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer group">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: stage.bg }}>
                        <Star className="w-4 h-4" style={{ color: stage.color }} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-slate-800 text-sm truncate">{deal.title}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {deal.platform ? PLATFORM_LABEL[deal.platform] : '–'}
                          {deal.content_deadline && ` · 마감 ${new Date(deal.content_deadline).toLocaleDateString('ko-KR')}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 flex-shrink-0 ml-4">
                      {deal.amount && (
                        <span className="text-sm font-semibold text-slate-700 tabular-nums">
                          {Math.round(deal.amount / 10000).toLocaleString()}만원
                        </span>
                      )}
                      <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {(grouped['cancelled']?.length ?? 0) > 0 && (
        <details className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <summary className="px-5 py-3.5 cursor-pointer select-none flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-700">
            <span className="w-2 h-2 rounded-full bg-red-400" />
            취소된 딜 ({grouped['cancelled']?.length ?? 0}건)
          </summary>
          <div className="divide-y divide-slate-50">
            {(grouped['cancelled'] ?? []).map(deal => (
              <div key={deal.id} className="px-5 py-4 flex items-center justify-between opacity-60">
                <div>
                  <p className="font-medium text-slate-700 text-sm">{deal.title}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{new Date(deal.updated_at).toLocaleDateString('ko-KR')} 취소</p>
                </div>
                {deal.amount && (
                  <span className="text-sm text-slate-500 tabular-nums line-through">
                    {Math.round(deal.amount / 10000).toLocaleString()}만원
                  </span>
                )}
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
