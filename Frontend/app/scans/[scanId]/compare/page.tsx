// app/scans/[scanId]/compare/page.tsx
//   — mockup 2.6 "Re-analyze", 2.7 "Results Comparison", 2.8 "Updated Results"
//
// `scanId` here is the ORIGINAL scan. "Re-analyze" (2.6) triggers
// POST /api/scans/[scanId]/reanalyze, which the backend fulfils by
// creating a new scan row with parent_scan_id = scanId (see the schema
// from the merge-logic writeup) and running the full pipeline again
// against the live, patched page.
//
// Once that child scan completes, this page renders the before/after
// score rings (2.7) and the per-issue Fixed/Remaining breakdown (2.8),
// reading both the parent and child scan by id — never mutating the
// original score in place, so the "58 -> 86" comparison is two real,
// independently computed scans sitting side by side.

import { notFound } from "next/navigation";
import { ArrowRight, BadgeCheck, RefreshCw, ShieldAlert, TrendingDown, TrendingUp } from "lucide-react";
import { TopNav } from "@/components/layout/TopNav";
import { ReanalyzeButton } from "@/components/fix/ReanalyzeButton";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { getChildScan, getScan, listIssues } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Reads the parent scan and its most recent re-analysis as two independent
 * rows — the original score is never mutated, so "58 → 86" is a real
 * before/after rather than a remembered number.
 *
 * An issue counts as fixed when its rule no longer fails on the same element
 * in the child scan. Keying on ruleId + target rather than issue id matters:
 * the child scan produces entirely new issue rows, so ids never match.
 */
function buildComparison(scanId: string) {
  const parent = getScan(scanId);
  if (!parent) return null;

  const before = listIssues(parent.id);
  const child = getChildScan(parent.id);
  const childDone = child?.status === "complete";
  const after = childDone ? listIssues(child.id) : [];

  const stillFailing = new Set(after.map((issue) => `${issue.ruleId}::${issue.target ?? ""}`));

  return {
    parent,
    child: childDone ? child : null,
    // A re-analysis that's still running, so the page can say so rather than
    // offering to start another one.
    childPending: child && !childDone ? child : null,
    before: { score: parent.score ?? 0, issueCount: before.length },
    after: childDone ? { score: child!.score ?? 0, issueCount: after.length } : null,
    issues: before.map((issue) => ({
      key: issue.id,
      ruleId: issue.ruleId,
      title: issue.title,
      status: stillFailing.has(`${issue.ruleId}::${issue.target ?? ""}`)
        ? ("remaining" as const)
        : ("fixed" as const),
    })),
  };
}

export default async function ComparePage({ params }: { params: Promise<{ scanId: string }> }) {
  const { scanId } = await params;
  const comparison = buildComparison(scanId);
  if (!comparison) notFound();

  return (
    <section aria-labelledby="compare-heading" className="animate-fade-up">
      <TopNav currentLabel="Compare" scanId={scanId} />

      <Eyebrow>Verify</Eyebrow>
      <h1
        id="compare-heading"
        className="mt-2 font-heading text-3xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-4xl"
      >
        Results Comparison
      </h1>
      <p className="mt-2 max-w-2xl text-lg leading-relaxed text-slate-600 dark:text-slate-400">
        A fix isn&apos;t done until it&apos;s verified. We re-run the full check against the patched page.
      </p>

      {!comparison.after ? (
        <div className="mt-8 max-w-xl rounded-2xl border border-slate-200 bg-white p-7 dark:border-white/10 dark:bg-white/5">
          <span
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white"
            aria-hidden="true"
          >
            <RefreshCw className="h-5 w-5" strokeWidth={2} />
          </span>

          <h2 className="mt-4 font-heading text-lg font-semibold tracking-tight text-slate-900 dark:text-white">
            {comparison.childPending ? "Re-analysis in progress" : "Ready to re-analyze"}
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
            {comparison.childPending
              ? "We're checking the page again now. This takes a few seconds."
              : "We'll re-check the page with the applied fixes. Your original scan stays untouched, so you can compare the two side by side."}
          </p>

          {/* Submits to POST /api/scans/[scanId]/reanalyze, then polls
              the returned child scanId the same way /analyzing does */}
          {comparison.childPending ? (
            <Button href={`/scans/${comparison.childPending.id}/analyzing`} size="sm" className="mt-6">
              <RefreshCw className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
              View progress
            </Button>
          ) : (
            <ReanalyzeButton scanId={scanId} className="mt-6" />
          )}
        </div>
      ) : (
        <>
          {/* 2.7 Before / after score rings */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-8 rounded-2xl border border-slate-200 bg-white p-7 dark:border-white/10 dark:bg-white/5 sm:gap-12">
            <div className="flex flex-col items-center">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Before</p>
              <ScoreRing score={comparison.before.score} size={120} label="Score before fixes" className="mt-3" />
            </div>

            <div className="flex flex-col items-center gap-2">
              <ArrowRight className="h-5 w-5 text-slate-300 dark:text-slate-600" strokeWidth={2} aria-hidden="true" />
              {/* A re-analysis can score worse — say so plainly rather than
                  rendering "+-4 improvement". */}
              {(() => {
                const delta = comparison.after.score - comparison.before.score;
                if (delta > 0) {
                  return (
                    <Badge tone="pass">
                      <TrendingUp className="h-3 w-3" strokeWidth={2.5} aria-hidden="true" />+{delta} improvement
                    </Badge>
                  );
                }
                if (delta < 0) {
                  return (
                    <Badge tone="fail">
                      <TrendingDown className="h-3 w-3" strokeWidth={2.5} aria-hidden="true" />
                      {delta} lower
                    </Badge>
                  );
                }
                return <Badge tone="neutral">No change</Badge>;
              })()}
            </div>

            <div className="flex flex-col items-center">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">After</p>
              <ScoreRing score={comparison.after.score} size={120} label="Score after fixes" className="mt-3" />
            </div>
          </div>

          {/* 2.8 Per-issue Fixed / Remaining breakdown */}
          <div className="mt-6 max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-white/5">
            <h2 className="font-heading text-lg font-semibold tracking-tight text-slate-900 dark:text-white">
              What changed
            </h2>

            <ul className="mt-5 flex flex-col gap-2">
              {comparison.issues.map((issue) => (
                <li
                  key={issue.key}
                  className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 px-4 py-3 dark:border-white/10"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{issue.title}</p>
                    <p className="mt-0.5 font-mono text-xs text-slate-400">{issue.ruleId}</p>
                  </div>

                  {issue.status === "fixed" ? (
                    <Badge tone="pass">
                      <BadgeCheck className="h-3 w-3" strokeWidth={2.5} aria-hidden="true" />
                      Fixed
                    </Badge>
                  ) : (
                    <Badge tone="warn">
                      <ShieldAlert className="h-3 w-3" strokeWidth={2.5} aria-hidden="true" />
                      Remaining
                    </Badge>
                  )}
                </li>
              ))}
            </ul>

            <p className="mt-5 text-xs leading-relaxed text-slate-400">
              Scores are automated accessibility scores, not a guarantee of compliance.
            </p>
          </div>
        </>
      )}
    </section>
  );
}
