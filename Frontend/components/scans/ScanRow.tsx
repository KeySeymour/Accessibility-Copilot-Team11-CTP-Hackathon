// components/scans/ScanRow.tsx
//
// One row in the dashboard's "Recent Scans" (2.1) and the full History list.
// They're the same shape by design, so they share a component.
//
// A scan that hasn't finished has no score yet, so the row links to the
// analyzing page and shows status instead of a ring.

import Link from "next/link";
import { Loader2 } from "lucide-react";
import type { Scan } from "@/lib/db";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { Badge } from "@/components/ui/Badge";
import { formatWhen, hostOf } from "@/lib/format";

export function ScanRow({ scan, issueCount }: { scan: Scan; issueCount?: number }) {
  const done = scan.status === "complete" && scan.score !== null;
  const failed = scan.status === "failed";
  const href = done ? `/scans/${scan.id}/fix` : failed ? "/scans/new" : `/scans/${scan.id}/analyzing`;

  return (
    <Link
      href={href}
      className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 transition-all hover:border-violet-300 hover:shadow-lg hover:shadow-violet-500/5 dark:border-white/10 dark:bg-white/5 dark:hover:border-violet-500/40"
    >
      <div className="min-w-0">
        <p className="truncate font-mono text-sm text-slate-700 dark:text-slate-200">{hostOf(scan.url)}</p>
        <p className="mt-0.5 text-xs text-slate-400">
          {formatWhen(scan.createdAt)}
          {done && issueCount !== undefined && ` · ${issueCount} ${issueCount === 1 ? "issue" : "issues"}`}
        </p>
      </div>

      {done ? (
        <ScoreRing score={scan.score!} size={48} label={`Score for ${hostOf(scan.url)}`} />
      ) : failed ? (
        <Badge tone="fail">Failed</Badge>
      ) : (
        <Badge tone="info">
          <Loader2 className="h-3 w-3 animate-spin" strokeWidth={2.5} aria-hidden="true" />
          {scan.status}
        </Badge>
      )}
    </Link>
  );
}
