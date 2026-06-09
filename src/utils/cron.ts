export const PRESET_LABEL: Record<string, string> = {
  "*/15 * * * *": "Every 15 minutes",
  "*/30 * * * *": "Every 30 minutes",
  "0 * * * *":    "Every hour at :00",
  "0 */6 * * *":  "Every 6 hours",
  "0 8 * * *":    "Daily at 08:00",
  "0 0 * * *":    "Daily at midnight",
  "0 8 * * 1":    "Weekly — Monday at 08:00",
};

const DOW_NAMES   = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTH_NAMES = ["", "January", "February", "March", "April", "May", "June",
                       "July", "August", "September", "October", "November", "December"];

function pad2(n: number): string { return String(n).padStart(2, "0"); }

type CronField = { kind: "any" } | { kind: "every"; step: number } | { kind: "list"; values: number[] };

function parseField(token: string, min: number, max: number): CronField | null {
  if (token === "*") return { kind: "any" };

  if (/^\*\/\d+$/.test(token)) {
    const step = parseInt(token.slice(2), 10);
    if (!Number.isFinite(step) || step <= 0) return null;
    return { kind: "every", step };
  }

  const out = new Set<number>();
  for (const raw of token.split(",")) {
    const part = raw.trim();
    if (!part) return null;

    let body = part, step = 1;
    if (part.includes("/")) {
      const [b, s] = part.split("/");
      body = b;
      step = parseInt(s, 10);
      if (!Number.isFinite(step) || step <= 0) return null;
    }

    if (body === "*") {
      for (let i = min; i <= max; i += step) out.add(i);
    } else if (body.includes("-")) {
      const [aS, bS] = body.split("-");
      const a = parseInt(aS, 10);
      const b = parseInt(bS, 10);
      if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
      for (let i = a; i <= b; i += step) out.add(i);
    } else {
      const n = parseInt(body, 10);
      if (!Number.isFinite(n)) return null;
      out.add(n);
    }
  }
  return { kind: "list", values: [...out].sort((a, b) => a - b) };
}

export function describeCron(cron: string): string {
  if (!cron || typeof cron !== "string") return "Custom — (empty)";
  const trimmed = cron.trim();

  if (PRESET_LABEL[trimmed]) return PRESET_LABEL[trimmed];

  const fields = trimmed.split(/\s+/);
  if (fields.length !== 5) return `Custom — Unrecognized cron format (expected 5 fields)`;

  const [mF, hF, domF, monF, dowF] = fields;
  const minute = parseField(mF,   0, 59);
  const hour   = parseField(hF,   0, 23);
  const dom    = parseField(domF, 1, 31);
  const mon    = parseField(monF, 1, 12);
  const dow    = parseField(dowF, 0, 6);

  if (!minute || !hour || !dom || !mon || !dow) {
    return `Custom — Unparsable cron pattern`;
  }

  let timePhrase: string;
  const minuteIsExact = minute.kind === "list" && minute.values.length === 1;
  const hourIsExact   = hour.kind   === "list" && hour.values.length   === 1;

  if (minuteIsExact && hourIsExact) {
    timePhrase = `at ${pad2(hour.values[0])}:${pad2(minute.values[0])}`;
  } else if (minute.kind === "every" && hour.kind === "any") {
    timePhrase = `every ${minute.step} minute${minute.step !== 1 ? "s" : ""}`;
  } else if (hour.kind === "every" && minuteIsExact) {
    timePhrase = `every ${hour.step} hour${hour.step !== 1 ? "s" : ""} at minute ${minute.values[0]}`;
  } else if (hour.kind === "every") {
    timePhrase = `every ${hour.step} hour${hour.step !== 1 ? "s" : ""}`;
  } else if (minute.kind === "any" && hour.kind === "any") {
    timePhrase = `every minute`;
  } else if (minuteIsExact && hour.kind === "any") {
    timePhrase = `at minute ${minute.values[0]} of every hour`;
  } else if (minute.kind === "any" && hourIsExact) {
    timePhrase = `every minute during hour ${hour.values[0]}`;
  } else {
    const mK = minute.kind as string;
    const hK = hour.kind as string;
    const m = mK === "any"   ? "every minute"
            : mK === "every" ? `every ${(minute as any).step} min`
            : `minute${(minute as any).values.length > 1 ? "s" : ""} ${(minute as any).values.join(",")}`;
    const h = hK === "any"   ? "every hour"
            : hK === "every" ? `every ${(hour as any).step} hr`
            : `hour${(hour as any).values.length > 1 ? "s" : ""} ${(hour as any).values.join(",")}`;
    timePhrase = `${m}, ${h}`;
  }

  const qualifiers: string[] = [];

  if (dow.kind === "list" && dow.values.length > 0 && dow.values.length < 7) {
    qualifiers.push(`on ${dow.values.map((v) => DOW_NAMES[((v % 7) + 7) % 7]).join(", ")}`);
  } else if (dow.kind === "every") {
    qualifiers.push(`every ${dow.step} day${dow.step !== 1 ? "s" : ""} of the week`);
  }

  if (dom.kind === "list") {
    if (dom.values.length === 1) {
      qualifiers.push(`on day ${dom.values[0]} of the month`);
    } else if (dom.values.length > 1) {
      qualifiers.push(`on days ${dom.values.join(", ")} of the month`);
    }
  } else if (dom.kind === "every") {
    qualifiers.push(`every ${dom.step} day${dom.step !== 1 ? "s" : ""} of the month`);
  }

  if (mon.kind === "list" && mon.values.length > 0 && mon.values.length < 12) {
    qualifiers.push(`in ${mon.values.map((v) => MONTH_NAMES[v] ?? v).join(", ")}`);
  } else if (mon.kind === "every") {
    qualifiers.push(`every ${mon.step} month${mon.step !== 1 ? "s" : ""}`);
  }

  const sentence = [timePhrase, ...qualifiers].join(" ");
  return `Custom — ${sentence.charAt(0).toUpperCase()}${sentence.slice(1)}`;
}
