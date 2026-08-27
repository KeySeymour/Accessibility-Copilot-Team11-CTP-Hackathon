// components/states/EmptyState.tsx — mockup section 4 "Empty / Loading States"
// Covers both "No scans yet" and "No issues found" cards; they share the
// same shape (icon, title, body, single action) so one component serves
// both call sites in the dashboard and fix studio.
//
// Branding: soft violet icon tile (§8.2), flat card (§8.3), pill action (§8.1).

import type { LucideIcon } from "lucide-react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

export function EmptyState({
  title,
  body,
  actionLabel,
  actionHref,
  icon: Icon = Sparkles,
  className,
}: {
  title: string;
  body: string;
  actionLabel: string;
  actionHref: string;
  icon?: LucideIcon;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-2xl border border-slate-200 bg-white px-6 py-10 text-center dark:border-white/10 dark:bg-white/5",
        className,
      )}
      role="status"
    >
      <span
        className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400"
        aria-hidden="true"
      >
        <Icon className="h-5 w-5" strokeWidth={2} />
      </span>

      <p className="mt-4 font-heading text-lg font-semibold tracking-tight text-slate-900 dark:text-white">{title}</p>
      <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-slate-500 dark:text-slate-400">{body}</p>

      <Button href={actionHref} size="sm" className="mt-5">
        {actionLabel}
      </Button>
    </div>
  );
}
