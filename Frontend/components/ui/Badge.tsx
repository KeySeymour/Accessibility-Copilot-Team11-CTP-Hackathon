// components/ui/Badge.tsx — branding §8.4
//
// px-2.5 py-1 rounded-full text-xs font-semibold, in the pass / fail /
// warn / info tones. Severity levels map onto the same three status
// colors so "high" reads as fail, "medium" as warn, "low" as info.

import { cn } from "@/lib/utils";

export type BadgeTone = "pass" | "fail" | "warn" | "info" | "neutral";

const TONES: Record<BadgeTone, string> = {
  pass: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
  fail: "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400",
  warn: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  info: "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300",
  neutral: "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300",
};

export const SEVERITY_TONE = {
  high: "fail",
  medium: "warn",
  low: "info",
} as const satisfies Record<string, BadgeTone>;

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: BadgeTone;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold", TONES[tone], className)}>
      {children}
    </span>
  );
}
