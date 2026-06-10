'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, useTransition, useRef } from 'react';
import { createClient } from '@/lib/supabase-client';
import type { SupabaseClient } from '@supabase/supabase-js';
import { Eye, EyeOff, ExternalLink, CheckCircle, Save, RefreshCw, Lock, MessageSquare, BarChart2, Tag } from 'lucide-react';
import { CREATOR_CATEGORIES } from '@/lib/categories';

// 모바일 MediaKitEditScreen과 동일한 키 — 같은 media_kits.pricing jsonb를 공유한다
const PRICING_KEYS = [
  { key: 'short_form', label: '숏폼 (60초 이하)' },
  { key: 'long_form',  label: '롱폼 (10분 이상)' },
  { key: 'story',      label: '스토리 / 릴스' },
  { key: 'mention',    label: '제품 언급' },
  { key: 'dedicated',  label: '전체 광고 영상' },
] as const;

interface Badge {
  id: string;
  icon: string;
  label: string;
  color: string;
  platform: string;
}

interface Channel {
  platform: string;
  channel_name: string | null;
  profile_image_url: string | null;
  subscriber_count: number | null;
  updated_at: string | null;
}

function formatSub(n: number) {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}만`;
  if (n >= 1000)  return `${(n / 1000).toFixed(1)}K`;
  return n.toLocaleString();
}

export default function MediaKitPage() {
  const sbRef = useRef<SupabaseClient | null>(null);
  const getSb = () => { if (!sbRef.current) sbRef.current = createClient(); return sbRef.current; };

  const [loading, setLoading]     = useState(true);
  const [saving, startSave]       = useTransition();
  const [syncing, startSync]      = useTransition();
  const [saved, setSaved]         = useState(false);

  const [userId, setUserId]       = useState<string | null>(null);
  const [handle, setHandle]       = useState('');
  const [bio, setBio]             = useState('');
  const [enabled, setEnabled]     = useState(false);
  const [pricing, setPricing]     = useState<Record<string, string>>({});
  const [badges, setBadges]           = useState<Badge[]>([]);
  const [channels, setChannels]       = useState<Channel[]>([]);
  const [inboundEnabled, setInboundEnabled] = useState(false);
  const [isPremium, setIsPremium]     = useState(false);
  const [category, setCategory]       = useState('');

  const [viewStats, setViewStats] = useState<{
    total: number; thisMonth: number; today: number;
    daily: { date: string; count: number }[];
  } | null>(null);

  useEffect(() => {
    (async () => {
      const sb = getSb();
      const { data: { user } } = await sb.auth.getUser();
      if (!user) { window.location.href = '/creator/login?next=/creator/media-kit'; return; }

      const [{ data }, { data: channelRows }, { data: profile }] = await Promise.all([
        sb.from('media_kits')
          .select('slug, bio, is_form_enabled, pricing, badge_data')
          .eq('user_id', user.id)
          .maybeSingle(),
        sb.from('social_channels')
          .select('platform, channel_name, profile_image_url, subscriber_count, updated_at')
          .eq('user_id', user.id),
        sb.from('profiles')
          .select('niche')
          .eq('id', user.id)
          .maybeSingle(),
      ]);

      if (data) {
        setUserId(user.id);
        setHandle(data.slug ?? '');
        setBio(data.bio ?? '');
        setEnabled(!!data.slug);
        setInboundEnabled(data.is_form_enabled ?? false);
        setIsPremium(data.is_form_enabled ?? false);
        setCategory(profile?.niche ?? '');
        setBadges((data.badge_data as Badge[]) ?? []);
        setChannels((channelRows as Channel[]) ?? []);

        const since30 = new Date();
        since30.setDate(since30.getDate() - 29);
        since30.setHours(0, 0, 0, 0);
        const { data: views } = await sb
          .from('media_kit_views')
          .select('created_at')
          .eq('user_id', user.id)
          .gte('created_at', since30.toISOString());

        if (views) {
          const todayStr = new Date().toISOString().slice(0, 10);
          const monthStr = new Date().toISOString().slice(0, 7);
          const buckets: Record<string, number> = {};
          for (let i = 13; i >= 0; i--) {
            const d = new Date(); d.setDate(d.getDate() - i);
            buckets[d.toISOString().slice(0, 10)] = 0;
          }
          let total = 0, thisMonth = 0, today = 0;
          for (const v of views) {
            const d = v.created_at.slice(0, 10);
            total++;
            if (d.startsWith(monthStr)) thisMonth++;
            if (d === todayStr) today++;
            if (d in buckets) buckets[d]++;
          }
          setViewStats({
            total,
            thisMonth,
            today,
            daily: Object.entries(buckets).map(([date, count]) => ({ date, count })),
          });
        }

        const guide = (data.pricing ?? {}) as Record<string, number>;
        const strGuide: Record<string, string> = {};
        for (const { key } of PRICING_KEYS) {
          strGuide[key] = guide[key] ? String(Math.round(guide[key] / 10000)) : '';
        }
        setPricing(strGuide);
      }
      setLoading(false);
    })();
  }, []);

  function handleSave() {
    if (!userId) return;
    startSave(async () => {
      const guide: Record<string, number> = {};
      for (const [k, v] of Object.entries(pricing)) {
        const n = parseInt(v.replace(/,/g, ''), 10);
        if (!isNaN(n) && n > 0) guide[k] = n * 10000;
      }
      const sb = getSb();
      await Promise.all([
        sb.from('media_kits')
          .update({ bio: bio.trim() || null, is_form_enabled: inboundEnabled, pricing: Object.keys(guide).length > 0 ? guide : null })
          .eq('user_id', userId),
        sb.from('profiles')
          .update({ niche: category || null })
          .eq('id', userId),
      ]);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    });
  }

  function handleSyncBadges() {
    startSync(async () => {
      const res = await fetch('/api/sync/youtube', { method: 'POST' });
      if (res.ok) {
        const json = await res.json();
        setBadges(json.badges ?? []);
      }
    });
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[300px]">
        <div className="w-6 h-6 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">미디어 키트</h1>
          <p className="text-slate-500 text-sm mt-1">광고주에게 보여질 나의 프로필을 관리하세요</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:scale-105 disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg, #6366F1, #EC4899)' }}
        >
          {saved ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saved ? '저장됨' : saving ? '저장 중...' : '저장하기'}
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-slate-800">미디어 키트 공개</h2>
            <p className="text-xs text-slate-400 mt-1">
              {handle ? `manybe.io/${handle}` : '핸들이 설정되지 않았습니다'}
            </p>
          </div>
          <span
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold ${
              enabled
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-slate-100 text-slate-500 border border-slate-200'
            }`}
          >
            {enabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            {enabled ? '공개 중' : '핸들 미설정'}
          </span>
        </div>
        {enabled && handle && (
          <a href={`/${handle}`} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 text-xs text-indigo-600 hover:text-indigo-700 font-medium">
            <ExternalLink className="w-3.5 h-3.5" />
            미디어 키트 미리보기
          </a>
        )}
      </div>

      {viewStats && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-indigo-500" />
            <h2 className="font-semibold text-slate-800">방문자 통계</h2>
            <span className="text-[10px] text-slate-400 ml-auto">최근 30일</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[
              { label: '오늘', value: viewStats.today },
              { label: '이번 달', value: viewStats.thisMonth },
              { label: '전체', value: viewStats.total },
            ].map(s => (
              <div key={s.label} className="bg-[#F7F7FA] rounded-xl py-3 text-center">
                <p className="text-xl font-bold text-slate-900">{s.value.toLocaleString()}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {(() => {
            const max = Math.max(...viewStats.daily.map(d => d.count), 1);
            return (
              <div className="flex items-end gap-[3px] h-16 pt-2">
                {viewStats.daily.map(d => {
                  const isToday = d.date === new Date().toISOString().slice(0, 10);
                  const pct = Math.round((d.count / max) * 100);
                  return (
                    <div key={d.date} className="flex-1 flex flex-col items-center justify-end gap-1 group relative">
                      <div
                        className="w-full rounded-sm transition-all"
                        style={{
                          height: `${Math.max(pct, 4)}%`,
                          background: isToday ? 'linear-gradient(135deg, #6366F1, #EC4899)' : '#E0E7FF',
                        }}
                      />
                      {d.count > 0 && (
                        <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                          {d.count}회
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()}
          <p className="text-[10px] text-slate-400 text-center">최근 14일 · 오늘은 보라색</p>
        </div>
      )}

      {channels.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-3">
          <h2 className="font-semibold text-slate-800">연결된 채널</h2>
          {channels.map(ch => (
            <div key={ch.platform} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
              {ch.profile_image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={ch.profile_image_url} alt="" className="w-10 h-10 rounded-full object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-lg">
                  {ch.platform === 'youtube' ? '▶' : ch.platform === 'instagram' ? '📸' : '🎵'}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">{ch.channel_name ?? ch.platform}</p>
                <p className="text-xs text-slate-400">
                  {ch.subscriber_count ? `${formatSub(ch.subscriber_count)} 구독자` : '–'}
                  {ch.updated_at && ` · ${new Date(ch.updated_at).toLocaleDateString('ko-KR')} 동기화`}
                </p>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-500 flex-shrink-0">
                {ch.platform === 'youtube' ? 'YouTube' : ch.platform === 'instagram' ? 'Instagram' : 'TikTok'}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-slate-800">강점 배지</h2>
            <p className="text-xs text-slate-400 mt-1">채널 데이터 기반으로 자동 계산됩니다</p>
          </div>
          <button
            onClick={handleSyncBadges}
            disabled={syncing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? '계산 중...' : '배지 새로고침'}
          </button>
        </div>

        {badges.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {badges.map(badge => (
              <div key={badge.id}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold"
                style={{ backgroundColor: badge.color + '18', color: badge.color, border: `1px solid ${badge.color}35` }}>
                <span>{badge.icon}</span>
                <span>{badge.label}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-slate-400">
            <p className="text-sm">아직 배지가 없습니다</p>
            <p className="text-xs mt-1">Google로 로그인하거나 배지 새로고침을 눌러보세요</p>
          </div>
        )}

        <div className="text-xs text-slate-400 space-y-1 pt-1 border-t border-slate-50">
          <p>🌱 신진 크리에이터 — 구독자 1K+</p>
          <p>⭐ 마이크로 인플루언서 — 구독자 1만+</p>
          <p>💫 매크로 인플루언서 — 구독자 10만+</p>
          <p>🌟 메가 인플루언서 — 구독자 100만+</p>
          <p>📈 떡상중 — 최근 3개월 구독자 +20%</p>
        </div>
      </div>

      <div className="rounded-2xl border shadow-sm overflow-hidden"
        style={isPremium ? { borderColor: '#e0e7ff', background: '#fff' } : { borderColor: '#e2e8f0', background: '#fff' }}>
        <div className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: isPremium ? 'linear-gradient(135deg, #6366F1, #EC4899)' : '#f1f5f9' }}>
                {isPremium
                  ? <MessageSquare className="w-5 h-5 text-white" />
                  : <Lock className="w-5 h-5 text-slate-400" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold text-slate-800">인바운드 문의 활성화</h2>
                  {!isPremium && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gradient-to-r from-indigo-500 to-pink-500 text-white">
                      프리미엄
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {isPremium
                    ? '광고주가 미디어 키트에서 직접 협찬 제안을 보낼 수 있습니다'
                    : '광고주의 협찬 제안을 자동으로 받아보세요'}
                </p>
              </div>
            </div>
            {isPremium && (
              <button
                onClick={() => setInboundEnabled(v => !v)}
                className={`flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  inboundEnabled
                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                    : 'bg-slate-100 text-slate-500 border border-slate-200'
                }`}>
                <MessageSquare className="w-4 h-4" />
                {inboundEnabled ? '수신 중' : '비활성'}
              </button>
            )}
          </div>

          {!isPremium && (
            <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-indigo-50 to-pink-50 border border-indigo-100">
              <p className="text-sm font-semibold text-slate-800 mb-1">
                잠든 사이에도 들어오는 협찬 문의를 놓치지 마세요
              </p>
              <p className="text-xs text-slate-500 mb-3 leading-relaxed">
                프리미엄 플랜으로 업그레이드하면 광고주가 내 미디어 키트에서 바로 협찬 제안을 보낼 수 있습니다.
                방문자 통계, PDF 내보내기도 함께 제공됩니다.
              </p>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-indigo-600">월 9,900원</span>
                <button
                  onClick={() => alert('결제 연동 준비 중입니다. 곧 오픈됩니다!')}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white transition-all hover:scale-105"
                  style={{ background: 'linear-gradient(135deg, #6366F1, #EC4899)' }}>
                  프리미엄 시작하기 →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Tag className="w-4 h-4 text-slate-400" />
          <h2 className="font-semibold text-slate-800">채널 카테고리</h2>
        </div>
        <p className="text-xs text-slate-400">카테고리를 설정하면 단가 예측 정확도가 올라갑니다</p>
        <div className="flex flex-wrap gap-2">
          {CREATOR_CATEGORIES.map(c => (
            <button key={c.key} onClick={() => setCategory(prev => prev === c.key ? '' : c.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                category === c.key
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}>
              {c.emoji} {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-3">
        <h2 className="font-semibold text-slate-800">자기소개</h2>
        <textarea
          value={bio}
          onChange={e => setBio(e.target.value)}
          rows={4}
          maxLength={200}
          placeholder="나를 소개하는 한 문장을 써보세요. 광고주가 가장 먼저 보는 내용입니다."
          className="w-full text-sm border border-slate-200 rounded-xl p-3 resize-none outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all text-slate-800 placeholder:text-slate-300"
        />
        <p className="text-xs text-slate-400 text-right">{bio.length} / 200</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
        <div>
          <h2 className="font-semibold text-slate-800">협찬 단가 가이드</h2>
          <p className="text-xs text-slate-400 mt-1">광고주에게 예상 단가 범위를 제공합니다 (만원 단위)</p>
        </div>
        <div className="space-y-3">
          {PRICING_KEYS.map(({ key, label }) => (
            <div key={key} className="flex items-center gap-3">
              <label className="text-sm text-slate-600 w-36 flex-shrink-0">{label}</label>
              <div className="flex items-center gap-2 flex-1">
                <input
                  type="number"
                  value={pricing[key] ?? ''}
                  onChange={e => setPricing(prev => ({ ...prev, [key]: e.target.value }))}
                  placeholder="예: 300"
                  className="flex-1 text-sm border border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all"
                />
                <span className="text-sm text-slate-400 flex-shrink-0">만원~</span>
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-400">입력하지 않은 항목은 미디어 키트에 표시되지 않습니다</p>
      </div>

      <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 flex gap-3">
        <CheckCircle className="w-5 h-5 text-indigo-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-indigo-800">Manybe Verified 인장</p>
          <p className="text-xs text-indigo-700 mt-1 leading-relaxed">
            채널을 공식 API로 연동하면 실시간 검증된 데이터에 Verified 인장이 부여됩니다.
            광고주 신뢰도를 크게 높일 수 있습니다.
          </p>
        </div>
      </div>
    </div>
  );
}
