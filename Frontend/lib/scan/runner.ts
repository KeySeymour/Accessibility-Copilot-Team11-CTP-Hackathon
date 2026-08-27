// lib/scan/runner.ts
//
// The render → axe → boxes → score → persist pipeline, and the thing that
// actually moves a scan through queued → rendering → analyzing → complete.
//
// JOB QUEUE NOTE: the original design enqueues a "render" job. This runs the
// work in-process instead — a fire-and-forget async function whose progress is
// written to SQLite, which the poll endpoint reads. That's the right shape for
// local development and keeps the status contract identical, but it has real
// limits: work is lost if the process restarts mid-scan, nothing retries, and
// it won't survive being deployed across multiple instances. Swapping in BullMQ
// or similar means calling runScan() from a worker process rather than here;
// no other module needs to change.

import "server-only";

import fs from "node:fs";
import path from "node:path";
import { chromium, type Browser, type Page } from "playwright";
import { AxeBuilder } from "@axe-core/playwright";
import { completeScan, getScan, replaceIssues, setScanStatus, SCREENSHOT_DIR } from "@/lib/db";
import { mapViolations, type MappedIssue } from "@/lib/scan/axe-mapping";
import { scoreResults } from "@/lib/scan/score";
import type { BoundingBox, Issue } from "@/lib/types";

const NAV_TIMEOUT_MS = 30_000;
const VIEWPORT = { width: 1440, height: 900 };

/** Cap on how many elements we resolve boxes for — each is a round trip. */
const MAX_BOX_LOOKUPS = 60;

/**
 * Kicks off a scan without blocking the request. Errors are swallowed here on
 * purpose: runScan already records failure on the scan row, which is what the
 * client polls. Anything reaching this catch is a bug in the recording itself.
 */
export function startScan(scanId: string): void {
  void runScan(scanId).catch((err) => {
    console.error(`[scan ${scanId}] unrecoverable:`, err);
    try {
      setScanStatus(scanId, "failed", "The scan stopped unexpectedly.");
    } catch {
      /* the DB is the thing that failed; nothing more to do */
    }
  });
}

export async function runScan(scanId: string): Promise<void> {
  const scan = getScan(scanId);
  if (!scan) throw new Error(`scan ${scanId} not found`);

  let browser: Browser | undefined;

  try {
    setScanStatus(scanId, "rendering");
    browser = await chromium.launch();

    const context = await browser.newContext({
      viewport: VIEWPORT,
      // Identify ourselves rather than impersonating a user's browser.
      userAgent: "AccessibilityCopilot/0.1 (+automated accessibility scan)",
      // The scan renders untrusted third-party pages; keep them off any
      // credentials this machine happens to hold.
      storageState: undefined,
    });

    const page = await context.newPage();
    page.setDefaultNavigationTimeout(NAV_TIMEOUT_MS);

    const response = await page.goto(scan.url, { waitUntil: "load" });
    if (response && !response.ok()) {
      throw new ScanError(`That page returned ${response.status()}, so there was nothing to check.`);
    }

    // Let late-loading fonts/images settle so contrast is measured against what
    // a user actually sees. networkidle can hang on pages with polling, so it's
    // a best-effort wait rather than a hard requirement.
    await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => {});

    setScanStatus(scanId, "analyzing");

    // The WCAG comparison itself. Scoped to WCAG 2.0/2.1/2.2 A–AA plus axe's
    // best-practice rules; AAA is deliberately excluded because most products
    // don't target it and its failures would drown the list.
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"])
      .analyze();

    const mapped = mapViolations(results.violations);
    const { width: pageWidth, height: pageHeight } = await pageDimensions(page);
    const issues = await attachBoxes(page, mapped, pageWidth, pageHeight);

    const screenshotPath = await captureScreenshot(page, scanId);
    const breakdown = scoreResults(results);

    replaceIssues(scanId, issues);
    completeScan(scanId, {
      score: breakdown.score,
      screenshotPath,
      pageWidth,
      pageHeight,
      needsReview: breakdown.needsReview,
    });

    console.log(
      `[scan ${scanId}] complete — score ${breakdown.score}, ` +
        `${breakdown.violatedRules} rules violated across ${issues.length} elements, ` +
        `${breakdown.passedRules} passed, ${breakdown.needsReview} need review`,
    );
  } catch (err) {
    // ScanError messages are written for the user; everything else gets a
    // generic message so internal details don't leak into the UI.
    const message = err instanceof ScanError ? err.message : "We couldn't finish checking that page.";
    console.error(`[scan ${scanId}] failed:`, err);
    setScanStatus(scanId, "failed", message);
  } finally {
    await browser?.close().catch(() => {});
  }
}

export class ScanError extends Error {}

async function pageDimensions(page: Page): Promise<{ width: number; height: number }> {
  return page.evaluate(() => ({
    width: Math.max(document.documentElement.scrollWidth, window.innerWidth),
    height: Math.max(document.documentElement.scrollHeight, window.innerHeight),
  }));
}

/**
 * Resolves each issue's CSS selector back to a rectangle on the full-page
 * screenshot, stored as percentages so the overlay scales with the image.
 *
 * axe gives selectors, not geometry, so this is a second pass. Selectors can go
 * stale (an element removed after the audit) — a miss just means that issue
 * renders without a marker, never a failed scan.
 */
async function attachBoxes(
  page: Page,
  mapped: MappedIssue[],
  pageWidth: number,
  pageHeight: number,
): Promise<Omit<Issue, "id" | "fixApplied">[]> {
  const out: Omit<Issue, "id" | "fixApplied">[] = [];
  let lookups = 0;

  for (const { selector, ...issue } of mapped) {
    let box: BoundingBox | undefined;

    if (selector && lookups < MAX_BOX_LOOKUPS) {
      lookups += 1;
      try {
        const rect = await page.locator(selector).first().boundingBox({ timeout: 1_000 });
        if (rect && rect.width > 0 && rect.height > 0) {
          box = {
            x: (rect.x / pageWidth) * 100,
            y: (rect.y / pageHeight) * 100,
            width: (rect.width / pageWidth) * 100,
            height: (rect.height / pageHeight) * 100,
          };
        }
      } catch {
        // Selector didn't resolve or timed out — leave the marker off.
      }
    }

    out.push({ ...issue, box });
  }

  return out;
}

async function captureScreenshot(page: Page, scanId: string): Promise<string | null> {
  try {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    const file = path.join(SCREENSHOT_DIR, `${scanId}.png`);
    await page.screenshot({ path: file, fullPage: true });
    return file;
  } catch (err) {
    // A missing screenshot degrades the Fix Studio canvas but the issue list,
    // score, and compare flow all still work — not worth failing the scan.
    console.error(`[scan ${scanId}] screenshot failed:`, err);
    return null;
  }
}
