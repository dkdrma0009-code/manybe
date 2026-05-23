"use server";

import { createClient } from "@/lib/supabase-server";

export async function submitProposal(formData: FormData): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다." };

  const creator_id = formData.get("creator_id") as string;
  const brand_name = (formData.get("brand_name") as string)?.trim();
  const message = (formData.get("message") as string)?.trim() || "";
  const amount = formData.get("amount") ? Number(formData.get("amount")) : 0;

  if (!brand_name) return { error: "브랜드명을 입력해주세요." };
  if (!creator_id) return { error: "크리에이터 정보를 찾을 수 없습니다." };

  const { error } = await supabase
    .from("advertiser_proposals")
    .insert({ creator_id, advertiser_id: user.id, brand_name, message, amount });

  if (error) return { error: "제출 중 오류가 발생했습니다. 다시 시도해주세요." };
  return {};
}
