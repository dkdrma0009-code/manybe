interface LogoProps {
  /** indigo period "." 표시 여부 */
  period?: boolean;
  size?: number;
  /** 어두운 배경 위 — 텍스트 흰색 */
  onDark?: boolean;
}

export default function Logo({ period = false, size = 18, onDark = false }: LogoProps) {
  return (
    <span
      style={{
        fontFamily: 'var(--font-brand), -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
        fontWeight: 700,
        fontSize: size,
        letterSpacing: "-0.04em",
        lineHeight: 1,
        color: onDark ? "#FFFFFF" : "#181818",
        userSelect: "none",
      }}
    >
      manybe{period && <span style={{ color: "#5566DF" }}>.</span>}
    </span>
  );
}
