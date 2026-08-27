// app/api/issues/[issueId]/fix/route.ts
//
// POST /api/issues/[issueId]/fix
//   Generates a candidate patch for one issue and returns a before/after
//   preview for the Fix Studio's "Preview Fix" panel (mockup 2.5).
//
// Applying a fix does NOT re-score the scan by itself — that happens via
// /api/scans/[scanId]/reanalyze once the user has applied their chosen fixes
// and clicks "Re-analyze". This route only proposes; verification is a
// separate, real scan of the patched page.

import { NextResponse } from "next/server";
import { getIssue } from "@/lib/db";
import { generateFix, isGeminiEnabled } from "@/lib/scan/gemini";

export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: { issueId: string } }) {
  const issue = getIssue(params.issueId);

  if (!issue) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  if (!isGeminiEnabled()) {
    // 501 rather than 500: the server is working, the capability just isn't
    // configured. The client shows this message as-is.
    return NextResponse.json(
      { error: "Fix generation needs a Gemini API key. Add GEMINI_API_KEY to Frontend/.env.local and restart." },
      { status: 501 },
    );
  }

  const fix = await generateFix({
    ruleId: issue.ruleId,
    title: issue.title,
    html: issue.html,
    suggestedFix: issue.suggestedFix,
    contrast: issue.contrast,
  });

  if (!fix) {
    return NextResponse.json(
      { error: "We couldn't generate a fix for this one. Please try again." },
      { status: 502 },
    );
  }

  return NextResponse.json({
    issueId: issue.id,
    scanId: issue.scanId,
    before: issue.html ?? null,
    ...fix,
  });
}
