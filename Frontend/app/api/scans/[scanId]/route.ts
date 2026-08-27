// app/api/scans/[scanId]/route.ts
//
// GET /api/scans/[scanId]
//   Polled by /scans/[scanId]/analyzing every ~1.5s until status flips to
//   "complete" or "failed". Returns { id, url, status, score, screenshotUrl }.

import { NextResponse } from "next/server";
import { getScan, countIssues } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { scanId: string } }) {
  const scan = getScan(params.scanId);

  if (!scan) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  return NextResponse.json(
    {
      id: scan.id,
      url: scan.url,
      status: scan.status,
      score: scan.score,
      error: scan.error,
      parentScanId: scan.parentScanId,
      needsReview: scan.needsReview,
      issueCount: countIssues(scan.id),
      screenshotUrl: scan.hasScreenshot ? `/api/scans/${scan.id}/screenshot` : null,
      createdAt: scan.createdAt,
      completedAt: scan.completedAt,
    },
    // The analyzing page polls this; a cached response would freeze progress.
    { headers: { "Cache-Control": "no-store" } },
  );
}
