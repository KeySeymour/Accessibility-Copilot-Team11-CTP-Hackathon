// lib/format.ts — display helpers shared by the dashboard and history lists.

/** "https://example.com/pricing?x=1" → "example.com/pricing" */
export function hostOf(url: string): string {
  try {
    const u = new URL(url);
    const path = u.pathname === "/" ? "" : u.pathname;
    return `${u.host}${path}`;
  } catch {
    return url;
  }
}

const UNITS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ["second", 60],
  ["minute", 60],
  ["hour", 24],
  ["day", 7],
  ["week", 4.35],
  ["month", 12],
  ["year", Infinity],
];

/**
 * Relative timestamp ("3 minutes ago"). Rendered on the server, so a page
 * that sits open will drift until it revalidates — acceptable for a list where
 * the exact second doesn't matter, and it keeps these rows server-only.
 */
export function formatWhen(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";

  let delta = (then - Date.now()) / 1000;

  for (const [unit, step] of UNITS) {
    if (Math.abs(delta) < step) {
      return new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(Math.round(delta), unit);
    }
    delta /= step;
  }

  return "";
}
