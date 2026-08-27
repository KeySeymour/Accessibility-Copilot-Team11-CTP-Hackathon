// app/api/scans/route.ts
//
// POST /api/scans { url }
//   Validates the URL (SSRF guard — block localhost/private IP ranges),
//   creates a `scans` row (status: "queued"), starts the render → axe →
//   merge → score pipeline, and returns { scanId } so the client can
//   redirect to /scans/[scanId]/analyzing and poll.
//
// GET /api/scans?limit=5
//   Used by the dashboard's "Recent Scans" panel.

import { NextRequest, NextResponse } from "next/server";
import { createScan, listScans, countIssues } from "@/lib/db";
import { startScan } from "@/lib/scan/runner";
import { assertScannableUrl, UnsafeUrlError } from "@/lib/scan/url-guard";

// The scan pipeline touches the filesystem and a live browser, so this route
// can never be statically evaluated.
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Send a JSON body with a url." }, { status: 400 });
  }

  const { url } = (body ?? {}) as { url?: unknown };

  let safeUrl: string;
  try {
    safeUrl = await assertScannableUrl(url);
  } catch (err) {
    if (err instanceof UnsafeUrlError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }

  const scan = createScan({ url: safeUrl });

  // Fire-and-forget: the client learns about progress by polling
  // GET /api/scans/[scanId], not by waiting on this response.
  startScan(scan.id);

  return NextResponse.json({ scanId: scan.id }, { status: 201 });
}

export async function GET(req: NextRequest) {
  const raw = Number(req.nextUrl.searchParams.get("limit") ?? "10");
  const limit = Number.isFinite(raw) ? Math.min(Math.max(Math.trunc(raw), 1), 100) : 10;

  const scans = listScans(limit).map((scan) => ({
    ...scan,
    issueCount: countIssues(scan.id),
  }));

  return NextResponse.json({ scans });
}
