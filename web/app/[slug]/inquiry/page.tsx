import { redirect, notFound } from "next/navigation";
import { getAdvertiserSession } from "@/lib/supabase-server";
import { getSupabase } from "@/lib/supabase";
import InquiryForm from "./InquiryForm";

export default async function InquiryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await getAdvertiserSession();

  if (!session) {
    redirect(`/advertiser/login?next=/${slug}/inquiry`);
  }

  const supabase = getSupabase();
  const { data: kit } = await supabase
    .from("media_kits")
    .select("id, user_id, is_form_enabled")
    .eq("slug", slug)
    .single();

  if (!kit) notFound();
  if (!kit.is_form_enabled) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
        <div className="text-center max-w-sm">
          <p className="text-gray-500">현재 이 크리에이터는 협찬 문의를 받지 않습니다.</p>
        </div>
      </div>
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", kit.user_id)
    .single();

  return (
    <InquiryForm
      slug={slug}
      creatorId={kit.user_id}
      creatorName={profile?.full_name ?? slug}
      advertiserName={session.profile.full_name ?? ""}
    />
  );
}
