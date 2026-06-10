'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-client';
import { Check, X, MessageSquare } from 'lucide-react';

export default function DealActions({ dealId }: { dealId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  async function update(status: string) {
    const sb = createClient();
    await sb.from('deals').update({ status, updated_at: new Date().toISOString() }).eq('id', dealId);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2 flex-shrink-0">
      <button onClick={() => start(() => update('negotiating'))} disabled={pending}
        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-semibold hover:bg-emerald-100 transition-colors disabled:opacity-50">
        <Check className="w-3 h-3" /> 수락
      </button>
      <button onClick={() => start(() => update('negotiating'))} disabled={pending}
        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-semibold hover:bg-indigo-100 transition-colors disabled:opacity-50">
        <MessageSquare className="w-3 h-3" /> 협상
      </button>
      <button onClick={() => start(() => update('cancelled'))} disabled={pending}
        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-50 text-red-600 text-xs font-semibold hover:bg-red-100 transition-colors disabled:opacity-50">
        <X className="w-3 h-3" /> 거절
      </button>
    </div>
  );
}
