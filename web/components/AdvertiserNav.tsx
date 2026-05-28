import Link from "next/link";
import Logo from "@/components/Logo";
import { logoutAdvertiser } from "@/app/advertiser/signup/actions";

interface Props {
  userName: string;
  current?: "discover" | "dashboard" | "messages";
}

export default function AdvertiserNav({ userName, current }: Props) {
  return (
    <header className="bg-white sticky top-0 z-10" style={{ borderBottom: "1px solid var(--border-faint)" }}>
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/discover"><Logo size={18} period /></Link>
          <nav className="hidden sm:flex items-center gap-1">
            <Link
              href="/discover"
              className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
              style={current === "discover"
                ? { color: "var(--ink)", background: "var(--surface-2)" }
                : { color: "var(--ink-3)" }}
            >
              탐색
            </Link>
            <Link
              href="/advertiser/dashboard"
              className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
              style={current === "dashboard"
                ? { color: "var(--ink)", background: "var(--surface-2)" }
                : { color: "var(--ink-3)" }}
            >
              보낸 제안
            </Link>
            <Link
              href="/advertiser/messages"
              className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
              style={current === "messages"
                ? { color: "var(--ink)", background: "var(--surface-2)" }
                : { color: "var(--ink-3)" }}
            >
              메시지
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm hidden sm:block" style={{ color: "var(--ink-3)" }}>{userName}</span>
          <form action={logoutAdvertiser}>
            <button className="text-sm px-3 py-1.5 rounded-lg transition-colors hover:bg-gray-100" style={{ color: "var(--ink-4)" }}>
              로그아웃
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
