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

      const { count: c } = await sb
        .from('media_kit_inquiries')
        .select('id, media_kits!inner(user_id)', { count: 'exact', head: true })
        .eq('media_kits.user_id', user.id)
        .eq('is_read', false);

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
