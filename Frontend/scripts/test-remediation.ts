import assert from "node:assert/strict";
import { chromium } from "playwright";
// Node 26 strips TypeScript directly for this local integration test.
// @ts-expect-error Runtime TypeScript imports require the explicit extension.
import { applyAndVerifyRemediations } from "../lib/scan/remediation.ts";

const channel = process.env.PLAYWRIGHT_BROWSER_CHANNEL || "chrome";
const browser = await chromium.launch({ channel });

try {
  const context = await browser.newContext({ viewport: { width: 1000, height: 700 } });
  const page = await context.newPage();
  await page.setContent(`<!doctype html>
    <html lang="en"><head><title>Remediation fixture</title></head>
    <body>
      <div id="content">
        <h1>Fixture page</h1>
        <h3 id="skipped-heading">Skipped heading</h3>
        <p id="low-contrast" style="color:#777777;background:#ffffff;font-size:16px">Readable content</p>
        <a id="unnamed-link" href="/apply"></a>
      </div>
    </body></html>`);

  const report = await applyAndVerifyRemediations(page, [
    {
      ruleId: "color-contrast",
      title: "Text needs stronger contrast",
      target: "#low-contrast",
      suggestedFix: "foreground color: #777777, background color: #ffffff",
      source: "axe",
    },
    {
      ruleId: "link-name",
      title: "Link needs a name",
      target: "#unnamed-link",
      source: "axe",
    },
    {
      ruleId: "heading-order",
      title: "Heading level is skipped",
      target: "#skipped-heading",
      source: "axe",
    },
    {
      ruleId: "region",
      title: "Content needs a landmark",
      target: "#content",
      source: "axe",
    },
  ]);

  assert.equal(report.mode, "verified-dom");
  assert.equal(report.remaining, 0, JSON.stringify(report, null, 2));
  assert.ok(report.verified >= 3, JSON.stringify(report, null, 2));
  assert.equal(await page.locator("#unnamed-link").getAttribute("aria-label"), "Apply");
  assert.equal(await page.locator("#skipped-heading").evaluate((node) => node.tagName), "H2");
  assert.equal(await page.locator("#content").getAttribute("role"), "region");
  console.log(`remediation fixture passed: ${report.verified} verified, ${report.needsReview} review`);
} finally {
  await browser.close();
}
