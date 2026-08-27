import fs from "node:fs";
import { NextResponse } from "next/server";
import { createImprovedScreenshot } from "@/lib/scan/improved-preview";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(_request: Request, { params }: { params: Promise<{ scanId: string }> }) {
  try {
    const { scanId } = await params;
    const file = await createImprovedScreenshot(scanId);
    const body = await fs.promises.readFile(file);
    return new NextResponse(body as unknown as BodyInit, {
      headers: {
        "Content-Type": "image/png",
        // Improved assets may be regenerated while a user iterates. Safari is
        // especially persistent with cached images, so always revalidate.
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    console.error("[improved preview]", error);
    return NextResponse.json({ error: "We couldn't render the improved page preview." }, { status: 502 });
  }
}
