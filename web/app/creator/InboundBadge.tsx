'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase-client';

export default function InboundBadge() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    (async () => {
      const sb = createClient();
      const { data: { user } } = await sb.auth.getUser();
      if (!user) return;

      const { data: creator } = await sb
        .from('creator_profiles').select('id').eq('user_id', user.id).single();
      if (!creator) return;

      const { count: c } = await sb
        .from('deals')
        .select('*', { count: 'exact', head: true })
        .eq('creator_id', creator.id)
        .eq('status', 'proposed')
        .not('contact_info', 'is', null);

      setCount(c ?? 0);
    })();
  }, []);

  if (count === 0) return null;
  return (
    <span className="ml-auto flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold">
      {count > 9 ? '9+' : count}
    </span>
  );
}
