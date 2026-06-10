'use client';

import { useState } from 'react';
import { Zap } from 'lucide-react';
import { CREATOR_CATEGORIES } from '@/lib/categories';

function fmtWon(n: number) {
  if (n >= 100000000) return `${(n / 100000000).toFixed(1)}억`;
  if (n >= 10000) return `${Math.round(n / 10000).toLocaleString()}만원`;
  return `${n.toLocaleString()}원`;
}

function fmtViews(n: number) {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}만`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toLocaleString();
}

function calcPricing(avgViews: number, er: number | null, cpv: number) {
  const erMult = !er ? 1.0 : er < 1 ? 0.7 : er < 2 ? 0.85 : er < 3 ? 1.0 : er < 5 ? 1.2 : 1.5;
  const round = (n: number) => Math.max(300000, Math.round(n / 100000) * 100000);
  const branded = round(avgViews * cpv * erMult);
  const ppl = round(branded * 0.55);
  return {
    branded: { min: branded, max: round(branded * 1.5) },
    ppl:     { min: ppl,     max: round(ppl * 1.5) },
    erMult,
  };
}

interface Props {
  avgViews: number;
  er: number | null;
  defaultCategory?: string;
}

export default function PricingCard({ avgViews, er, defaultCategory }: Props) {
  const init = CREATOR_CATEGORIES.find(c => c.key === defaultCategory) ?? CREATOR_CATEGORIES[0];
  const [cat, setCat] = useState(init);
  const pricing = calcPricing(avgViews, er, cat.cpv);

  return (
    <div className="rounded-2xl overflow-hidden shadow-sm"
      style={{ background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 50%, #EC4899 100%)' }}>
      <div className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="w-4 h-4 text-white/80" />
          <p className="text-white font-bold text-sm">적정 협찬 단가 예측</p>
          <span className="text-white/50 text-[10px] ml-auto">카테고리 선택 후 확인하세요</span>
        </div>

        <div className="flex gap-1.5 overflow-x-auto pb-2 mb-4 -mx-1 px-1"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {CREATOR_CATEGORIES.map(c => (
            <button key={c.key} onClick={() => setCat(c)}
              className={`flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] font-semibold transition-all ${
                cat.key === c.key
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}>
              {c.emoji} {c.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          {([
            { label: '브랜디드 영상', ...pricing.branded },
            { label: 'PPL / 간접광고', ...pricing.ppl },
          ] as const).map(p => (
            <div key={p.label} className="bg-white/15 rounded-xl p-3.5">
              <p className="text-white/70 text-[11px] mb-1">{p.label}</p>
              <p className="text-white font-bold text-lg leading-tight">{fmtWon(p.min)}</p>
              <p className="text-white/60 text-[11px] mt-0.5">~ {fmtWon(p.max)}</p>
            </div>
          ))}
        </div>

        <div className="mt-3 px-3 py-2 rounded-lg bg-white/10">
          <p className="text-white/60 text-[10px] leading-relaxed">
            📐 평균조회수 {fmtViews(avgViews)} × CPV {cat.cpv}원 ({cat.label} 카테고리 기준)
            {er ? ` × ER 배율 ×${pricing.erMult}` : ' · ER 미집계 시 기준값 적용'}
          </p>
          <p className="text-white/40 text-[9px] mt-1">
            * 카테고리별 CPV: 금융 205원 / 테크 165원 / 교육 140원 / 뷰티 125원 / 여행 105원 / 라이프 85원
          </p>
        </div>
      </div>
    </div>
  );
}
