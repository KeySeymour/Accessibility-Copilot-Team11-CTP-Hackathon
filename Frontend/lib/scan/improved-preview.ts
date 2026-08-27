import "server-only";

import fs from "node:fs";
import path from "node:path";
import { chromium, type Browser } from "playwright";
import { GoogleGenAI } from "@google/genai";
import { getScan, getScreenshotPath, listIssues, SCREENSHOT_DIR } from "@/lib/db";
import {
  applyAndVerifyRemediations,
  visualProposalReport,
  type RemediationReport,
} from "@/lib/scan/remediation";

const pending = new Map<string, Promise<string>>();

export function improvedScreenshotPath(scanId: string): string {
  // Version the artifact so improvements to the renderer invalidate old,
  // lower-quality previews without deleting the user's original screenshot.
  return path.join(SCREENSHOT_DIR, `${scanId}-improved-v6.png`);
}

export function improvementReportPath(scanId: string): string {
  return path.join(SCREENSHOT_DIR, `${scanId}-improved-v6.json`);
}

export async function readImprovementReport(scanId: string): Promise<RemediationReport | null> {
  const file = improvementReportPath(scanId);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(await fs.promises.readFile(file, "utf8")) as RemediationReport;
}

async function saveImprovementReport(scanId: string, report: RemediationReport): Promise<void> {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  await fs.promises.writeFile(improvementReportPath(scanId), JSON.stringify(report, null, 2), "utf8");
}

/**
 * Reopens the scanned page, applies conservative DOM fixes, and captures the
 * actual rendered result. The source website is never mutated.
 */
export function createImprovedScreenshot(scanId: string): Promise<string> {
  const existing = improvedScreenshotPath(scanId);
  if (fs.existsSync(existing)) return Promise.resolve(existing);

  const active = pending.get(scanId);
  if (active) return active;

  const job = renderImprovedScreenshot(scanId).finally(() => pending.delete(scanId));
  pending.set(scanId, job);
  return job;
}

async function renderImprovedScreenshot(scanId: string): Promise<string> {
  const scan = getScan(scanId);
  if (!scan) throw new Error("Scan not found.");

  const issues = listIssues(scanId).map((issue) => ({
    ruleId: issue.ruleId,
    target: issue.target,
    title: issue.title,
    suggestedFix: issue.suggestedFix,
    severity: issue.severity,
    box: issue.box,
    source: issue.source,
  }));
  const file = improvedScreenshotPath(scanId);
  let browser: Browser | undefined;

  // Both URL and upload scans already have a faithful browser/source image.
  // Use it as the edit target so visually subtle DOM recommendations become a
  // clear professional redesign instead of an almost-identical screenshot.
  const sourcePath = getScreenshotPath(scanId);
  const sourceImage = sourcePath && fs.existsSync(sourcePath)
    ? await fs.promises.readFile(sourcePath)
    : null;
  const sourceMime = sourceImage ? detectImageMime(sourceImage) : null;
  if (scan.url.startsWith("uploaded://") && sourceImage && sourceMime) {
    const report = visualProposalReport(issues);
    const aiImage = await generateProfessionalScreenshot(sourceImage, sourceMime, issues).catch((error) => {
      console.warn("[improved preview] AI image edit unavailable; using deterministic preview:", error instanceof Error ? error.message : error);
      return null;
    });
    if (aiImage) {
      fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
      await fs.promises.writeFile(file, aiImage);
      await saveImprovementReport(scanId, report);
      return file;
    }
  }

  try {
    const channel = process.env.PLAYWRIGHT_BROWSER_CHANNEL;
    browser = await chromium.launch(channel ? { channel } : undefined);
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();

    // An uploaded screenshot has no DOM or navigable URL. Render the exact
    // stored pixels with precise issue overlays and a readable improvement
    // plan instead of trying (and failing) to navigate to uploaded://... .
    if (scan.url.startsWith("uploaded://")) {
      if (!sourceImage || !sourceMime) throw new Error("Uploaded screenshot not found.");
      const image = sourceImage;
      const mime = sourceMime;
      const dataUrl = `data:${mime};base64,${image.toString("base64")}`;
      const visibleIssues = issues.filter((issue) => issue.box);

      const markers = visibleIssues.map((issue, index) => {
        const box = issue.box!;
        return `<div class="marker ${escapeHtml(issue.severity)}" style="left:${box.x}%;top:${box.y}%;width:${box.width}%;height:${box.height}%" aria-label="Issue ${index + 1}: ${escapeHtml(issue.title)}"><span>${index + 1}</span></div>`;
      }).join("");
      const cards = issues.map((issue, index) => {
        const markerNumber = issue.box ? visibleIssues.indexOf(issue) + 1 : index + 1;
        return `<article class="card"><div class="card-title"><span class="number">${markerNumber}</span><strong>${escapeHtml(issue.title)}</strong></div><p>${escapeHtml(issue.suggestedFix || "Review this area and apply the recommended accessibility correction.")}</p><div class="applied">Recommended improvement</div></article>`;
      }).join("");

      await page.setContent(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><style>
        *{box-sizing:border-box}body{margin:0;background:#eef2f7;color:#0f172a;font:16px/1.45 system-ui,-apple-system,sans-serif}.page{padding:28px}.header{display:flex;align-items:end;justify-content:space-between;gap:20px;margin-bottom:20px}.header h1{font-size:28px;margin:0}.header p{margin:5px 0 0;color:#475569}.status{border-radius:999px;background:#dcfce7;color:#166534;padding:8px 13px;font-weight:700;font-size:13px;white-space:nowrap}.layout{display:grid;grid-template-columns:minmax(0,1fr) 380px;gap:22px;align-items:start}.shot{position:relative;overflow:hidden;border:2px solid #c4b5fd;border-radius:16px;background:white;box-shadow:0 14px 35px #0f172a18}.shot img{display:block;width:100%;height:auto}.marker{position:absolute;border:3px solid #16a34a;background:#22c55e20;border-radius:8px;min-width:8px;min-height:8px}.marker.high{border-color:#dc2626;background:#ef444425}.marker.medium{border-color:#d97706;background:#f59e0b25}.marker span{position:absolute;left:-11px;top:-11px;display:grid;place-items:center;width:25px;height:25px;border-radius:50%;background:#166534;color:white;font-size:12px;font-weight:800;box-shadow:0 2px 5px #0003}.panel{display:grid;gap:12px}.card{border:1px solid #dbe4ef;border-radius:13px;background:white;padding:15px;box-shadow:0 5px 16px #0f172a0a}.card-title{display:flex;align-items:flex-start;gap:9px}.number{display:grid;place-items:center;flex:0 0 24px;height:24px;border-radius:50%;background:#6d28d9;color:white;font-size:12px;font-weight:800}.card p{margin:9px 0;color:#475569;font-size:14px}.applied{display:inline-block;border-radius:999px;background:#ede9fe;color:#5b21b6;padding:5px 9px;font-size:11px;font-weight:750;text-transform:uppercase;letter-spacing:.04em}@media(max-width:900px){.layout{grid-template-columns:1fr}}
      </style></head><body><main class="page"><header class="header"><div><h1>Accessibility improvement preview</h1><p>Your original screenshot with each recommended change mapped to its detected location.</p></div><div class="status">${issues.length} ${issues.length === 1 ? "improvement" : "improvements"} prepared</div></header><div class="layout"><section class="shot"><img src="${dataUrl}" alt="Uploaded interface screenshot">${markers}</section><aside class="panel" aria-label="Recommended improvements">${cards || '<article class="card">No visual issues were detected.</article>'}</aside></div></main></body></html>`, { waitUntil: "load" });
      await page.screenshot({ path: file, fullPage: true });
      await saveImprovementReport(scanId, visualProposalReport(issues));
      return file;
    }

    page.setDefaultNavigationTimeout(45_000);
    const response = await page.goto(scan.url, { waitUntil: "domcontentloaded" });
    if (response && !response.ok()) throw new Error(`Page returned ${response.status()}.`);
    await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => {});

    const report = await applyAndVerifyRemediations(page, issues);
    await saveImprovementReport(scanId, report);

    // The browser screenshot now contains the exact, measurable DOM fixes.
    // Let the visual model polish that verified source, never the unfixed page.
    const patchedImage = await page.screenshot({ fullPage: true });
    // Image refinement cannot be tested by axe after it becomes pixels, so it
    // is opt-in for URL scans. The default result is the exact DOM-fixed page
    // that produced the verification report above.
    const polishedImage = process.env.GEMINI_URL_POLISH_ENABLED?.trim() === "1"
      ? await generateProfessionalScreenshot(Buffer.from(patchedImage), "image/png", issues).catch((error) => {
          console.warn("[improved preview] URL polish unavailable; keeping DOM-fixed screenshot:", error instanceof Error ? error.message : error);
          return null;
        })
      : null;
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    await fs.promises.writeFile(file, polishedImage ?? patchedImage);
    return file;
  } finally {
    await browser?.close().catch(() => {});
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function detectImageMime(image: Buffer): "image/png" | "image/jpeg" {
  return image.length >= 3 && image[0] === 0xff && image[1] === 0xd8 && image[2] === 0xff
    ? "image/jpeg"
    : "image/png";
}

async function generateProfessionalScreenshot(
  image: Buffer,
  mime: "image/png" | "image/jpeg",
  issues: Array<{ title: string; suggestedFix?: string; severity: string }>,
): Promise<Buffer | null> {
  const apiKey = process.env.GEMINI_API_KEY?.trim().replace(/^√/, "");
  if (!apiKey || process.env.GEMINI_IMAGE_ENABLED?.trim() === "0") return null;

  const recommendations = issues.length
    ? issues.map((issue, index) => `${index + 1}. ${issue.title}: ${issue.suggestedFix || "Improve this accessibility problem."}`).join("\n")
    : "Preserve the interface and improve its accessibility, clarity, and visual hierarchy.";
  const prompt = `Edit the supplied website or app screenshot into a professional, production-quality accessible redesign.

Accessibility recommendations to apply:
${recommendations}

Requirements:
- The input already contains exact DOM-level accessibility corrections. Preserve those corrections and refine their presentation; never reverse them.
- Preserve the original brand identity, logo, people, photography, written content, information architecture, and overall purpose pixel-faithfully.
- Do not replace, add, remove, crop, or reinterpret photographs, people, logos, events, cards, or page content.
- Apply every recommendation visibly and naturally within the design.
- Improve typography, spacing, alignment, hierarchy, contrast, target sizing, and responsive structure only where required by the listed recommendations.
- Keep all existing visible text accurate and legible. Do not invent new sections, offers, statistics, navigation items, or marketing claims.
- Produce only the finished webpage/app screenshot at the source image's aspect ratio.
- No audit overlays, bounding boxes, numbered markers, side panels, annotations, before/after labels, browser chrome, emoji, or watermark text.
- The result should look like a credible interface designed by a senior product designer, not an accessibility report.`;

  const ai = new GoogleGenAI({ apiKey });
  const models = [
    process.env.GEMINI_IMAGE_MODEL?.trim() || "gemini-3.1-flash-image",
    "gemini-3.1-flash-lite-image",
  ].filter((model, index, all) => all.indexOf(model) === index);

  for (const model of models) {
    try {
      const interaction = await ai.interactions.create({
        model,
        input: [
          { type: "text", text: prompt },
          { type: "image", mime_type: mime, data: image.toString("base64") },
        ],
        // Screenshots can contain private product information. We only need
        // the result for this request, so do not retain the interaction.
        store: false,
      });
      const output = interaction.output_image;
      if (output?.data) return Buffer.from(output.data, "base64");
    } catch (error) {
      console.warn(`[improved preview] ${model} failed:`, error instanceof Error ? error.message : error);
    }
  }

  return null;
}
