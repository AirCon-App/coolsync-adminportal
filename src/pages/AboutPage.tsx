import PageShell from "../components/PageShell";
import CoolSyncLogo from "../components/CoolSyncLogo";
import { useTheme } from "../context/ThemeContext";

export default function AboutPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <PageShell>
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "2rem 1rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>

        {/* App identity */}
        <div style={{
          background: "var(--bg-raised)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: "2rem",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "0.75rem",
          textAlign: "center",
        }}>
          <CoolSyncLogo size={56} />
          <div>
            <h1 style={{ margin: 0, fontSize: "1.75rem", fontWeight: 700, color: "var(--text-primary)" }}>CoolSync</h1>
            <p style={{ margin: "0.25rem 0 0", color: "var(--text-secondary)", fontSize: "0.875rem" }}>Version 1.0</p>
          </div>
          <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "0.9375rem", lineHeight: 1.6, maxWidth: 480 }}>
            HVAC filter maintenance and inventory management platform for commercial buildings.
            Track every filter change, manage stock levels, and generate compliance reports — all in one place.
          </p>
        </div>

        {/* Owning company */}
        <div style={{
          background: "var(--bg-raised)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: "2rem",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "1rem",
          textAlign: "center",
        }}>
          <p style={{ margin: 0, fontSize: "0.75rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)" }}>Made by</p>
          <img
            src={isDark ? "/njfilters_white.svg" : "/njfilters_color.svg"}
            alt="NJ Filters"
            style={{ width: 180, height: "auto" }}
            draggable={false}
          />
          <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "0.9375rem", lineHeight: 1.6, maxWidth: 480 }}>
            NJ Filters is a leading provider of commercial HVAC filtration solutions.
            CoolSync was developed to give facilities teams real-time visibility into filter usage,
            inventory, and maintenance compliance across their entire building portfolio.
          </p>
        </div>

        {/* Legal */}
        <p style={{ margin: 0, textAlign: "center", color: "var(--text-muted)", fontSize: "0.8125rem" }}>
          © {new Date().getFullYear()} NJ Filters. All rights reserved.
        </p>

      </div>
    </PageShell>
  );
}
