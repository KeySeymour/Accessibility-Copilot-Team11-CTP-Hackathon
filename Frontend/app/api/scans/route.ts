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
import fs from "node:fs";
import path from "node:path";
import { createScan, listScans, countIssues, completeScan, replaceIssues, SCREENSHOT_DIR } from "@/lib/db";
import { startScan } from "@/lib/scan/runner";
import { assertScannableUrl, UnsafeUrlError } from "@/lib/scan/url-guard";

// The scan pipeline touches the filesystem and a live browser, so this route
// can never be statically evaluated.
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    return analyzeUploadedScreenshot(req);
  }

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

async function analyzeUploadedScreenshot(req: NextRequest) {
  const form = await req.formData();
  const upload = form.get("screenshot");
  if (!(upload instanceof File)) {
    return NextResponse.json({ error: "Choose a PNG or JPG screenshot first." }, { status: 400 });
  }

  const image = Buffer.from(await upload.arrayBuffer());
  if (image.length === 0 || image.length > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "The screenshot must be between 1 byte and 10MB." }, { status: 400 });
  }

  const aiUrl = process.env.AI_SERVICE_URL ?? "http://127.0.0.1:8000";
  try {
    const response = await fetch(`${aiUrl}/analyze`, {
      method: "POST",
      body: (() => {
        const body = new FormData();
        body.append("file", new Blob([image], { type: upload.type || "image/png" }), upload.name);
        body.append("context", "Uploaded UI screenshot");
        return body;
      })(),
      cache: "no-store",
    });
    const analysis = await response.json();
    if (!response.ok) return NextResponse.json({ error: analysis.detail ?? "Screenshot analysis failed." }, { status: 502 });

    const scan = createScan({ url: `uploaded://${upload.name}` });
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    const screenshotPath = path.join(SCREENSHOT_DIR, `${scan.id}.png`);
    fs.writeFileSync(screenshotPath, image);

    const issues = (analysis.issues ?? []).map((issue: Record<string, unknown>) => ({
      ruleId: String(issue.type ?? "other"),
      severity: ({ critical: "high", serious: "high", moderate: "medium", minor: "low" } as Record<string, "high" | "medium" | "low">)[String(issue.severity)] ?? "medium",
      title: String(issue.title ?? "Accessibility issue"),
      wcagRef: Array.isArray(issue.wcag) ? issue.wcag.join(", ") : "AI suggestion",
      whyItMatters: String(issue.impact ?? issue.description ?? ""),
      suggestedFix: String(issue.recommendation ?? ""),
      target: undefined,
      html: undefined,
      box: issue.bounding_box && typeof issue.bounding_box === "object"
        ? { x: Number((issue.bounding_box as Record<string, unknown>).x) * 100, y: Number((issue.bounding_box as Record<string, unknown>).y) * 100, width: Number((issue.bounding_box as Record<string, unknown>).width) * 100, height: Number((issue.bounding_box as Record<string, unknown>).height) * 100 }
        : undefined,
      source: "ai" as const,
    }));
    replaceIssues(scan.id, issues);
    completeScan(scan.id, { score: Number(analysis.score ?? 0), screenshotPath, pageWidth: 1440, pageHeight: 900, needsReview: 0 });
    return NextResponse.json({ scanId: scan.id }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Screenshot analysis service is unavailable." }, { status: 502 });
  }
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
