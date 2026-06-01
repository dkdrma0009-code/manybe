"use server";

import { createClient } from "@/lib/supabase-server";

export async function joinWaitlist(formData: FormData): Promise<{ error?: string; already?: boolean }> {
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const role  = (formData.get("role") as string) ?? "creator";

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "올바른 이메일 주소를 입력해주세요." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("waitlist").insert({ email, role });

  if (error?.code === "23505") return { already: true };
  if (error) return { error: "오류가 발생했습니다. 다시 시도해주세요." };
  return {};
}
