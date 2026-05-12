import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "개인정보처리방침 — 매니비",
  description: "매니비 개인정보처리방침",
};

const SECTIONS = [
  {
    title: "1. 수집하는 개인정보",
    body: "매니비는 회원 가입 및 서비스 제공을 위해 이메일, 이름, 프로필 정보, 소셜 채널 정보, 수익/협찬/일정 데이터, 미디어 키트 정보, 문의 내역 등을 수집할 수 있습니다.",
  },
  {
    title: "2. 개인정보 이용 목적",
    body: "수집한 정보는 계정 인증, 서비스 제공, 크리에이터 비즈니스 데이터 관리, 미디어 키트 표시, 고객 문의 처리, 서비스 개선 및 보안 유지에 사용됩니다.",
  },
  {
    title: "3. 보관 기간",
    body: "개인정보는 회원 탈퇴 또는 이용 목적 달성 시 지체 없이 파기합니다. 단, 관계 법령에 따라 보관이 필요한 정보는 해당 기간 동안 보관할 수 있습니다.",
  },
  {
    title: "4. 제3자 제공",
    body: "매니비는 이용자의 동의 없이 개인정보를 외부에 제공하지 않습니다. 다만 법령에 따른 요청이 있거나 이용자가 직접 공개한 미디어 키트 정보는 예외로 합니다.",
  },
  {
    title: "5. 처리 위탁 및 외부 서비스",
    body: "서비스 운영을 위해 Supabase, Vercel, 결제 대행사, OAuth 제공자 등 외부 서비스를 사용할 수 있으며, 필요한 범위에서 데이터가 처리될 수 있습니다.",
  },
  {
    title: "6. 이용자의 권리",
    body: "이용자는 자신의 개인정보에 대해 열람, 정정, 삭제, 처리 정지를 요청할 수 있습니다. 요청은 고객 문의 채널을 통해 접수할 수 있습니다.",
  },
  {
    title: "7. 안전성 확보 조치",
    body: "매니비는 접근 권한 관리, 인증, 암호화된 통신, 데이터베이스 보안 정책 등 개인정보 보호를 위한 기술적, 관리적 조치를 적용합니다.",
  },
  {
    title: "8. 문의",
    body: "개인정보 보호 관련 문의는 help@manybe.app 또는 서비스 내 고객 문의 채널로 접수할 수 있습니다.",
  },
];

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-100 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link href="/" className="font-extrabold text-gray-900">
            매니비
          </Link>
          <span className="text-sm font-semibold text-gray-400">개인정보처리방침</span>
        </div>
      </header>

      <article className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="mb-3 text-3xl font-extrabold text-gray-900">개인정보처리방침</h1>
        <p className="mb-10 text-sm text-gray-500">시행일: 2026년 5월 12일</p>

        <div className="space-y-6">
          {SECTIONS.map((section) => (
            <section key={section.title} className="rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="mb-3 text-lg font-bold text-gray-900">{section.title}</h2>
              <p className="text-sm leading-7 text-gray-600">{section.body}</p>
            </section>
          ))}
        </div>
      </article>
    </main>
  );
}
