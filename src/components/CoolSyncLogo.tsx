import { useTheme } from "../context/ThemeContext";

interface CoolSyncLogoProps {
  size?: number;
  full?: boolean;
  className?: string;
}

export default function CoolSyncLogo({ size = 28, full = false, className = "" }: CoolSyncLogoProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  if (full) {
    return (
      <img
        src={isDark ? "/coolsync_white.svg" : "/coolsync_blue.svg"}
        alt="CoolSync"
        style={{ width: size, height: "auto" }}
        className={className}
        draggable={false}
      />
    );
  }

  return (
    <img
      src={isDark ? "/coolsync_white_no_text.svg" : "/coolsync_blue_no_text.svg"}
      alt="CoolSync"
      width={size}
      height={Math.round(size * (855.87 / 955.8))}
      className={className}
      draggable={false}
    />
  );
}
