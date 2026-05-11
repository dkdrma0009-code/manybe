import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-[#6C63FF] flex items-center justify-center mx-auto mb-6">
          <span className="text-white font-bold text-2xl">M</span>
        </div>
        <h1 className="text-2xl font-extrabold text-gray-900 mb-2">미디어 키트를 찾을 수 없습니다</h1>
        <p className="text-gray-500 text-sm mb-8">URL을 다시 확인하거나 크리에이터에게 문의하세요.</p>
        <Link href="/" className="bg-[#6C63FF] text-white font-semibold px-6 py-3 rounded-xl hover:bg-[#5B53EE] transition-colors">
          매니비 홈으로
        </Link>
      </div>
    </div>
  );
}
