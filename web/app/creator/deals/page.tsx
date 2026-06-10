import { createClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import { Star, Plus, ChevronRight } from 'lucide-react';

export const metadata = { title: '협찬 관리' };

const STAGES = [
  { key: 'inquiry',     label: '문의',        color: '#6366F1', bg: '#6366F115' },
  { key: 'reviewing',   label: '검토 중',     color: '#F59E0B', bg: '#F59E0B15' },
  { key: 'in_progress', label: '진행 중',     color: '#0EA5E9', bg: '#0EA5E915' },
  { key: 'uploaded',    label: '업로드 완료', color: '#10B981', bg: '#10B98115' },
  { key: 'settled',     label: '정산 완료',   color: '#6B7280', bg: '#6B728015' },
] as const;

export default async function DealsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/creator/login?next=/creator/deals');

  const { data: deals } = await supabase
    .from('deals')
    .select('id, title, brand, status, amount, end_date, created_at, updated_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  const list = deals ?? [];

  const grouped = STAGES.reduce<Record<string, typeof list>>((acc, s) => {
    acc[s.key] = list.filter(d => d.status === s.key);
    return acc;
  }, {});

  const activeCount = list.filter(d => d.status !== 'settled').length;
  const totalEarned = list.filter(d => d.status === 'settled')
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

      {STAGES.map(stage => {
        const stageList = grouped[stage.key] ?? [];
        return (
          <div key={stage.key} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: stage.color }} />
              <h2 className="font-semibold text-slate-800 text-sm">{stage.label}</h2>
              <span className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                style={{ backgroundColor: stage.bg, color: stage.color }}>
                {stageList.length}
              </span>
            </div>

            {stageList.length === 0 ? (
              <div className="px-5 py-6 text-center text-slate-400 text-xs">이 단계에 딜이 없습니다</div>
            ) : (
              <div className="divide-y divide-slate-50">
                {stageList.map(deal => (
                  <div key={deal.id}
                    className="px-5 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer group">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: stage.bg }}>
                        <Star className="w-4 h-4" style={{ color: stage.color }} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-slate-800 text-sm truncate">{deal.title || deal.brand}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {deal.brand ?? '–'}
                          {deal.end_date && ` · 마감 ${new Date(deal.end_date).toLocaleDateString('ko-KR')}`}
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
    </div>
  );
}
