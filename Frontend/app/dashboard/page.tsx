// app/dashboard/page.tsx — mockup 2.1 "Dashboard / Home"
//
// Shows: welcome header, summary stats (scans this week, average score,
// issues found, fixed), "Recent Scans" list linking into
// /scans/[scanId]/fix, and the "Quick Start" card (Upload Screenshot /
// Analyze URL buttons) linking to /scans/new.
//
// Data: read straight from SQLite (lib/db). This is a server component, so
// there's no reason to HTTP-fetch our own API route to get it.

import Link from "next/link";
import { ArrowUpRight, BadgeCheck, Gauge, ImageUp, Link2, ScanEye, ShieldAlert } from "lucide-react";
import { EmptyState } from "@/components/states/EmptyState";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { StatTile } from "@/components/ui/StatTile";
import { Button } from "@/components/ui/Button";
import { ScanRow } from "@/components/scans/ScanRow";
import { listScans, getSummary, countIssues } from "@/lib/db";

// Reads the database on every request — a dashboard that caches its own stats
// would show a stale score right after a scan finishes.
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  // Server component, so this queries SQLite directly rather than making an
  // HTTP round trip to our own API route.
  const recentScans = listScans(5);
  const summary = getSummary();

  return (
    <section aria-labelledby="dashboard-heading" className="animate-fade-up">
      <Eyebrow>Dashboard</Eyebrow>
      <h1
        id="dashboard-heading"
        className="mt-2 font-heading text-3xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-4xl"
      >
        Welcome back, Designer
      </h1>
      <p className="mt-2 max-w-2xl text-lg leading-relaxed text-slate-600 dark:text-slate-400">
        Here&apos;s your accessibility overview.
      </p>

      {/* Stat tiles: This week / Average score / Issues found / Fixed issues */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Scans this week" value={summary.scansThisWeek} icon={ScanEye} />
        <StatTile
          label="Average score"
          value={summary.averageScore}
          hint="Automated score, not a compliance guarantee"
          icon={Gauge}
        />
        <StatTile label="Issues found" value={summary.issuesFound} icon={ShieldAlert} tone="fail" />
        <StatTile label="Issues fixed" value={summary.issuesFixed} icon={BadgeCheck} tone="pass" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-white/5">
            <div className="flex items-center justify-between gap-4">
              <h2 className="font-heading text-lg font-semibold tracking-tight text-slate-900 dark:text-white">
                Recent Scans
              </h2>
              {recentScans.length > 0 && (
                <Link
                  href="/history"
                  className="inline-flex items-center gap-1 rounded-lg text-sm font-medium text-violet-600 transition-colors hover:text-violet-700 dark:text-violet-400"
                >
                  View all
                  <ArrowUpRight className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                </Link>
              )}
            </div>

            <div className="mt-5">
              {recentScans.length === 0 ? (
                <EmptyState
                  title="No scans yet"
                  body="Upload a screenshot or analyze a URL to get started."
                  actionLabel="Start a scan"
                  actionHref="/scans/new"
                  icon={ScanEye}
                  className="border-dashed"
                />
              ) : (
                <ul className="flex flex-col gap-3">
                  {recentScans.map((scan) => (
                    <li key={scan.id}>
                      <ScanRow scan={scan} issueCount={countIssues(scan.id)} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        {/* Quick Start (mockup 2.1) */}
        <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-violet-600 to-indigo-600 p-6 text-white shadow-2xl shadow-violet-500/20 dark:border-white/10">
          <h2 className="font-heading text-lg font-semibold tracking-tight">Quick Start</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-violet-100">
            See it. Understand it. Fix it. Verify it.
          </p>

          <div className="mt-6 flex flex-col gap-3">
            <Button href="/scans/new" variant="accent" size="sm">
              <ImageUp className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
              Upload Screenshot
            </Button>
            <Button
              href="/scans/new"
              size="sm"
              className="border border-white/25 bg-white/10 font-medium text-white shadow-none hover:bg-white/20"
            >
              <Link2 className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
              Analyze URL
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
