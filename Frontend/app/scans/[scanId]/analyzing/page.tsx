// app/scans/[scanId]/analyzing/page.tsx — mockup 2.3 "Analysis Progress"
//
// Shows the circular progress ring + step checklist (Understanding
// layout / Detecting elements / Checking contrast / Validating issues /
// Calculating score) while the render → axe → AI → merge job chain runs.
//
// This page polls GET /api/scans/[scanId] for status. When status flips
// to "complete" it redirects to /scans/[scanId]/fix. On "failed" it
// renders the section-4 error state ("Something went wrong").

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Contrast, Gauge, Loader2, ScanEye, ShieldCheck, Type } from "lucide-react";
import { TopNav } from "@/components/layout/TopNav";
import { ErrorState } from "@/components/states/ErrorState";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { cn } from "@/lib/utils";

type ScanStatus = "queued" | "rendering" | "analyzing" | "complete" | "failed";

// The checklist from the mockup. Each step lights up once the job chain has
// passed the status it maps to, so progress is derived from the poll rather
// than faked on a timer.
const STEPS = [
  { label: "Understanding layout", icon: ScanEye, after: "rendering" },
  { label: "Detecting elements", icon: Type, after: "rendering" },
  { label: "Checking contrast", icon: Contrast, after: "analyzing" },
  { label: "Validating issues", icon: ShieldCheck, after: "analyzing" },
  { label: "Calculating score", icon: Gauge, after: "complete" },
] as const;

const ORDER: ScanStatus[] = ["queued", "rendering", "analyzing", "complete"];

export default function AnalyzingPage({ params }: { params: { scanId: string } }) {
  const router = useRouter();
  const [status, setStatus] = useState<ScanStatus>("queued");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/scans/${params.scanId}`, { cache: "no-store" });

        if (res.status === 404) {
          clearInterval(interval);
          setError("We couldn't find that scan. It may have been removed.");
          setStatus("failed");
          return;
        }

        const scan = await res.json();
        setStatus(scan.status);

        if (scan.status === "complete") {
          clearInterval(interval);
          router.push(`/scans/${params.scanId}/fix`);
        } else if (scan.status === "failed") {
          clearInterval(interval);
          // The runner writes a user-facing reason onto the scan row.
          setError(scan.error ?? null);
        }
      } catch {
        // A dropped poll is usually transient — keep polling rather than
        // failing the whole page on one bad request.
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [params.scanId, router]);

  if (status === "failed") {
    return (
      <section aria-labelledby="analyzing-heading">
        <TopNav currentLabel="Analyze" scanId={params.scanId} />
        <h1 id="analyzing-heading" className="sr-only">
          Analysis failed
        </h1>
        <ErrorState
          title="Something went wrong"
          body={error ?? "We couldn't finish analyzing this page. Please try again."}
          actionLabel="Try Again"
          actionHref="/scans/new"
          className="max-w-xl"
        />
      </section>
    );
  }

  const reached = Math.max(0, ORDER.indexOf(status));
  const progress = Math.round((reached / (ORDER.length - 1)) * 100);

  return (
    <section aria-labelledby="analyzing-heading" className="animate-fade-up">
      <TopNav currentLabel="Analyze" scanId={params.scanId} />

      <Eyebrow>Analyzing</Eyebrow>
      <h1
        id="analyzing-heading"
        className="mt-2 font-heading text-3xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-4xl"
      >
        Checking your page…
      </h1>
      <p className="mt-2 max-w-2xl text-lg leading-relaxed text-slate-600 dark:text-slate-400">
        This usually takes a few seconds. We&apos;ll take you to the results automatically.
      </p>

      <div className="mt-8 flex max-w-3xl flex-col items-center gap-8 rounded-2xl border border-slate-200 bg-white p-7 dark:border-white/10 dark:bg-white/5 sm:flex-row sm:items-center sm:gap-10">
        <ScoreRing score={progress} size={132} label="Analysis progress" />

        <div className="min-w-0 flex-1">
          {/* Progress ring + step checklist keyed off `status` */}
          <ol className="flex flex-col gap-3">
            {STEPS.map((step, i) => {
              const stepIndex = ORDER.indexOf(step.after as ScanStatus);
              const done = reached >= stepIndex;
              const active = !done && i === STEPS.findIndex((s) => ORDER.indexOf(s.after as ScanStatus) > reached);

              return (
                <li key={step.label} className="flex items-center gap-2.5">
                  <span
                    className={cn(
                      "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors",
                      done && "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
                      active && "bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400",
                      !done && !active && "bg-slate-100 text-slate-400 dark:bg-white/5 dark:text-slate-600",
                    )}
                    aria-hidden="true"
                  >
                    {done ? (
                      <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                    ) : active ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2.5} />
                    ) : (
                      <step.icon className="h-3.5 w-3.5" strokeWidth={2} />
                    )}
                  </span>

                  <span
                    className={cn(
                      "text-sm transition-colors",
                      done
                        ? "font-medium text-slate-900 dark:text-white"
                        : active
                          ? "font-medium text-violet-700 dark:text-violet-300"
                          : "text-slate-400 dark:text-slate-500",
                    )}
                  >
                    {step.label}
                  </span>
                </li>
              );
            })}
          </ol>

          {/* Single live region so screen readers hear one status update, not five */}
          <p role="status" className="mt-5 font-mono text-xs uppercase tracking-wider text-slate-400">
            Current step: {status}
          </p>
        </div>
      </div>
    </section>
  );
}
