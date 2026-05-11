import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "매니비 — 크리에이터 비즈니스 매니저",
  description: "수익부터 협찬까지, 매니비. 크리에이터가 쓰는 5~7개 앱을 하나로 통합하는 비즈니스 관리 OS",
  openGraph: {
    title: "매니비 — 크리에이터 비즈니스 매니저",
    description: "수익부터 협찬까지, 매니비.",
    locale: "ko_KR",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className="h-full scroll-smooth">
      <body className="min-h-full flex flex-col bg-white text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}
