import React from "react";

export default function CoolSyncLogo({ size = 28, className = "" }) {
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
      {/* ── Snowflake ── */}
      {/* Center vertical arm */}
      <line x1="34" y1="20" x2="34" y2="74" />
      {/* Top barbs */}
      <line x1="34" y1="28" x2="24" y2="20" />
      <line x1="34" y1="28" x2="44" y2="20" />
      {/* Bottom barbs */}
      <line x1="34" y1="66" x2="24" y2="74" />
      <line x1="34" y1="66" x2="44" y2="74" />

      {/* Left diagonal arm (upper-left to lower-right) */}
      <line x1="13" y1="36" x2="55" y2="58" />
      {/* Barbs on left arm */}
      <line x1="19" y1="31" x2="13" y2="42" />
      <line x1="49" y1="53" x2="55" y2="64" />

      {/* Right diagonal arm (upper-right to lower-left) */}
      <line x1="55" y1="36" x2="13" y2="58" />
      {/* Barbs on right arm */}
      <line x1="49" y1="31" x2="55" y2="42" />
      <line x1="19" y1="53" x2="13" y2="64" />

      {/* ── Power button circle (center of icon, bridging snowflake + wifi) ── */}
      <circle cx="58" cy="58" r="14" />
      {/* Power button gap + stem */}
      <path d="M53 49 A10 10 0 1 0 63 49" strokeWidth="4.5" />
      <line x1="58" y1="44" x2="58" y2="52" />

      {/* ── Wifi arcs (upper-right, emanating from power button center) ── */}
      <path d="M68 42 A17 17 0 0 1 82 56" strokeWidth="4" />
      <path d="M73 34 A27 27 0 0 1 92 58" strokeWidth="4" />
    </svg>
  );
}
