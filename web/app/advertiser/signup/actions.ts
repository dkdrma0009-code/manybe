"use server";

import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";

export async function signUpAdvertiser(formData: FormData) {
  const email = (formData.get("email") as string)?.trim();
  const password = formData.get("password") as string;
  const companyName = (formData.get("company_name") as string)?.trim();
  const businessNumber = (formData.get("business_number") as string)?.replace(/\D/g, "");

  if (!email || !password || !companyName || !businessNumber) {
    return { error: "모든 항목을 입력해주세요." };
  }
  if (password.length < 8) {
    return { error: "비밀번호는 8자 이상이어야 합니다." };
  }
  if (businessNumber.length !== 10) {
    return { error: "사업자등록번호는 10자리여야 합니다." };
  }

  // 사업자등록번호 국세청 검증
  const validateRes = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/validate-business-number`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ b_no: businessNumber }),
    }
  );
  const validateData = await validateRes.json();
  if (!validateData.valid) return { error: validateData.message ?? "유효하지 않은 사업자등록번호입니다." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) return { error: error.message };
  if (!data.user) return { error: "회원가입에 실패했습니다." };

  const { error: profileError } = await supabase.rpc("create_advertiser_profile", {
    user_id: data.user.id,
    company_name: companyName,
  });
  if (profileError) return { error: profileError.message };

  await supabase
    .from("profiles")
    .update({ business_number: businessNumber, advertiser_onboarding_done: true })
    .eq("id", data.user.id);

  redirect("/advertiser/dashboard");
}

export async function loginAdvertiser(formData: FormData) {
  const email = (formData.get("email") as string)?.trim();
  const password = formData.get("password") as string;

  if (!email || !password) return { error: "이메일과 비밀번호를 입력해주세요." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "이메일 또는 비밀번호를 확인해주세요." };

  // role 확인
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "로그인에 실패했습니다." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "advertiser") {
    await supabase.auth.signOut();
    return { error: "광고주 계정이 아닙니다. 크리에이터 앱에서 로그인해주세요." };
  }

  const next = formData.get("next") as string | null;
  redirect(next || "/advertiser/dashboard");
}

export async function logoutAdvertiser() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/advertiser/login");
}
