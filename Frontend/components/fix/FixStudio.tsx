// components/fix/FixStudio.tsx — mockup 2.4 "Fix Studio" + 2.5 "Fix Preview"
//
// The interactive half of the Fix Studio. Issue selection is client-side UI
// state, not a route (see the page comment), so this owns the selected id and
// swaps the right-hand panel between "Issue Details" and "Preview: [Issue] Fix"
// in place.
//
// Layout: three panes on lg (issues 3 / canvas 5 / details 4), stacked below.

"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, ArrowUpRight, BadgeCheck, Image as ImageIcon, Loader2, Maximize2, ScanEye, Sparkles, Wand2, Wrench } from "lucide-react";
import type { GeneratedFix, Issue, Severity } from "@/lib/types";
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

interface ImprovementReport {
  mode: "verified-dom" | "visual-proposal";
  total: number;
  verified: number;
  remaining: number;
  needsReview: number;
}

export function FixStudio({
  scanId,
  issues,
  score,
  screenshotUrl,
  needsReview = 0,
  initialFixes = {},
  improvedScreenshotUrl,
}: {
  scanId: string;
  issues: Issue[];
  score: number;
  screenshotUrl?: string | null;
  needsReview?: number;
  initialFixes?: Record<string, GeneratedFix>;
  improvedScreenshotUrl: string;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(issues[0]?.id ?? null);
  const [previewing, setPreviewing] = useState(Boolean(issues[0] && initialFixes[issues[0].id]));
  const [generating, setGenerating] = useState(false);
  const [fix, setFix] = useState<GeneratedFix | null>(issues[0] ? initialFixes[issues[0].id] ?? null : null);
  const [fixes, setFixes] = useState<Record<string, GeneratedFix>>(initialFixes);
  const [fixError, setFixError] = useState<string | null>(null);
  const [showImproved, setShowImproved] = useState(Object.keys(initialFixes).length > 0);
  const [generatingAll, setGeneratingAll] = useState(false);
  const [improvedLoading, setImprovedLoading] = useState(true);
  const [improvedImageError, setImprovedImageError] = useState(false);
  const [improvementReport, setImprovementReport] = useState<ImprovementReport | null>(null);

  const selected = issues.find((issue) => issue.id === selectedId) ?? null;
  // Markers are numbered by position in the full list so the number beside an
  // issue in the sidebar matches the one drawn on the screenshot.
  const markerNumber = new Map(issues.map((issue, i) => [issue.id, i + 1]));

  useEffect(() => {
    if (!showImproved) return;
    let cancelled = false;
    void fetch(`/api/scans/${scanId}/improvement-report`, { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((report) => { if (!cancelled && report) setImprovementReport(report as ImprovementReport); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [scanId, showImproved]);

  async function requestFix(issueId: string) {
    setGenerating(true);
    setFixError(null);
    try {
      const res = await fetch(`/api/issues/${issueId}/fix`, { method: "POST" });
      const body = await res.json().catch(() => null);

      if (!res.ok) {
        // The route returns plain-language messages (missing key, model error)
        // that are meant to be shown as-is.
        setFixError(body?.error ?? "We couldn't generate a fix for this one.");
        return;
      }

      setFix(body as GeneratedFix);
      setFixes((current) => ({ ...current, [issueId]: body as GeneratedFix }));
      setPreviewing(true);
      setShowImproved(true);
    } catch {
      setFixError("We couldn't reach the server. Please try again.");
    } finally {
      setGenerating(false);
    }
  }

  function select(id: string) {
    setSelectedId(id);
    const existing = fixes[id] ?? null;
    setPreviewing(Boolean(existing));
    setFix(existing);
    setFixError(null);
  }

  async function generateAllFixes() {
    setGeneratingAll(true);
    setFixError(null);
    try {
      const entries = await Promise.all(
        issues.map(async (issue) => {
          const res = await fetch(`/api/issues/${issue.id}/fix`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            // A batch must be fast and quota-independent. Individual fixes can
            // still use Gemini when it is available.
            body: JSON.stringify({ preferLocal: true }),
          });
          const body = await res.json().catch(() => null);
          if (!res.ok) throw new Error(body?.error ?? `Could not fix ${issue.title}.`);
          return [issue.id, body as GeneratedFix] as const;
        }),
      );
      const all = Object.fromEntries(entries);
      setFixes(all);
      if (selectedId && all[selectedId]) {
        setFix(all[selectedId]);
        setPreviewing(true);
      }
      setShowImproved(true);
    } catch (error) {
      setFixError(error instanceof Error ? error.message : "We couldn't build the improved preview.");
    } finally {
      setGeneratingAll(false);
    }
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
            <div className="ml-auto flex rounded-lg border border-slate-200 bg-white p-0.5 dark:border-white/10 dark:bg-slate-900">
              <button type="button" onClick={() => setShowImproved(false)} className={cn("rounded-md px-2 py-1 text-[11px] font-medium", !showImproved ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900" : "text-slate-500")}>Original</button>
              <button type="button" onClick={() => setShowImproved(true)} className={cn("rounded-md px-2 py-1 text-[11px] font-medium", showImproved ? "bg-violet-600 text-white" : "text-slate-500")}>Improved</button>
            </div>
          </div>

          {/* Screenshot scrolls inside its own frame — a full-page capture is
              usually far taller than it is wide. */}
          {showImproved ? (
            <div className="relative min-h-64 max-h-[70vh] overflow-y-auto bg-slate-50 dark:bg-slate-900/40">
              {improvedLoading && !improvedImageError && (
                <div className="absolute inset-x-0 top-0 z-10 flex min-h-64 flex-col items-center justify-center gap-3 bg-slate-50/95 px-6 text-center dark:bg-slate-900/95">
                  <Loader2 className="h-7 w-7 animate-spin text-violet-600" strokeWidth={2} aria-hidden="true" />
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">Creating the professional redesign…</p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">The first preview may take up to a minute. Future views load from the saved result.</p>
                  </div>
                </div>
              )}
              {improvedImageError && (
                <div role="alert" className="flex min-h-64 flex-col items-center justify-center px-6 text-center">
                  <AlertTriangle className="h-7 w-7 text-amber-500" strokeWidth={2} aria-hidden="true" />
                  <p className="mt-3 text-sm font-semibold text-slate-900 dark:text-white">The improved image could not be rendered.</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Return to Original, then try the improved preview again.</p>
                </div>
              )}
              {/* This is captured from a browser after the fixes are applied to
                  the real page DOM, rather than a gallery of disconnected HTML. */}
              <a href={improvedScreenshotUrl} target="_blank" rel="noreferrer" aria-label="Open the improved image at full resolution">
                {/* eslint-disable-next-line @next/next/no-img-element -- generated artifact has dynamic dimensions. */}
                <img
                  src={improvedScreenshotUrl}
                  alt="Full-page preview after applying the recommended accessibility improvements"
                  className={cn("block w-full cursor-zoom-in transition-opacity", improvedLoading && "opacity-0")}
                  onLoad={() => { setImprovedLoading(false); setImprovedImageError(false); }}
                  onError={() => { setImprovedLoading(false); setImprovedImageError(true); }}
                />
              </a>
            </div>
          ) : <div className="max-h-[70vh] overflow-y-auto bg-slate-50 dark:bg-slate-900/40">
            <div className="relative">
              {screenshotUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- local API artifact has unknown intrinsic dimensions.
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
          </div>}
        </div>
        <Button type="button" variant="outline" size="sm" className="mt-3 w-full" onClick={generateAllFixes} disabled={generatingAll}>
          <ImageIcon className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
          {generatingAll ? "Refreshing recommendations…" : `Refresh all ${issues.length} recommendations`}
        </Button>
        {showImproved && (
          <>
            {improvementReport && (
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs dark:border-white/10 dark:bg-white/5">
                {improvementReport.mode === "verified-dom" ? (
                  <>
                    <Badge tone="pass">{improvementReport.verified} axe verified</Badge>
                    {improvementReport.remaining > 0 && <Badge tone="fail">{improvementReport.remaining} remaining</Badge>}
                    {improvementReport.needsReview > 0 && <Badge tone="warn">{improvementReport.needsReview} manual review</Badge>}
                  </>
                ) : (
                  <Badge tone="warn">Visual proposal · manual verification required</Badge>
                )}
              </div>
            )}
            <a href={improvedScreenshotUrl} target="_blank" rel="noreferrer" className="mt-2 flex min-h-[44px] items-center justify-center gap-2 rounded-full text-sm font-medium text-violet-700 hover:bg-violet-50 dark:text-violet-300 dark:hover:bg-violet-500/10">
              <Maximize2 className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
              Open full-size improved image
            </a>
          </>
        )}
      </div>

      {/* Right — Issue Details panel, or the Fix Preview once one is generated */}
      <aside className="lg:col-span-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-white/5">
          {!selected ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">Select an issue to see the details.</p>
          ) : previewing && fix ? (
            <div className="animate-scale-in">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-violet-600 dark:text-violet-400" strokeWidth={2} aria-hidden="true" />
                <h2 className="font-heading text-lg font-semibold tracking-tight text-slate-900 dark:text-white">
                  Preview: {selected.title} fix
                </h2>
              </div>

              <p className="mt-2.5 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{fix.explanation}</p>
              <Badge tone={fix.source === "gemini" ? "info" : "pass"}>
                {fix.source === "gemini" ? "Gemini-assisted" : "Local fallback — no quota needed"}
              </Badge>

              <div className="mt-5 flex flex-col gap-4">
                <div className="rounded-xl border border-slate-200 p-4 dark:border-white/10">
                  <Badge tone="fail">Before</Badge>
                  {selected.html ? (
                    <pre className="mt-2.5 overflow-x-auto font-mono text-xs leading-relaxed text-slate-500"><code>{fix.before}</code></pre>
                  ) : (
                    <p className="mt-2.5 text-sm leading-relaxed text-slate-500">Original detected region in the uploaded screenshot.</p>
                  )}
                </div>

                <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-500/25 dark:bg-emerald-500/5">
                  <Badge tone="pass">After</Badge>
                  {selected.html ? (
                    <pre className="mt-2.5 overflow-x-auto font-mono text-xs leading-relaxed text-emerald-700 dark:text-emerald-400"><code>{fix.after}</code></pre>
                  ) : (
                    <p className="mt-2.5 text-sm font-medium leading-relaxed text-emerald-700 dark:text-emerald-400">Applied visually in the improved design.</p>
                  )}
                </div>

                {fix.patch && (
                  <div className="rounded-xl bg-slate-50 p-4 dark:bg-white/5">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Change</h3>
                    <pre className="mt-1.5 overflow-x-auto font-mono text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                      <code>{fix.patch}</code>
                    </pre>
                  </div>
                )}

                {/* Generated fixes need a human check before they're trusted —
                    the model says here what it couldn't verify itself. */}
                {fix.caveat && (
                  <div className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-500/25 dark:bg-amber-500/5">
                    <AlertTriangle
                      className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400"
                      strokeWidth={2}
                      aria-hidden="true"
                    />
                    <p className="text-xs leading-relaxed text-amber-800 dark:text-amber-300">{fix.caveat}</p>
                  </div>
                )}
              </div>

              <div className="mt-6 flex flex-col gap-2.5">
                <Button type="button" size="sm" onClick={() => setShowImproved(true)}>
                  <BadgeCheck className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                  View in improved webpage
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
                {/* An AI finding is a suggestion, not a measured rule violation.
                    Saying so is the honest thing and keeps the two kinds of
                    result from looking equally authoritative. */}
                {selected.source === "ai" && (
                  <Badge tone="info">
                    <Sparkles className="h-3 w-3" strokeWidth={2.5} aria-hidden="true" />
                    AI suggestion
                  </Badge>
                )}
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
                onClick={() => requestFix(selected.id)}
              >
                <Wand2 className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                {generating ? "Generating…" : "Generate fix"}
              </Button>
              {fixError && (
                <p role="alert" className="mt-3 text-xs leading-relaxed text-red-600 dark:text-red-400">
                  {fixError}
                </p>
              )}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
