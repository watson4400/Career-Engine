export function ScallopMark({
  className = "",
  tone = "light",
}: {
  className?: string;
  tone?: "light" | "dark";
}) {
  const stroke =
    tone === "light" ? "rgba(247,244,239,0.9)" : "var(--atlantic-deep)";
  return (
    <svg
      className={className}
      width="40"
      height="40"
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden
    >
      <path
        d="M32 8c-2 8-14 14-20 22 6 2 12 2 20 2s14 0 20-2C46 22 34 16 32 8Z"
        stroke={stroke}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M12 30c4 10 10 18 20 26 10-8 16-16 20-26"
        stroke={stroke}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M32 12v42M22 28l10 26M42 28L32 54"
        stroke={stroke}
        strokeWidth="1.4"
        strokeLinecap="round"
        opacity="0.7"
      />
    </svg>
  );
}
