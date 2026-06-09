import { useState, ChangeEvent } from "react";

interface Preset {
  label: string;
  months: number | null;
}

const PRESETS: Preset[] = [
  { label: "1 Month",  months: 1  },
  { label: "3 Months", months: 3  },
  { label: "6 Months", months: 6  },
  { label: "1 Year",   months: 12 },
  { label: "Custom",   months: null },
];

function monthsAgo(n: number): Date {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d;
}

function parseLocalDate(str: string): Date {
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function toInputValue(d: Date | null): string {
  if (!d) return "";
  const dt = new Date(d);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

interface TimeFrameSelectorProps {
  dateFrom: Date | null;
  dateTo: Date | null;
  onChange: (range: { dateFrom: Date; dateTo: Date }) => void;
}

export default function TimeFrameSelector({ dateFrom, dateTo, onChange }: TimeFrameSelectorProps) {
  const [activeMonths, setActiveMonths] = useState<number | null>(1);

  function selectPreset(months: number) {
    setActiveMonths(months);
    onChange({ dateFrom: monthsAgo(months), dateTo: new Date() });
  }

  function activateCustom() {
    setActiveMonths(null);
  }

  function handleCustomFrom(e: ChangeEvent<HTMLInputElement>) {
    if (!e.target.value) return;
    setActiveMonths(null);
    onChange({ dateFrom: parseLocalDate(e.target.value), dateTo: dateTo ?? new Date() });
  }

  function handleCustomTo(e: ChangeEvent<HTMLInputElement>) {
    if (!e.target.value) return;
    setActiveMonths(null);
    onChange({ dateFrom: dateFrom ?? new Date(), dateTo: parseLocalDate(e.target.value) });
  }

  const isCustom = activeMonths === null;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
      <span style={{ color: "var(--text-secondary)", fontSize: "0.8rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginRight: "0.25rem" }}>
        Period
      </span>
      {PRESETS.map((p) => {
        const active = p.months === null ? isCustom : activeMonths === p.months;
        return (
          <button
            key={p.label}
            onClick={() => p.months !== null ? selectPreset(p.months) : activateCustom()}
            style={{
              padding: "0.3rem 0.75rem",
              fontSize: "0.8rem",
              fontWeight: 600,
              borderRadius: "999px",
              border: active ? "none" : "1px solid var(--border)",
              background: active ? "var(--text-primary)" : "transparent",
              color: active ? "var(--bg-base)" : "var(--text-secondary)",
              cursor: "pointer",
              transition: "all 0.15s",
              fontFamily: "inherit",
            }}
          >
            {p.label}
          </button>
        );
      })}
      {isCustom && (
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginLeft: "0.25rem" }}>
          <input
            type="date"
            className="inventory-modal-input"
            value={toInputValue(dateFrom)}
            onChange={handleCustomFrom}
            style={{ marginBottom: 0, width: "auto", padding: "0.25rem 0.5rem", fontSize: "0.8rem" }}
          />
          <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>–</span>
          <input
            type="date"
            className="inventory-modal-input"
            value={toInputValue(dateTo)}
            onChange={handleCustomTo}
            style={{ marginBottom: 0, width: "auto", padding: "0.25rem 0.5rem", fontSize: "0.8rem" }}
          />
        </div>
      )}
    </div>
  );
}
