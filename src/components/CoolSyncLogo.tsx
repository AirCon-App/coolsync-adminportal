interface CoolSyncLogoProps {
  size?: number;
  className?: string;
}

export default function CoolSyncLogo({ size = 28, className = "" }: CoolSyncLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="4.5"
      className={className}
      aria-label="CoolSync"
    >
      <line x1="34" y1="20" x2="34" y2="74" />
      <line x1="34" y1="28" x2="24" y2="20" />
      <line x1="34" y1="28" x2="44" y2="20" />
      <line x1="34" y1="66" x2="24" y2="74" />
      <line x1="34" y1="66" x2="44" y2="74" />
      <line x1="13" y1="36" x2="55" y2="58" />
      <line x1="19" y1="31" x2="13" y2="42" />
      <line x1="49" y1="53" x2="55" y2="64" />
      <line x1="55" y1="36" x2="13" y2="58" />
      <line x1="49" y1="31" x2="55" y2="42" />
      <line x1="19" y1="53" x2="13" y2="64" />
      <circle cx="58" cy="58" r="14" />
      <path d="M53 49 A10 10 0 1 0 63 49" strokeWidth="4.5" />
      <line x1="58" y1="44" x2="58" y2="52" />
      <path d="M68 42 A17 17 0 0 1 82 56" strokeWidth="4" />
      <path d="M73 34 A27 27 0 0 1 92 58" strokeWidth="4" />
    </svg>
  );
}
