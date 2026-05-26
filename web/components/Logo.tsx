interface LogoProps {
  size?: number;
  showText?: boolean;
  textSize?: string;
  /** true = 어두운 배경 위 (보라 패널 등) — 텍스트 흰색, 아이콘 반투명 흰 배경 */
  onDark?: boolean;
}

export default function Logo({ size = 28, showText = true, textSize = "text-sm", onDark = false }: LogoProps) {
  return (
    <div className="flex items-center gap-2.5">
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="32" height="32" rx="9" fill={onDark ? "rgba(255,255,255,0.18)" : "#6C63FF"} />
        {/* Two interlocked rings — creator ↔ brand */}
        <circle cx="13" cy="16" r="5.5" fill="none" stroke="white" strokeWidth="2.2" />
        <circle cx="20" cy="16" r="5.5" fill="none" stroke="white" strokeWidth="2.2" strokeOpacity="0.6" />
        {/* Overlap mask so rings look interlocked */}
        <path
          d="M16.5 11.4 C18.4 12.8 18.4 19.2 16.5 20.6 C14.6 19.2 14.6 12.8 16.5 11.4Z"
          fill={onDark ? "rgba(255,255,255,0.18)" : "#6C63FF"}
        />
      </svg>
      {showText && (
        <span
          className={`font-bold tracking-tight ${textSize}`}
          style={{ color: onDark ? "#fff" : "var(--ink)" }}
        >
          매니비
        </span>
      )}
    </div>
  );
}
