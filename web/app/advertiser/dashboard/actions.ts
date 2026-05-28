"use server";

import { revalidatePath } from "next/cache";
import { createClient, getAdvertiserSession } from "@/lib/supabase-server";

export async function withdrawProposal(proposalId: string): Promise<{ error?: string }> {
  const session = await getAdvertiserSession();
  if (!session) return { error: "로그인이 필요합니다." };

  const supabase = await createClient();

  // 본인 제안이고 pending 상태인 것만 철회 가능
  const { data: proposal } = await supabase
    .from("advertiser_proposals")
    .select("id, status, advertiser_id")
    .eq("id", proposalId)
    .single();

  if (!proposal) return { error: "제안을 찾을 수 없습니다." };
  if (proposal.advertiser_id !== session.user.id) return { error: "권한이 없습니다." };
  if (proposal.status !== "pending") return { error: "검토 중인 제안만 철회할 수 있습니다." };

  const { error } = await supabase
    .from("advertiser_proposals")
    .delete()
    .eq("id", proposalId);

  if (error) return { error: "철회에 실패했습니다. 다시 시도해주세요." };

  revalidatePath("/advertiser/dashboard");
  return {};
}
