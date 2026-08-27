// components/layout/TopNav.tsx
//
// Renders the "MVP 1 CORE FLOW" breadcrumb from the mockup header:
// Upload → Analyze → Detect issues → Understand → Fix & Preview → Re-analyze → Compare
//
// Pass the current step's label and, once a scan exists, its id, so each
// crumb links to the right place instead of being purely decorative.
//
// Layout is the branding package's flow-chip pattern (§5.3):
// `flex flex-wrap items-center gap-x-2 gap-y-2` with pill chips (§6).
// Steps before the current one are complete and clickable; steps after it
// are not yet reachable, so they render as plain text rather than links.

import Link from "next/link";
import { Check, ChevronRight } from "lucide-react";
import { CORE_FLOW } from "@/lib/nav-config";
import { cn } from "@/lib/utils";

export function TopNav({ currentLabel, scanId }: { currentLabel: string; scanId?: string }) {
  const currentIndex = CORE_FLOW.findIndex((step) => step.label === currentLabel);

  return (
    <nav aria-label="Workflow progress" className="mb-8">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-2">
        {CORE_FLOW.map((step, i) => {
          const isCurrent = i === currentIndex;
          const isComplete = currentIndex > -1 && i < currentIndex;
          // Every step after Upload needs a scan to link to.
          const reachable = isComplete && (i === 0 || Boolean(scanId));

          const chip = (
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                isCurrent && "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-sm",
                isComplete && "bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300",
                !isCurrent && !isComplete && "bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-500",
                reachable && "hover:bg-violet-100 dark:hover:bg-violet-500/20",
              )}
            >
              {isComplete && <Check className="h-3 w-3" strokeWidth={2.5} aria-hidden="true" />}
              {step.label}
            </span>
          );

          return (
            <li key={step.label} className="flex items-center gap-2">
              {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-slate-300 dark:text-slate-600" aria-hidden="true" />}
              {reachable ? (
                <Link href={step.buildHref(scanId)} className="rounded-full">
                  {chip}
                </Link>
              ) : (
                <span aria-current={isCurrent ? "step" : undefined}>{chip}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
