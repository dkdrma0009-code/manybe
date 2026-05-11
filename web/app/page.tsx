import Link from "next/link";

const FEATURES = [
  {
    icon: "📱",
    title: "소셜 채널 자동 연동",
    desc: "구글 로그인 한 번으로 유튜브 구독자 수, 조회수가 자동으로 불러와집니다. 수동 입력 0%.",
    color: "bg-red-50",
    iconBg: "bg-red-100",
  },
  {
    icon: "🤝",
    title: "협찬 CRM 파이프라인",
    desc: "검토 → 협상 → 계약 → 촬영 → 정산까지. 협찬 딜의 전 과정을 한눈에 관리하세요.",
    color: "bg-purple-50",
    iconBg: "bg-purple-100",
  },
  {
    icon: "💰",
    title: "수익 대시보드",
    desc: "유튜브 광고, 브랜드 협찬, 제휴 수익을 카테고리별로 분류하고 월별 트렌드를 확인하세요.",
    color: "bg-green-50",
    iconBg: "bg-green-100",
  },
  {
    icon: "📋",
    title: "미디어 키트 자동 생성",
    desc: "채널 통계 기반으로 미디어 키트 URL이 자동 생성됩니다. 브랜드 담당자에게 링크 하나만 보내세요.",
    color: "bg-blue-50",
    iconBg: "bg-blue-100",
  },
  {
    icon: "🧮",
    title: "세금 예상액 시뮬레이터",
    desc: "종합소득세, 원천세를 크리에이터 수익 구조에 맞게 계산해드립니다. (단순 예상치)",
    color: "bg-yellow-50",
    iconBg: "bg-yellow-100",
  },
  {
    icon: "📋",
    title: "클립보드 협찬 파서",
    desc: "카카오톡 협찬 제안 문자를 복사하면 자동으로 CRM에 등록됩니다.",
    color: "bg-orange-50",
    iconBg: "bg-orange-100",
  },
];

const STEPS = [
  { num: "01", title: "구글로 로그인", desc: "1분 안에 가입 완료. 유튜브 채널이 자동으로 연결됩니다." },
  { num: "02", title: "수익 대시보드 확인", desc: "이번 달 수익, 협찬 현황, 세금 예상액이 한눈에 보입니다." },
  { num: "03", title: "미디어 키트 공유", desc: "자동 생성된 링크를 브랜드 담당자에게 보내세요." },
];

const FAQS = [
  {
    q: "무료로 쓸 수 있나요?",
    a: "네. 소셜 채널 연동, 수익 대시보드, 캘린더, 세금 시뮬레이터, 미디어 키트 URL은 모두 무료입니다. 인바운드 문의 폼, 방문자 통계, PDF 리포트는 프리미엄(월 9,900원)에서 제공됩니다.",
  },
  {
    q: "수동으로 입력해야 하나요?",
    a: "아니요. 구글 OAuth로 로그인하면 유튜브 구독자 수, 조회수, 채널명이 자동으로 불러와집니다. 협찬 제안 문자도 클립보드에 복사하면 자동 파싱됩니다.",
  },
  {
    q: "iOS만 지원하나요?",
    a: "현재는 iOS 우선으로 출시됩니다. Android와 웹 버전은 순차적으로 지원할 예정입니다.",
  },
  {
    q: "데이터는 안전한가요?",
    a: "모든 데이터는 Supabase(AWS 기반)에 암호화되어 저장됩니다. 사용자 본인의 데이터만 접근 가능하도록 RLS(Row Level Security)가 적용되어 있습니다.",
  },
];

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Nav */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#6C63FF] flex items-center justify-center">
              <span className="text-white font-bold text-sm">M</span>
            </div>
            <span className="font-bold text-lg text-gray-900">매니비</span>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">기능</a>
            <a href="#pricing" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">요금제</a>
            <a href="#faq" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">FAQ</a>
          </nav>
          <a
            href="#download"
            className="bg-[#6C63FF] text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-[#5B53EE] transition-colors"
          >
            앱 다운로드
          </a>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden bg-gradient-to-b from-[#F5F3FF] to-white pt-24 pb-32">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <div className="inline-flex items-center gap-2 bg-white border border-purple-200 rounded-full px-4 py-1.5 mb-8 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-[#6C63FF] animate-pulse" />
              <span className="text-sm font-medium text-[#6C63FF]">2026년 12월 iOS 출시 예정</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 leading-tight tracking-tight mb-6">
              수익부터 협찬까지,<br />
              <span className="text-gradient">매니비.</span>
            </h1>
            <p className="text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed mb-10">
              크리에이터가 쓰는 5~7개 앱을 하나로. 소셜 채널 자동 연동부터 협찬 CRM, 세금 계산까지 — 비즈니스 관리 OS.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center" id="download">
              <a
                href="#"
                className="inline-flex items-center justify-center gap-3 bg-gray-900 text-white font-semibold px-8 py-4 rounded-2xl hover:bg-gray-800 transition-colors"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                </svg>
                App Store에서 다운로드
              </a>
              <a
                href="#features"
                className="inline-flex items-center justify-center gap-2 bg-white text-gray-700 font-semibold px-8 py-4 rounded-2xl border border-gray-200 hover:border-gray-300 transition-colors"
              >
                기능 살펴보기
                <span>↓</span>
              </a>
            </div>
          </div>

          {/* App preview mockup */}
          <div className="mt-20 max-w-sm mx-auto px-6">
            <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-purple-200 border border-gray-100 overflow-hidden">
              <div className="bg-[#6C63FF] px-6 pt-8 pb-6">
                <p className="text-purple-200 text-xs mb-1">이번 달 총수익</p>
                <p className="text-white text-3xl font-extrabold">4,320,000원</p>
                <div className="mt-3 flex items-center gap-2">
                  <span className="bg-white/20 text-white text-xs px-2 py-1 rounded-full">▲ 전달 대비 +12%</span>
                </div>
                <div className="mt-4 h-1.5 bg-white/20 rounded-full">
                  <div className="h-full bg-white rounded-full" style={{ width: "86%" }} />
                </div>
                <p className="text-purple-200 text-xs mt-1">목표 5,000,000원의 86%</p>
              </div>
              <div className="px-6 py-4 grid grid-cols-2 gap-3">
                {[
                  { label: "유튜브 광고", amount: "1,800,000원", color: "bg-red-50", text: "text-red-600" },
                  { label: "브랜드 협찬", amount: "2,000,000원", color: "bg-purple-50", text: "text-purple-600" },
                  { label: "제휴 수익", amount: "320,000원", color: "bg-orange-50", text: "text-orange-600" },
                  { label: "기타", amount: "200,000원", color: "bg-gray-50", text: "text-gray-600" },
                ].map((item) => (
                  <div key={item.label} className={`${item.color} rounded-xl p-3`}>
                    <p className="text-gray-500 text-xs mb-1">{item.label}</p>
                    <p className={`${item.text} text-sm font-bold`}>{item.amount}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="border-y border-gray-100 py-12">
          <div className="max-w-4xl mx-auto px-6 grid grid-cols-3 gap-8 text-center">
            {[
              { value: "1분", label: "평균 가입 소요 시간" },
              { value: "0%", label: "수동 입력 비율" },
              { value: "7→1", label: "대체하는 앱 수" },
            ].map((s) => (
              <div key={s.label}>
                <p className="text-4xl font-extrabold text-[#6C63FF] mb-1">{s.value}</p>
                <p className="text-sm text-gray-500">{s.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section id="features" className="py-24 bg-white">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-extrabold text-gray-900 mb-4">필요한 기능, 모두 여기</h2>
              <p className="text-gray-500 text-lg">크리에이터 비즈니스에 필요한 것들을 하나씩 모았습니다.</p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {FEATURES.map((f) => (
                <div key={f.title} className={`${f.color} rounded-2xl p-6`}>
                  <div className={`${f.iconBg} w-12 h-12 rounded-xl flex items-center justify-center mb-4 text-2xl`}>
                    {f.icon}
                  </div>
                  <h3 className="font-bold text-gray-900 text-lg mb-2">{f.title}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="py-24 bg-[#F5F3FF]">
          <div className="max-w-4xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-extrabold text-gray-900 mb-4">3단계로 시작하세요</h2>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              {STEPS.map((s) => (
                <div key={s.num} className="bg-white rounded-2xl p-6 shadow-sm">
                  <p className="text-5xl font-extrabold text-[#6C63FF]/20 mb-3">{s.num}</p>
                  <h3 className="font-bold text-gray-900 text-lg mb-2">{s.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="py-24 bg-white">
          <div className="max-w-4xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-extrabold text-gray-900 mb-4">심플한 요금제</h2>
              <p className="text-gray-500 text-lg">핵심 기능은 무료. 프리미엄은 진짜 필요할 때.</p>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              {/* Free */}
              <div className="border border-gray-200 rounded-2xl p-8">
                <p className="text-sm font-semibold text-gray-500 mb-2">무료 플랜</p>
                <p className="text-4xl font-extrabold text-gray-900 mb-1">0원</p>
                <p className="text-gray-400 text-sm mb-8">영원히 무료</p>
                <ul className="space-y-3 mb-8">
                  {[
                    "소셜 채널 자동 연동",
                    "수익 대시보드",
                    "협찬 CRM (10건)",
                    "캘린더 일정 관리",
                    "세금 예상액 시뮬레이터",
                    "미디어 키트 URL",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-3 text-sm text-gray-600">
                      <span className="text-green-500 font-bold">✓</span>
                      {item}
                    </li>
                  ))}
                </ul>
                <a href="#download" className="block w-full text-center border border-[#6C63FF] text-[#6C63FF] font-semibold py-3 rounded-xl hover:bg-purple-50 transition-colors">
                  무료로 시작하기
                </a>
              </div>

              {/* Premium */}
              <div className="bg-[#6C63FF] rounded-2xl p-8 text-white relative overflow-hidden">
                <div className="absolute top-4 right-4 bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full">
                  추천
                </div>
                <p className="text-sm font-semibold text-purple-200 mb-2">프리미엄 플랜</p>
                <div className="flex items-end gap-2 mb-1">
                  <p className="text-4xl font-extrabold">9,900원</p>
                  <p className="text-purple-200 mb-1">/월</p>
                </div>
                <p className="text-purple-200 text-sm mb-8">연간 결제 시 94,800원 (20% 할인)</p>
                <ul className="space-y-3 mb-8">
                  {[
                    "무료 플랜 모든 기능",
                    "인바운드 문의 폼 활성화",
                    "미디어 키트 방문자 통계",
                    "협찬 CRM 무제한",
                    "PDF 리포트 내보내기",
                    "데이터 무제한 보관",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-3 text-sm text-white">
                      <span className="text-yellow-300 font-bold">✓</span>
                      {item}
                    </li>
                  ))}
                </ul>
                <a href="/premium" className="block w-full text-center bg-white text-[#6C63FF] font-semibold py-3 rounded-xl hover:bg-purple-50 transition-colors">
                  프리미엄 시작하기
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="py-24 bg-gray-50">
          <div className="max-w-3xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-extrabold text-gray-900 mb-4">자주 묻는 질문</h2>
            </div>
            <div className="space-y-4">
              {FAQS.map((faq) => (
                <div key={faq.q} className="bg-white rounded-2xl p-6 shadow-sm">
                  <p className="font-bold text-gray-900 mb-2">{faq.q}</p>
                  <p className="text-gray-500 text-sm leading-relaxed">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-24 bg-[#1A1A2E] text-white text-center">
          <div className="max-w-2xl mx-auto px-6">
            <h2 className="text-4xl font-extrabold mb-4">지금 바로 시작하세요</h2>
            <p className="text-gray-400 text-lg mb-10">1만 구독자부터 100만 구독자까지. 매니비가 함께합니다.</p>
            <a
              href="#download"
              className="inline-flex items-center justify-center gap-3 bg-[#6C63FF] text-white font-semibold px-10 py-4 rounded-2xl hover:bg-[#5B53EE] transition-colors text-lg"
            >
              App Store에서 다운로드
            </a>
            <p className="text-gray-600 text-sm mt-4">2026년 12월 iOS 출시 · 무료로 시작</p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-[#1A1A2E] border-t border-white/10 py-12">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#6C63FF] flex items-center justify-center">
              <span className="text-white font-bold text-xs">M</span>
            </div>
            <span className="font-bold text-white">매니비</span>
          </div>
          <div className="flex gap-6 text-sm text-gray-500">
            <a href="/terms" className="hover:text-gray-300 transition-colors">이용약관</a>
            <a href="/privacy" className="hover:text-gray-300 transition-colors">개인정보처리방침</a>
            <a href="mailto:dkdrma0009@gmail.com" className="hover:text-gray-300 transition-colors">문의하기</a>
          </div>
          <p className="text-gray-600 text-sm">© 2026 매니비. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
