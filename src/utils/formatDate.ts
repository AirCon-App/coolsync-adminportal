const MONTH_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * Parse a value into a Date. Date-only strings ("2026-06-19") are treated as
 * local midnight rather than UTC, avoiding the off-by-one shift in negative
 * time zones.
 */
function toDate(value: string | number | Date | null | undefined): Date | null {
  if (value == null || value === "") return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  if (typeof value === "string") {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  }
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

/** Format a date as MON-DD-YYYY (e.g. "Jun-19-2026"). */
export function formatDate(value: string | number | Date | null | undefined): string {
  const d = toDate(value);
  if (!d) return "—";
  return `${MONTH_ABBR[d.getMonth()]}-${String(d.getDate()).padStart(2, "0")}-${d.getFullYear()}`;
}

/** Format a date-time as "MON-DD-YYYY HH:MM" keeping the local time portion. */
export function formatDateTime(value: string | number | Date | null | undefined): string {
  const d = toDate(value);
  if (!d) return "—";
  const time = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  return `${formatDate(d)} ${time}`;
}
