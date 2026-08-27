// app/api/issues/[issueId]/fix/route.ts
//
// POST /api/issues/[issueId]/fix
//   Generates a candidate CSS/attribute patch for one issue (fixWorker),
//   applies it to the live page via page.evaluate(), and returns a
//   before/after preview (contrast ratio, screenshot crop) for the Fix
//   Studio's "Preview Fix" panel (mockup 2.5). Applying it does not
//   re-score the whole scan by itself — that happens via
//   /api/scans/[scanId]/reanalyze once the user has applied their
//   chosen fixes and clicks "Re-analyze".

import { NextResponse } from "next/server";

export async function POST(_req: Request, { params }: { params: { issueId: string } }) {
  // TODO: const issue = await db.issues.findById(params.issueId)
  // TODO: const patch = await generateFix(issue)   // Gemini or rule-based, per RULES[issue.ruleId]
  // TODO: const preview = await applyAndPreview(patch, issue.scanId)
  // TODO: await db.issues.update(params.issueId, { fixApplied: true })
  return NextResponse.json({ patch: null, preview: null });
}
