import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "서비스 이용약관 — 매니비",
  description: "매니비 서비스 이용약관",
};

const SECTIONS = [
  {
    title: "제1조 목적",
    body: "본 약관은 매니비가 제공하는 크리에이터 비즈니스 관리 서비스의 이용 조건과 절차, 회사와 이용자의 권리, 의무 및 책임 사항을 규정합니다.",
  },
  {
    title: "제2조 서비스의 제공",
    body: "매니비는 수익 관리, 협찬 관리, 일정 관리, 미디어 키트 생성, 인바운드 문의 관리 등 크리에이터의 비즈니스 운영을 돕는 기능을 제공합니다.",
  },
  {
    title: "제3조 회원 가입과 계정 관리",
    body: "이용자는 정확한 정보를 제공해야 하며, 계정 및 인증 수단의 관리 책임은 이용자에게 있습니다. 타인의 정보를 도용하거나 허위 정보를 입력해서는 안 됩니다.",
  },
  {
    title: "제4조 유료 서비스",
    body: "일부 기능은 유료 플랜으로 제공될 수 있습니다. 유료 서비스의 가격, 결제 방식, 제공 범위는 서비스 내 고지된 내용을 따릅니다.",
  },
  {
    title: "제5조 금지 행위",
    body: "이용자는 불법 정보 입력, 타인의 권리 침해, 서비스 장애 유발, 비정상적인 접근, 데이터 무단 수집 등 서비스 운영을 방해하는 행위를 해서는 안 됩니다.",
  },
  {
    title: "제6조 서비스 변경 및 중단",
    body: "회사는 운영상, 기술상 필요에 따라 서비스의 전부 또는 일부를 변경하거나 일시 중단할 수 있습니다. 중요한 변경 사항은 가능한 범위에서 사전에 안내합니다.",
  },
  {
    title: "제7조 면책",
    body: "매니비의 세금 계산, 수익 예측, 리포트 등은 참고용 정보이며 법률, 세무, 회계 자문을 대체하지 않습니다. 중요한 의사결정은 전문가와 확인해야 합니다.",
  },
  {
    title: "제8조 문의",
    body: "서비스 이용과 관련한 문의는 help@manybe.app 또는 서비스 내 고객 문의 채널을 통해 접수할 수 있습니다.",
  },
];

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-100 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link href="/" className="font-extrabold text-gray-900">
            매니비
          </Link>
          <span className="text-sm font-semibold text-gray-400">이용약관</span>
        </div>
      </header>

      <article className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="mb-3 text-3xl font-extrabold text-gray-900">서비스 이용약관</h1>
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
