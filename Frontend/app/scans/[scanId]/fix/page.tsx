// app/scans/[scanId]/fix/page.tsx — mockup 2.4 "Fix Studio (Main Workspace)"
//   + 2.5 "Fix Preview"
//
// Three-pane layout:
//   left   — thumbnail, score ring, issue list (High/Medium/Low)
//   center — annotated screenshot with numbered bounding-box markers
//   right  — Issue Details panel (why it matters, WCAG ref, current vs.
//            recommended contrast, "Suggested Fix") which, once a fix is
//            generated, becomes the "Preview: [Issue] Fix" before/after
//            panel with "Apply This Fix".
//
// Data: lib/db listIssues() — the normalized axe results the runner stored.
// Actions: POST /api/issues/[issueId]/fix generates + previews a fix;
// applying it triggers the re-analyze flow (see /compare).
//
// Issue selection state (which marker/issue is active) is client-side
// UI state, not a separate route — matches the mockup, where the panel
// swaps in place rather than navigating. That lives in <FixStudio />;
// this server component only fetches.

import { notFound, redirect } from "next/navigation";
import { TopNav } from "@/components/layout/TopNav";
import { FixStudio } from "@/components/fix/FixStudio";
import { ErrorState } from "@/components/states/ErrorState";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { getScan, listIssues } from "@/lib/db";
import { hostOf } from "@/lib/format";
import { generateLocalFix, sanitizeFixMarkup } from "@/lib/scan/local-fix";
import type { Issue } from "@/lib/types";

export const dynamic = "force-dynamic";

function groupPageLevelIssues(issues: Issue[]): Issue[] {
  let includedRegion = false;
  return issues.flatMap((issue) => {
    if (issue.ruleId !== "region") return [issue];
    if (includedRegion) return [];
    includedRegion = true;
    return [{
      ...issue,
      title: "Page content needs clear landmark regions",
      suggestedFix: "Place primary content inside one <main> landmark and navigation groups inside clearly named <nav> landmarks.",
      target: undefined,
      html: undefined,
      box: undefined,
    }];
  });
}

// KNOWN LIMIT: notFound() below renders the 404 page correctly but the response
// still carries a 200, because Next 14 has already begun streaming this dynamic
// route by the time the status would be set. Users see the right page; crawlers
// and uptime monitors see the wrong status. Tracked upstream in the App Router.

export default async function FixStudioPage({ params }: { params: Promise<{ scanId: string }> }) {
  const { scanId } = await params;
  const scan = getScan(scanId);
  if (!scan) notFound();

  // Landing here before the pipeline has finished (a bookmarked URL, a manual
  // navigation) sends the user back to the progress page rather than showing
  // an empty studio that looks like a clean bill of health.
  if (scan.status !== "complete" && scan.status !== "failed") {
    redirect(`/scans/${scan.id}/analyzing`);
  }

  if (scan.status === "failed") {
    return (
      <section aria-labelledby="fix-studio-heading">
        <TopNav currentLabel="Detect issues" scanId={scan.id} />
        <h1 id="fix-studio-heading" className="sr-only">
          Scan failed
        </h1>
        <ErrorState
          title="Something went wrong"
          body={scan.error ?? "We couldn't finish checking that page."}
          actionLabel="Try Again"
          actionHref="/scans/new"
          className="max-w-xl"
        />
      </section>
    );
  }

  // Older saved scans contain one `region` row per descendant. Group them at
  // read time too, so users immediately get the improved result without
  // having to rerun a scan after this fix.
  const issues = groupPageLevelIssues(listIssues(scan.id));
  const initialFixes = Object.fromEntries(
    issues.map((issue) => {
      const fix = issue.fix ?? generateLocalFix(issue);
      return [issue.id, { ...fix, before: issue.html ?? null, after: sanitizeFixMarkup(fix.after) }];
    }),
  );

  return (
    <section aria-labelledby="fix-studio-heading" className="animate-fade-up">
      <TopNav currentLabel="Fix & Preview" scanId={scan.id} />

      <div className="mb-8">
        <Eyebrow>Fix Studio</Eyebrow>
        <h1
          id="fix-studio-heading"
          className="mt-2 font-heading text-3xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-4xl"
        >
          {issues.length > 0
            ? `${issues.length} ${issues.length === 1 ? "issue" : "issues"} to review`
            : "Review your results"}
        </h1>
        <p className="mt-2 max-w-2xl text-lg leading-relaxed text-slate-600 dark:text-slate-400">
          <span className="font-mono text-base text-slate-500">{hostOf(scan.url)}</span> — pick an issue to see what it
          means, why it matters, and how to fix it.
        </p>
      </div>

      {/* keyed by scan id so navigating from one scan's Fix Studio to another
          remounts it. Without the key React reuses the component (same route,
          different param) and keeps the previous scan's selected issue and
          generated fix — which reads as "Generate fix doesn't update". */}
      <FixStudio
        key={scan.id}
        scanId={scan.id}
        issues={issues}
        score={scan.score ?? 0}
        screenshotUrl={scan.hasScreenshot ? `/api/scans/${scan.id}/screenshot` : null}
        needsReview={scan.needsReview}
        initialFixes={initialFixes}
        improvedScreenshotUrl={`/api/scans/${scan.id}/improved-screenshot`}
      />
    </section>
  );
}
