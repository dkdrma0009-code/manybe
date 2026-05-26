"use server";

import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";

export async function signUpAdvertiser(formData: FormData) {
  const email = (formData.get("email") as string)?.trim();
  const password = formData.get("password") as string;
  const companyName = (formData.get("company_name") as string)?.trim();

  if (!email || !password || !companyName) {
    return { error: "모든 항목을 입력해주세요." };
  }
  if (password.length < 8) {
    return { error: "비밀번호는 8자 이상이어야 합니다." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) return { error: error.message };
  if (!data.user) return { error: "회원가입에 실패했습니다." };

  const { error: profileError } = await supabase.rpc("create_advertiser_profile", {
    user_id: data.user.id,
    company_name: companyName,
  });

  if (profileError) return { error: profileError.message };

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
