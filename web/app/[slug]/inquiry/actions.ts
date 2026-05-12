"use server";

import { createClient } from "@supabase/supabase-js";

function getAdminSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase admin environment variables are required.");
  }

  return createClient(supabaseUrl, serviceRoleKey);
}

const PERSONAL_DOMAINS = new Set([
  "gmail.com", "naver.com", "kakao.com", "daum.net",
  "hanmail.net", "hotmail.com", "outlook.com", "yahoo.com",
  "icloud.com", "me.com", "mac.com",
]);

function isPersonalEmail(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase();
  return !domain || PERSONAL_DOMAINS.has(domain);
}

export async function submitInquiry(formData: FormData): Promise<{ error?: string }> {
  const adminSupabase = getAdminSupabase();
  const slug = formData.get("slug") as string;
  const brand_name = (formData.get("brand_name") as string)?.trim();
  const business_number = (formData.get("business_number") as string)?.trim() || null;
  const contact_email = (formData.get("contact_email") as string)?.trim();
  const budget = formData.get("budget") ? Number(formData.get("budget")) : null;
  const proposal = (formData.get("proposal") as string)?.trim() || null;
  const deadline = (formData.get("deadline") as string) || null;

  if (!brand_name) return { error: "브랜드명을 입력해주세요." };
  if (!business_number) return { error: "사업자등록번호를 입력해주세요." };
  if (!contact_email) return { error: "이메일을 입력해주세요." };
  if (isPersonalEmail(contact_email)) {
    return { error: "기업 이메일만 허용됩니다. (Gmail, Naver 등 개인 이메일 불가)" };
  }

  const { data: kits } = await adminSupabase
    .from("media_kits")
    .select("id, user_id, is_form_enabled")
    .eq("slug", slug)
    .limit(1);

  const kit = kits?.[0] ?? null;
  if (!kit) return { error: "미디어 키트를 찾을 수 없습니다." };
  if (!kit.is_form_enabled) return { error: "현재 협찬 문의 폼이 비활성화되어 있습니다." };

  const { error: inquiryError, data: inquiryData } = await adminSupabase
    .from("media_kit_inquiries")
    .insert({
      media_kit_id: kit.id,
      brand_name,
      business_number,
      contact_email,
      budget,
      proposal,
      deadline,
    })
    .select("id");

  if (inquiryError) return { error: "제출 중 오류가 발생했습니다. 다시 시도해주세요." };

  const inquiryId = inquiryData?.[0]?.id;

  const { data: dealData } = await adminSupabase
    .from("deals")
    .insert({
      user_id: kit.user_id,
      brand: brand_name,
      title: proposal?.substring(0, 60) || "인바운드 협찬 문의",
      status: "pending",
      source: "media_kit",
      amount: budget,
      notes: proposal,
      end_date: deadline,
    })
    .select("id");

  const dealId = dealData?.[0]?.id;
  if (dealId && inquiryId) {
    await adminSupabase
      .from("media_kit_inquiries")
      .update({ deal_id: dealId })
      .eq("id", inquiryId);
  }

  return {};
}
