// components/ui/StatTile.tsx — mockup 2.1 dashboard stat tiles
//
// Flat card (§8.3) + soft violet icon tile (§8.2). The value uses tabular
// figures so a row of tiles doesn't jitter as numbers change.

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatTile({
  label,
  value,
  hint,
  icon: Icon,
  tone = "brand",
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  tone?: "brand" | "pass" | "fail" | "warn";
}) {
  const toneClasses = {
    brand: "bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400",
    pass: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
    fail: "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400",
    warn: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
  }[tone];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-white/5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
        <span className={cn("inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", toneClasses)}>
          <Icon className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
        </span>
      </div>

      <p className="mt-4 font-heading text-3xl font-semibold tabular-nums tracking-tight text-slate-900 dark:text-white">
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}
