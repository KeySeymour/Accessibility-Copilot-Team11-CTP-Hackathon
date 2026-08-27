// app/api/scans/[scanId]/screenshot/route.ts
//
// GET /api/scans/[scanId]/screenshot
//   Serves the full-page PNG the runner captured, which the Fix Studio canvas
//   draws bounding-box markers over.
//
// Screenshots live in .data/ rather than public/ so they're only reachable
// through this route — the path is looked up by scan id in the database and
// never taken from the request, so a crafted id can't walk out of the folder.

import { NextResponse } from "next/server";
import fs from "node:fs";
import { getScreenshotPath } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: { scanId: string } }) {
  const file = getScreenshotPath(params.scanId);

  if (!file || !fs.existsSync(file)) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const body = await fs.promises.readFile(file);

  return new NextResponse(body as unknown as BodyInit, {
    headers: {
      "Content-Type": "image/png",
      // A given scan's screenshot never changes once written.
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
