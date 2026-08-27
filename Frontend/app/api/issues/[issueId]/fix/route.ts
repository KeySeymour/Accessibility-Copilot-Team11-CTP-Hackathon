// app/api/issues/[issueId]/fix/route.ts
//
// POST /api/issues/[issueId]/fix
//   Generates a candidate patch for one issue and returns a before/after
//   preview for the Fix Studio's "Preview Fix" panel (mockup 2.5).
//
//   The quality of the result depends entirely on the DOM context captured at
//   scan time (lib/scan/context.ts). Without it, a document-level rule like
//   landmark-one-main can only be shown `<html lang="en">`, and no model can
//   say where <main> belongs from that.
//
// PATCH /api/issues/[issueId]/fix
//   Records that the USER applied the fix in their own codebase. Separate from
//   generating one on purpose: this app never edits anyone's source, so only
//   the user can say something is actually fixed. The dashboard's "Issues
//   fixed" tile counts these, and it would be a lie if generating set it.
//
// Applying a fix does NOT re-score the scan — that happens via
// /api/scans/[scanId]/reanalyze, which re-renders the page and re-runs axe
// against the real, patched result.

import { NextResponse } from "next/server";
import { getIssue, saveIssueFix, setFixApplied } from "@/lib/db";
import { classifyGeminiError, generateFix, GeminiError, isGeminiEnabled } from "@/lib/scan/gemini";

export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: { issueId: string } }) {
  const issue = getIssue(params.issueId);

  if (!issue) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  // A fix generated earlier is cached on the row, so switching between issues
  // doesn't re-bill a model call. `?refresh=1` forces a new one.
  const refresh = new URL(req.url).searchParams.get("refresh") === "1";
  if (issue.fix && !refresh) {
    return NextResponse.json({ ...issue.fix, before: issue.html ?? null, cached: true });
  }

  if (!isGeminiEnabled()) {
    // 501 rather than 500: the server works, the capability isn't configured.
    return NextResponse.json(
      { error: "Fix generation needs a Gemini API key. Add GEMINI_API_KEY to Frontend/.env.local and restart." },
      { status: 501 },
    );
  }

  let fix;
  try {
    fix = await generateFix({
      ruleId: issue.ruleId,
      title: issue.title,
      html: issue.html,
      suggestedFix: issue.suggestedFix,
      contrast: issue.contrast,
      context: issue.context,
    });
  } catch (err) {
    // Report what actually went wrong. A 429 told as "please try again" sends
    // the user in a loop against a daily quota that won't reset for hours.
    const e = err instanceof GeminiError ? err : classifyGeminiError(err);
    const status = e.kind === "quota" ? 429 : e.kind === "auth" ? 401 : e.kind === "model" ? 400 : 502;

    return NextResponse.json(
      { error: e.message, kind: e.kind, retryAfterSeconds: e.retryAfterSeconds ?? null },
      {
        status,
        headers: e.retryAfterSeconds ? { "Retry-After": String(e.retryAfterSeconds) } : undefined,
      },
    );
  }

  if (!fix) {
    return NextResponse.json({ error: "We couldn't generate a fix for this one. Please try again." }, { status: 502 });
  }

  saveIssueFix(issue.id, fix);

  return NextResponse.json({ ...fix, issueId: issue.id, scanId: issue.scanId, before: issue.html ?? null });
}

export async function PATCH(req: Request, { params }: { params: { issueId: string } }) {
  const issue = getIssue(params.issueId);

  if (!issue) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const body = (await req.json().catch(() => ({}))) as { applied?: unknown };
  const applied = body.applied !== false; // default to marking it applied

  setFixApplied(issue.id, applied);

  return NextResponse.json({ issueId: issue.id, fixApplied: applied });
}
