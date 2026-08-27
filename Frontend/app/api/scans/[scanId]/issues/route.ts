// app/api/scans/[scanId]/issues/route.ts
//
// GET /api/scans/[scanId]/issues
//   Returns the normalized issues[] produced by the scan runner (axe results
//   mapped through lib/scan/axe-mapping, with bounding boxes resolved) that the
//   Fix Studio page renders as bounding-box markers and the issue list.

import { NextResponse } from "next/server";
import { getScan, listIssues } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { scanId: string } }) {
  if (!getScan(params.scanId)) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  return NextResponse.json({ issues: listIssues(params.scanId) });
}
