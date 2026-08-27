// app/help/page.tsx — sidebar "Help" item (mockup section 5).
//
// Explains the product in the brand's own terms: the north-star lifecycle
// (branding §1) and the core principles, plus the accessibility note about
// what the score does and doesn't mean (§13).

import { Code2, Eye, PenTool, RefreshCw, Rocket, ScanEye, ShieldCheck, Users, Wrench, type LucideIcon } from "lucide-react";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Button } from "@/components/ui/Button";

const LIFECYCLE: Array<{ label: string; body: string; icon: LucideIcon }> = [
  { label: "Design", body: "Catch issues in the mockup, before anyone writes code.", icon: PenTool },
  { label: "Fix", body: "Get a concrete suggested change, not just a rule number.", icon: Wrench },
  { label: "Build", body: "Apply the fix in your codebase with the context intact.", icon: Code2 },
  { label: "Verify", body: "Re-run the full check and confirm the score actually moved.", icon: ShieldCheck },
  { label: "Ship", body: "Ship knowing what improved and what's still open.", icon: Rocket },
  { label: "Monitor", body: "Keep checking as the product changes. Accessibility isn't one-time.", icon: Users },
];

const PRINCIPLES: Array<{ label: string; body: string; icon: LucideIcon }> = [
  { label: "Visual first", body: "See the problem on the page, highlighted where it happens.", icon: Eye },
  { label: "Plain language first", body: "No jargon. We explain what's wrong and who it affects.", icon: ScanEye },
  { label: "Fix, not just report", body: "Every issue comes with a suggested fix you can apply.", icon: Wrench },
  { label: "Verify improvement", body: "We re-check after the fix so you know it worked.", icon: RefreshCw },
  { label: "Continuous accessibility", body: "Scan again as the design evolves.", icon: Users },
];

export default function HelpPage() {
  return (
    <section aria-labelledby="help-heading" className="animate-fade-up">
      <Eyebrow>Help</Eyebrow>
      <h1
        id="help-heading"
        className="mt-2 font-heading text-3xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-4xl"
      >
        How Accessibility Copilot works
      </h1>
      <p className="mt-2 max-w-2xl text-lg leading-relaxed text-slate-600 dark:text-slate-400">
        See it → Understand it → Fix it → Verify it → Keep it fixed.
      </p>

      <Button href="/scans/new" className="mt-6">
        <ScanEye className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
        Run a scan
      </Button>

      <div className="mt-14">
        <Eyebrow>The lifecycle</Eyebrow>
        <h2 className="mt-2 font-heading text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
          Where Copilot fits
        </h2>

        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {LIFECYCLE.map((step, i) => (
            <div
              key={step.label}
              className="rounded-2xl border border-slate-200 bg-white p-6 transition-all hover:border-violet-300 hover:shadow-lg hover:shadow-violet-500/5 dark:border-white/10 dark:bg-white/5 dark:hover:border-violet-500/40"
            >
              <div className="flex items-center gap-2.5">
                <span
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white"
                  aria-hidden="true"
                >
                  <step.icon className="h-5 w-5" strokeWidth={2} />
                </span>
                <span className="font-mono text-xs text-slate-400">{String(i + 1).padStart(2, "0")}</span>
              </div>

              <h3 className="mt-4 font-heading text-lg font-semibold tracking-tight text-slate-900 dark:text-white">
                {step.label}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{step.body}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-14">
        <Eyebrow>Principles</Eyebrow>
        <h2 className="mt-2 font-heading text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
          What we always do
        </h2>

        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {PRINCIPLES.map((principle) => (
            <div
              key={principle.label}
              className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-white/5"
            >
              <span
                className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400"
                aria-hidden="true"
              >
                <principle.icon className="h-5 w-5" strokeWidth={2} />
              </span>
              <h3 className="mt-4 font-heading text-lg font-semibold tracking-tight text-slate-900 dark:text-white">
                {principle.label}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{principle.body}</p>
            </div>
          ))}
        </div>
      </div>

      {/* §13 — never claim compliance */}
      <div className="mt-14 max-w-3xl rounded-2xl border border-slate-200 bg-slate-50/60 p-6 dark:border-white/10 dark:bg-white/5">
        <h2 className="font-heading text-base font-semibold tracking-tight text-slate-900 dark:text-white">
          About the score
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          The number we show is an <strong className="font-semibold">automated accessibility score</strong>. Automated
          checks catch a meaningful share of issues, but they can&apos;t catch everything — a high score is not a
          guarantee of WCAG compliance. Pair it with manual testing and, where you can, testing with disabled users.
        </p>
      </div>
    </section>
  );
}
