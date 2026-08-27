import { NextResponse } from "next/server";
import { createImprovedScreenshot, readImprovementReport } from "@/lib/scan/improved-preview";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(_request: Request, { params }: { params: Promise<{ scanId: string }> }) {
  try {
    const { scanId } = await params;
    // Image generation and report generation share one deduplicated job.
    await createImprovedScreenshot(scanId);
    const report = await readImprovementReport(scanId);
    if (!report) return NextResponse.json({ error: "Improvement report not found." }, { status: 404 });
    return NextResponse.json(report, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[improvement report]", error);
    return NextResponse.json({ error: "We couldn't verify the improved preview." }, { status: 502 });
  }
}
