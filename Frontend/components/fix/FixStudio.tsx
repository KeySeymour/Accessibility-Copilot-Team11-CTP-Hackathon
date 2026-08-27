// components/fix/FixStudio.tsx — mockup 2.4 "Fix Studio" + 2.5 "Fix Preview"
//
// The interactive half of the Fix Studio. Issue selection is client-side UI
// state, not a route (see the page comment), so this owns the selected id and
// swaps the right-hand panel between "Issue Details" and "Preview: [Issue] Fix"
// in place.
//
// Layout: three panes on lg (issues 3 / canvas 5 / details 4), stacked below.

"use client";

import { useState } from "react";
import { AlertTriangle, ArrowUpRight, BadgeCheck, ScanEye, Sparkles, Wand2, Wrench } from "lucide-react";
import type { Issue, Severity } from "@/lib/types";
import { Badge, SEVERITY_TONE } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { EmptyState } from "@/components/states/EmptyState";
import { cn } from "@/lib/utils";

const SEVERITY_LABEL: Record<Severity, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

const SEVERITY_ORDER: Severity[] = ["high", "medium", "low"];

export function FixStudio({
  scanId,
  issues,
  score,
  screenshotUrl,
  needsReview = 0,
}: {
  scanId: string;
  issues: Issue[];
  score: number;
  screenshotUrl?: string | null;
  needsReview?: number;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(issues[0]?.id ?? null);
  const [previewing, setPreviewing] = useState(false);
  const [generating, setGenerating] = useState(false);

  const selected = issues.find((issue) => issue.id === selectedId) ?? null;
  // Markers are numbered by position in the full list so the number beside an
  // issue in the sidebar matches the one drawn on the screenshot.
  const markerNumber = new Map(issues.map((issue, i) => [issue.id, i + 1]));

  async function generateFix(issueId: string) {
    setGenerating(true);
    try {
      await fetch(`/api/issues/${issueId}/fix`, { method: "POST" });
      setPreviewing(true);
    } finally {
      setGenerating(false);
    }
  }

  function select(id: string) {
    setSelectedId(id);
    setPreviewing(false); // A new issue starts back at details, not preview.
  }

  if (issues.length === 0) {
    return (
      <EmptyState
        title="No issues found"
        body={
          needsReview > 0
            ? `Nothing failed the automated checks, but ${needsReview} ${needsReview === 1 ? "rule needs" : "rules need"} a human to review. This is an automated check, not a compliance guarantee.`
            : "Nothing failed the automated checks. This is an automated check, not a compliance guarantee."
        }
        actionLabel="Run another scan"
        actionHref="/scans/new"
        icon={BadgeCheck}
        className="max-w-xl"
      />
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      {/* Left — score ring + issue list grouped by severity */}
      <aside className="lg:col-span-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-white/5">
          <div className="flex flex-col items-center">
            <ScoreRing score={score} size={116} />
            <p className="mt-3 text-center text-xs leading-relaxed text-slate-400">
              Automated accessibility score
            </p>
          </div>

          <div className="mt-6 flex flex-col gap-5">
            {SEVERITY_ORDER.map((severity) => {
              const group = issues.filter((issue) => issue.severity === severity);
              if (group.length === 0) return null;

              return (
                <div key={severity}>
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      {SEVERITY_LABEL[severity]}
                    </h3>
                    <Badge tone={SEVERITY_TONE[severity]}>{group.length}</Badge>
                  </div>

                  <ul className="mt-2.5 flex flex-col gap-1.5">
                    {group.map((issue) => {
                      const active = issue.id === selectedId;
                      return (
                        <li key={issue.id}>
                          <button
                            type="button"
                            onClick={() => select(issue.id)}
                            aria-pressed={active}
                            className={cn(
                              "flex w-full min-h-[44px] items-start gap-2 rounded-xl px-3 py-2.5 text-left text-sm transition-colors",
                              active
                                ? "bg-violet-50 font-semibold text-violet-700 dark:bg-violet-500/10 dark:text-violet-300"
                                : "text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-white/5",
                            )}
                          >
                            {issue.box && (
                              <span
                                className={cn(
                                  "mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold",
                                  active ? "bg-violet-600 text-white" : "bg-slate-200 text-slate-600 dark:bg-white/10 dark:text-slate-300",
                                )}
                                aria-hidden="true"
                              >
                                {markerNumber.get(issue.id)}
                              </span>
                            )}
                            <span className="min-w-0 flex-1">{issue.title}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      </aside>

      {/* Center — annotated screenshot with numbered bounding-box markers */}
      <div className="lg:col-span-5">
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/10 dark:border-white/10 dark:bg-white/5">
          {/* Browser-chrome mockup (§8.5) */}
          <div className="flex items-center gap-1.5 border-b border-slate-100 bg-slate-50 px-4 py-3 dark:border-white/10 dark:bg-white/5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-400" aria-hidden="true" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400" aria-hidden="true" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" aria-hidden="true" />
            <span className="ml-2 truncate font-mono text-xs text-slate-400">scan/{scanId}</span>
          </div>

          {/* Screenshot scrolls inside its own frame — a full-page capture is
              usually far taller than it is wide. */}
          <div className="max-h-[70vh] overflow-y-auto bg-slate-50 dark:bg-slate-900/40">
            <div className="relative">
              {screenshotUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- served
                // from our own API route at an unknown intrinsic size; the
                // optimizer adds nothing here.
                <img src={screenshotUrl} alt={`Screenshot of the scanned page`} className="block w-full" />
              ) : (
                <div className="flex aspect-[4/3] items-center justify-center">
                  <ScanEye className="h-8 w-8 text-slate-300 dark:text-slate-700" strokeWidth={2} aria-hidden="true" />
                </div>
              )}

              {/* Numbered bounding-box markers, positioned off issue.box percentages */}
              {issues.map((issue) =>
                issue.box ? (
                  <button
                    key={issue.id}
                    type="button"
                    onClick={() => select(issue.id)}
                    aria-label={`Issue ${markerNumber.get(issue.id)}: ${issue.title}`}
                    className={cn(
                      "absolute rounded transition-colors",
                      issue.id === selectedId
                        ? "border-2 border-violet-600 bg-violet-500/20"
                        : "border-2 border-red-400/70 hover:border-violet-500 hover:bg-violet-500/10",
                    )}
                    style={{
                      left: `${issue.box.x}%`,
                      top: `${issue.box.y}%`,
                      width: `${issue.box.width}%`,
                      height: `${issue.box.height}%`,
                    }}
                  >
                    <span className="absolute -left-2 -top-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-violet-600 text-[10px] font-semibold text-white shadow-sm">
                      {markerNumber.get(issue.id)}
                    </span>
                  </button>
                ) : null,
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Right — Issue Details panel, or the Fix Preview once one is generated */}
      <aside className="lg:col-span-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-white/5">
          {!selected ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">Select an issue to see the details.</p>
          ) : previewing ? (
            <div className="animate-scale-in">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-violet-600 dark:text-violet-400" strokeWidth={2} aria-hidden="true" />
                <h2 className="font-heading text-lg font-semibold tracking-tight text-slate-900 dark:text-white">
                  Preview: {selected.title} fix
                </h2>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 p-4 dark:border-white/10">
                  <Badge tone="fail">Before</Badge>
                  <p className="mt-2.5 font-mono text-xs leading-relaxed text-slate-500">
                    {selected.contrast ? `${selected.contrast.current}:1 contrast` : selected.ruleId}
                  </p>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-500/25 dark:bg-emerald-500/5">
                  <Badge tone="pass">After</Badge>
                  <p className="mt-2.5 font-mono text-xs leading-relaxed text-emerald-700 dark:text-emerald-400">
                    {selected.contrast ? `${selected.contrast.recommended}:1 contrast` : "Passes"}
                  </p>
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-2.5">
                <Button href={`/scans/${scanId}/compare`} size="sm">
                  <BadgeCheck className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                  Apply This Fix
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setPreviewing(false)}>
                  Back to details
                </Button>
              </div>
            </div>
          ) : (
            <div className="animate-fade-in">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={SEVERITY_TONE[selected.severity]}>
                  <AlertTriangle className="h-3 w-3" strokeWidth={2.5} aria-hidden="true" />
                  {SEVERITY_LABEL[selected.severity]}
                </Badge>
                <Badge tone="neutral">{selected.wcagRef}</Badge>
              </div>

              <h2 className="mt-3 font-heading text-lg font-semibold tracking-tight text-slate-900 dark:text-white">
                {selected.title}
              </h2>
              <p className="mt-1 font-mono text-xs text-slate-400">{selected.ruleId}</p>

              {selected.whyItMatters && (
                <div className="mt-5">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Why it matters</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                    {selected.whyItMatters}
                  </p>
                </div>
              )}

              {selected.contrast && (
                <div className="mt-5 flex items-center gap-3">
                  <div className="flex-1 rounded-xl border border-slate-200 p-3 text-center dark:border-white/10">
                    <p className="text-xs text-slate-400">Current</p>
                    <p className="mt-0.5 font-heading text-lg font-semibold tabular-nums text-red-600 dark:text-red-400">
                      {selected.contrast.current}:1
                    </p>
                  </div>
                  <div className="flex-1 rounded-xl border border-slate-200 p-3 text-center dark:border-white/10">
                    <p className="text-xs text-slate-400">Recommended</p>
                    <p className="mt-0.5 font-heading text-lg font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                      {selected.contrast.recommended}:1
                    </p>
                  </div>
                </div>
              )}

              {selected.suggestedFix && (
                <div className="mt-5">
                  <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    <Wrench className="h-3 w-3" strokeWidth={2.5} aria-hidden="true" />
                    Suggested fix
                  </h3>
                  <p className="mt-1.5 rounded-xl bg-slate-50 p-3 font-mono text-xs leading-relaxed text-slate-600 dark:bg-white/5 dark:text-slate-300">
                    {selected.suggestedFix}
                  </p>
                </div>
              )}

              {selected.html && (
                <div className="mt-5">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Element</h3>
                  <pre className="mt-1.5 overflow-x-auto rounded-xl bg-slate-50 p-3 font-mono text-xs leading-relaxed text-slate-600 dark:bg-white/5 dark:text-slate-300">
                    <code>{selected.html}</code>
                  </pre>
                </div>
              )}

              {selected.helpUrl && (
                <a
                  href={selected.helpUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="mt-4 inline-flex items-center gap-1 rounded-lg text-sm font-medium text-violet-600 transition-colors hover:text-violet-700 dark:text-violet-400"
                >
                  Read the full rule
                  <ArrowUpRight className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                </a>
              )}

              <Button
                type="button"
                size="sm"
                className="mt-6 w-full"
                disabled={generating}
                onClick={() => generateFix(selected.id)}
              >
                <Wand2 className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                {generating ? "Generating…" : "Generate fix"}
              </Button>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
