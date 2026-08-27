// app/api/scans/[scanId]/reanalyze/route.ts
//
// POST /api/scans/[scanId]/reanalyze
//   Creates a NEW scan row with parent_scan_id = scanId, re-renders the
//   live (now-patched) page, and re-runs the full axe + merge + score
//   pipeline against it. Never mutates the original scan's score —
//   the "before/after" comparison in /compare reads two independent
//   scan rows. Returns { scanId: newScanId } for the client to poll.

import { NextResponse } from "next/server";
import { createScan, getScan } from "@/lib/db";
import { startScan } from "@/lib/scan/runner";

export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: Promise<{ scanId: string }> }) {
  const { scanId } = await params;
  const parent = getScan(scanId);

  if (!parent) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  // Re-analysing a re-analysis would build an ever-deeper chain that /compare
  // can't render as a simple before/after, so always hang the new scan off the
  // original root.
  const rootId = parent.parentScanId ?? parent.id;

  const child = createScan({ url: parent.url, parentScanId: rootId });
  startScan(child.id);

  return NextResponse.json({ scanId: child.id }, { status: 201 });
}
