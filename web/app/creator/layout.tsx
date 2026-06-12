import Link from 'next/link';
import {
  LayoutDashboard, Star, DollarSign,
  Calendar, Eye,
} from 'lucide-react';
import LogoutButton from './LogoutButton';
import InboundBadge from './InboundBadge';

const NAV = [
  { href: '/creator/dashboard',  icon: LayoutDashboard, label: '대시보드' },
  { href: '/creator/deals',      icon: Star,            label: '협찬 관리' },
  { href: '/creator/revenue',    icon: DollarSign,      label: '수익 & 세금' },
  { href: '/creator/calendar',   icon: Calendar,        label: '캘린더' },
  { href: '/creator/media-kit',  icon: Eye,             label: '미디어 키트' },
];

export default function CreatorLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* 사이드바 */}
      <aside className="hidden lg:flex flex-col w-60 bg-white border-r border-slate-100 shadow-sm fixed inset-y-0">
        {/* 로고 */}
        <div className="px-5 py-5 border-b border-slate-100">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center font-black text-white"
              style={{ background: 'linear-gradient(135deg, #6366F1, #EC4899)' }}>
              M
            </div>
            <span className="font-bold text-slate-900">Manybe</span>
          </Link>
          <div className="mt-2 flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-pink-500" />
            <span className="text-xs text-slate-400 font-medium">크리에이터</span>
          </div>
        </div>

        {/* 네비게이션 */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors group"
            >
              <item.icon className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
              {item.label}
              {item.href === '/creator/deals' && <InboundBadge />}
            </Link>
          ))}
        </nav>

        {/* 하단 */}
        <div className="px-3 py-4 border-t border-slate-100 space-y-1">
          <Link href="/creator/media-kit"
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-gradient-to-r from-indigo-50 to-pink-50 text-sm font-medium text-indigo-700 hover:from-indigo-100 hover:to-pink-100 transition-colors">
            <Eye className="w-4 h-4" />
            내 미디어 키트 →
          </Link>
          <LogoutButton />
        </div>
      </aside>

      {/* 모바일 하단 탭바 */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 flex z-40">
        {NAV.slice(0, 5).map(item => (
          <Link key={item.href} href={item.href}
            className="flex-1 flex flex-col items-center py-2 gap-0.5 text-slate-400 hover:text-indigo-600 transition-colors">
            <item.icon className="w-5 h-5" />
            <span className="text-[10px] font-medium">{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* 메인 콘텐츠 */}
      <main className="flex-1 lg:ml-60 pb-16 lg:pb-0">
        {children}
      </main>
    </div>
  );
}
