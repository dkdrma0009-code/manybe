import { createClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import { DollarSign, TrendingUp, Receipt } from 'lucide-react';

export const metadata = { title: '수익 & 세금' };

const TYPE_LABEL: Record<string, string> = {
  sponsorship: '협찬', adsense: 'AdSense', affiliate: '제휴', etc: '기타',
};

function fmtKRW(n: number) {
  if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(1)}억원`;
  if (n >= 10_000) return `${Math.round(n / 10_000).toLocaleString()}만원`;
  return `${n.toLocaleString()}원`;
}

export default async function RevenuePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/creator/login?next=/creator/revenue');

  const { data: creator } = await supabase
    .from('creator_profiles')
    .select('id')
    .eq('user_id', user.id)
    .single();

  const currentYear = new Date().getFullYear().toString();
  const currentMonth = new Date().toISOString().slice(0, 7);

  const { data: records } = await supabase
    .from('revenue_records')
    .select('*')
    .eq('creator_id', creator?.id ?? '')
    .gte('year_month', `${currentYear}-01`)
    .order('year_month', { ascending: false });

  const list = records ?? [];

  const yearTotal = list.reduce((s, r) => s + r.amount, 0);
  const yearTax = list.reduce((s, r) => s + r.tax_withheld, 0);

  const thisMonth = list.filter(r => r.year_month === currentMonth);
  const monthTotal = thisMonth.reduce((s, r) => s + r.amount, 0);

  const byMonth: Record<string, { amount: number; tax: number; count: number }> = {};
  for (const r of list) {
    if (!byMonth[r.year_month]) byMonth[r.year_month] = { amount: 0, tax: 0, count: 0 };
    byMonth[r.year_month].amount += r.amount;
    byMonth[r.year_month].tax += r.tax_withheld;
    byMonth[r.year_month].count++;
  }
  const months = Object.keys(byMonth).sort().reverse();

  const kpis = [
    {
      label: `${currentYear}년 총수익`,
      value: fmtKRW(yearTotal),
      icon: DollarSign, color: '#EC4899',
    },
    {
      label: '이번 달 수익',
      value: fmtKRW(monthTotal),
      icon: TrendingUp, color: '#6366F1',
    },
    {
      label: '원천징수 예상 (3.3%)',
      value: fmtKRW(yearTax),
      sub: '연간 납부 예상액',
      icon: Receipt, color: '#F59E0B',
    },
    {
      label: '실수령 예상액',
      value: fmtKRW(yearTotal - yearTax),
      sub: '세금 차감 후',
      icon: DollarSign, color: '#10B981',
    },
  ];

  return (
    <div className="p-6 max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">수익 & 세금</h1>
        <p className="text-slate-500 text-sm mt-1">{currentYear}년 수익 현황</p>
      </div>

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

      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex gap-3">
        <Receipt className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-amber-800">원천징수 3.3% 안내</p>
          <p className="text-xs text-amber-700 mt-1 leading-relaxed">
            사업소득(협찬비)은 지급 시 소득세 3% + 지방소득세 0.3% = 3.3%가 원천징수됩니다.
            종합소득세 신고(5월) 시 환급 또는 추납될 수 있습니다.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">월별 수익 내역</h2>
        </div>
        {months.length === 0 ? (
          <div className="px-5 py-12 text-center text-slate-400 text-sm">
            {currentYear}년 수익 데이터가 없습니다
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                {['월', '건수', '총수익', '원천징수', '실수령'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {months.map(m => {
                const row = byMonth[m];
                return (
                  <tr key={m} className={`hover:bg-slate-50 transition-colors ${m === currentMonth ? 'bg-indigo-50/40' : ''}`}>
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {m.replace('-', '년 ')}월
                      {m === currentMonth && (
                        <span className="ml-2 text-xs text-indigo-600 font-semibold">이번 달</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600 tabular-nums">{row.count}건</td>
                    <td className="px-4 py-3 font-semibold text-slate-800 tabular-nums">{fmtKRW(row.amount)}</td>
                    <td className="px-4 py-3 text-amber-600 tabular-nums">-{fmtKRW(row.tax)}</td>
                    <td className="px-4 py-3 text-emerald-600 font-semibold tabular-nums">{fmtKRW(row.amount - row.tax)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">최근 수익 내역</h2>
        </div>
        {list.length === 0 ? (
          <div className="px-5 py-12 text-center text-slate-400 text-sm">내역이 없습니다</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                {['월', '유형', '금액', '원천징수', '메모'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {list.slice(0, 10).map(r => (
                <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-slate-600">{r.year_month.replace('-', '년 ')}월</td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                      {TYPE_LABEL[r.type ?? ''] ?? '기타'}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-800 tabular-nums">{fmtKRW(r.amount)}</td>
                  <td className="px-4 py-3 text-amber-600 tabular-nums">-{fmtKRW(r.tax_withheld)}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs truncate max-w-[140px]">{r.notes ?? '–'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
