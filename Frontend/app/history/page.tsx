// app/history/page.tsx — sidebar "History" item (mockup section 5).
// Full list of past scans; dashboard's "Recent Scans" (2.1) is a
// truncated preview of the same data with a "View all" link into here.

import { History as HistoryIcon } from "lucide-react";
import { EmptyState } from "@/components/states/EmptyState";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { ScanRow } from "@/components/scans/ScanRow";
import { countIssues, listScans } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const scans = listScans(100);

  return (
    <section aria-labelledby="history-heading" className="animate-fade-up">
      <Eyebrow>History</Eyebrow>
      <h1
        id="history-heading"
        className="mt-2 font-heading text-3xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-4xl"
      >
        Scan History
      </h1>
      <p className="mt-2 max-w-2xl text-lg leading-relaxed text-slate-600 dark:text-slate-400">
        Every scan you&apos;ve run, newest first. Accessibility is continuous — not a one-time check.
      </p>

      <div className="mt-8 max-w-4xl">
        {/* Full scan list, same row shape as dashboard Recent Scans,
            each linking to /scans/[scanId]/fix */}
        {scans.length === 0 ? (
          <EmptyState
            title="No scans yet"
            body="Once you run a scan, it'll show up here so you can track progress over time."
            actionLabel="Run your first scan"
            actionHref="/scans/new"
            icon={HistoryIcon}
            className="border-dashed"
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {scans.map((scan) => (
              <li key={scan.id}>
                <ScanRow scan={scan} issueCount={countIssues(scan.id)} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
