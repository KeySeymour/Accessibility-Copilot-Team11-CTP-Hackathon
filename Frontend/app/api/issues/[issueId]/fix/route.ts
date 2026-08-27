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
import { generateLocalFix, sanitizeFixMarkup } from "@/lib/scan/local-fix";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ issueId: string }> }) {
  const { issueId } = await params;
  const issue = getIssue(issueId);

  if (!issue) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const input = {
      ruleId: issue.ruleId,
      title: issue.title,
      html: issue.html,
      suggestedFix: issue.suggestedFix,
      contrast: issue.contrast,
  };

  // Gemini improves ambiguous fixes, but accessibility remediation must remain
  // usable when its free-tier quota is exhausted. Any model failure falls back
  // to conservative, deterministic transformations rather than failing the UI.
  const options = (await req.json().catch(() => null)) as { preferLocal?: boolean } | null;
  let fix: Awaited<ReturnType<typeof generateFix>> = null;
  if (!options?.preferLocal && isGeminiEnabled()) {
    try {
      fix = await generateFix(input);
    } catch (error) {
      console.warn("[fix] Gemini unavailable; using local fallback:", error instanceof Error ? error.message : error);
    }
  }
  fix ??= generateLocalFix(input);

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
    after: sanitizeFixMarkup(fix.after),
  });
}
