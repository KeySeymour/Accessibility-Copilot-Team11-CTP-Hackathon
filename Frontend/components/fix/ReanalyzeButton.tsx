// components/fix/ReanalyzeButton.tsx — mockup 2.6 "Re-analyze"
//
// POSTs to /api/scans/[scanId]/reanalyze and sends the user to the child
// scan's /analyzing page, which polls the same way the first run did.
// Split out so app/scans/[scanId]/compare/page.tsx stays a server component.

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function ReanalyzeButton({ scanId, className }: { scanId: string; className?: string }) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function reanalyze() {
    setRunning(true);
    setError(null);

    try {
      const res = await fetch(`/api/scans/${scanId}/reanalyze`, { method: "POST" });
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const { scanId: childScanId } = await res.json();
      router.push(`/scans/${childScanId}/analyzing`);
    } catch {
      setError("We couldn't start the re-analysis. Please try again.");
      setRunning(false);
    }
  }

  return (
    <div className={className}>
      <Button type="button" onClick={reanalyze} disabled={running}>
        {running ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} aria-hidden="true" />
            Re-analyzing…
          </>
        ) : (
          <>
            <RefreshCw className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
            Re-analyze
          </>
        )}
      </Button>

      {error && (
        <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
