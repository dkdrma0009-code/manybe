import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../api/supabase';

export interface Proposal {
  id: string;
  brand_name: string;
  message: string;
  amount: number;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
}

export function useProposals(userId: string | undefined) {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchPending = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const { data } = await supabase
      .from('advertiser_proposals')
      .select('*')
      .eq('creator_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    setProposals((data as Proposal[]) ?? []);
    setLoading(false);
  }, [userId]);

  useEffect(() => { fetchPending(); }, [fetchPending]);

  // Realtime: 새 제안 수신 + 상태 변경 반영
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`proposals:${userId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'advertiser_proposals',
        filter: `creator_id=eq.${userId}`,
      }, fetchPending)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'advertiser_proposals',
        filter: `creator_id=eq.${userId}`,
      }, fetchPending)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, fetchPending]);

  async function acceptProposal(proposal: Proposal): Promise<string | null> {
    if (!userId) return '로그인이 필요합니다';
    try {
      const { error: dealErr } = await supabase.from('deals').insert({
        user_id: userId,
        brand: proposal.brand_name,
        title: `[제안] ${proposal.brand_name} 협찬`,
        amount: proposal.amount,
        status: 'inquiry',
      });
      if (dealErr) throw dealErr;

      const { error } = await supabase
        .from('advertiser_proposals')
        .update({ status: 'accepted' })
        .eq('id', proposal.id);
      if (error) throw error;

      await fetchPending();
      return null;
    } catch (e: any) {
      return e.message ?? '처리에 실패했습니다';
    }
  }

  async function rejectProposal(id: string): Promise<string | null> {
    const { error } = await supabase
      .from('advertiser_proposals')
      .update({ status: 'rejected' })
      .eq('id', id);
    if (error) return error.message;
    await fetchPending();
    return null;
  }

  return { proposals, loading, refetch: fetchPending, acceptProposal, rejectProposal };
}
