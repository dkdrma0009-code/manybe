'use client';

import { createClient } from '@/lib/supabase-client';
import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/creator/login');
  }

  return (
    <button
      onClick={handleLogout}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors group"
    >
      <LogOut className="w-4 h-4 group-hover:text-red-500 transition-colors" />
      로그아웃
    </button>
  );
}
