// components/states/ErrorState.tsx — mockup section 4 "Something went wrong"
// Used both as a route-level error.tsx boundary (pass onAction = reset)
// and as an inline state when a poll returns status "failed"
// (pass actionHref to send the user back to /scans/new).
//
// Branding: red-500 status tone (§2.1) on a flat card; the copy stays
// plain-language and human (§1 Voice).

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

export function ErrorState({
  title,
  body,
  actionLabel,
  actionHref,
  onAction,
  className,
}: {
  title: string;
  body: string;
  actionLabel: string;
  actionHref?: string;
  onAction?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-2xl border border-red-200 bg-red-50/60 px-6 py-10 text-center dark:border-red-500/25 dark:bg-red-500/5",
        className,
      )}
      role="alert"
    >
      <span
        className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400"
        aria-hidden="true"
      >
        <AlertTriangle className="h-5 w-5" strokeWidth={2} />
      </span>

      <p className="mt-4 font-heading text-lg font-semibold tracking-tight text-red-700 dark:text-red-300">{title}</p>
      <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-red-600/80 dark:text-red-300/70">{body}</p>

      {onAction ? (
        <Button type="button" onClick={onAction} size="sm" className="mt-5">
          {actionLabel}
        </Button>
      ) : (
        <Button href={actionHref ?? "/scans/new"} size="sm" className="mt-5">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
