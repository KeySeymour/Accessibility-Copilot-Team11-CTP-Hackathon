import { AxeBuilder } from "@axe-core/playwright";
import type { Page } from "playwright";

export interface RemediationInput {
  ruleId: string;
  title: string;
  target?: string;
  suggestedFix?: string;
  source?: "axe" | "ai";
}

export interface RemediationOutcome extends RemediationInput {
  status: "verified" | "remaining" | "manual" | "unsupported";
  action: string;
}

export interface RemediationReport {
  mode: "verified-dom" | "visual-proposal";
  total: number;
  attempted: number;
  verified: number;
  remaining: number;
  needsReview: number;
  outcomes: RemediationOutcome[];
}

type BrowserOutcome = Omit<RemediationOutcome, "status"> & {
  status: "applied" | "manual" | "unsupported";
};

/** Apply conservative transformations that can be checked again by axe. */
export async function applyAndVerifyRemediations(
  page: Page,
  issues: RemediationInput[],
): Promise<RemediationReport> {
  const outcomes = await page.evaluate(remediateDocument, issues);
  const after = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"])
    .analyze();

  const failing = new Map<string, Set<string>>();
  for (const violation of after.violations) {
    failing.set(
      violation.id,
      new Set(violation.nodes.flatMap((node) => node.target).filter((target): target is string => typeof target === "string")),
    );
  }

  const verifiedOutcomes: RemediationOutcome[] = outcomes.map((outcome) => {
    if (outcome.status === "manual" || outcome.status === "unsupported") {
      return { ...outcome, status: outcome.status };
    }
    const targets = failing.get(outcome.ruleId);
    const stillFailing = outcome.ruleId === "region" || !outcome.target
      ? Boolean(targets?.size)
      : Boolean(targets?.has(outcome.target));
    return { ...outcome, status: stillFailing ? "remaining" : "verified" };
  });

  return summarizeRemediation("verified-dom", verifiedOutcomes);
}

export function visualProposalReport(issues: RemediationInput[]): RemediationReport {
  return summarizeRemediation(
    "visual-proposal",
    issues.map((issue) => ({
      ...issue,
      status: "manual" as const,
      action: "Visual proposal generated; verify the recommendation against the implemented product.",
    })),
  );
}

function summarizeRemediation(
  mode: RemediationReport["mode"],
  outcomes: RemediationOutcome[],
): RemediationReport {
  return {
    mode,
    total: outcomes.length,
    attempted: outcomes.filter((outcome) => outcome.status === "verified" || outcome.status === "remaining").length,
    verified: outcomes.filter((outcome) => outcome.status === "verified").length,
    remaining: outcomes.filter((outcome) => outcome.status === "remaining").length,
    needsReview: outcomes.filter((outcome) => outcome.status === "manual" || outcome.status === "unsupported").length,
    outcomes,
  };
}

/** Self-contained because Playwright serializes this function into the page. */
function remediateDocument(pageIssues: RemediationInput[]): BrowserOutcome[] {
  const outcomes: BrowserOutcome[] = [];
  const query = (selector?: string) => {
    if (!selector) return null;
    try { return document.querySelector<HTMLElement>(selector); } catch { return null; }
  };
  const finish = (issue: RemediationInput, status: BrowserOutcome["status"], action: string) => {
    outcomes.push({ ...issue, status, action });
  };
  const humanizeUrl = (href: string) => {
    try {
      const part = new URL(href, location.href).pathname.split("/").filter(Boolean).at(-1);
      return part ? part.replace(/[-_]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()) : "";
    } catch {
      const part = href.split(/[?#]/)[0].split("/").filter(Boolean).at(-1);
      return part ? part.replace(/[-_]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()) : "";
    }
  };
  const bestTextColor = (background: string) => {
    const rgb = [1, 3, 5].map((offset) => Number.parseInt(background.slice(offset, offset + 2), 16) / 255);
    const channels = rgb.map((value) => value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
    const luminance = 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
    // One of pure white or pure black always reaches WCAG AA contrast against
    // an opaque background; using near-black can miss that guarantee.
    return 1.05 / (luminance + 0.05) >= (luminance + 0.05) / 0.05 ? "#ffffff" : "#000000";
  };

  const regionIssues = pageIssues.filter((issue) => issue.ruleId === "region");
  if (regionIssues.length) {
    let candidates = regionIssues
      .map((issue) => query(issue.target))
      .filter((node): node is HTMLElement => Boolean(node))
      .map((node) => {
        let candidate = node;
        while (candidate.parentElement && candidate.parentElement !== document.body) {
          if (candidate.parentElement.matches("main,nav,header,footer,aside,[role='main'],[role='navigation'],[role='banner'],[role='contentinfo'],[role='complementary'],[role='region']")) break;
          candidate = candidate.parentElement;
        }
        return candidate;
      });
    if (!candidates.length) {
      candidates = Array.from(document.body.children)
        .filter((node): node is HTMLElement => node instanceof HTMLElement)
        .filter((node) => !node.matches("script,style,link,main,nav,header,footer,aside,[role]"))
        .filter((node) => Boolean(node.textContent?.trim() || node.querySelector("img,video,iframe,canvas")));
    }
    candidates = candidates.filter((node, index, all) => all.indexOf(node) === index);
    candidates.forEach((node, index) => {
      node.setAttribute("role", "region");
      if (!node.hasAttribute("aria-label") && !node.hasAttribute("aria-labelledby")) {
        const heading = node.querySelector("h1,h2,h3,h4,h5,h6")?.textContent?.trim();
        node.setAttribute("aria-label", heading || `Page section ${index + 1}`);
      }
    });
    finish(
      regionIssues[0],
      candidates.length ? "applied" : "manual",
      candidates.length ? `Added ${candidates.length} named page region${candidates.length === 1 ? "" : "s"}.` : "Landmark boundaries require manual page-structure review.",
    );
  }

  for (const issue of pageIssues) {
    if (issue.ruleId === "region") continue;
    if (issue.source === "ai" || issue.ruleId.startsWith("ai/")) {
      finish(issue, "manual", "AI judgment requires human review before implementation.");
      continue;
    }

    const rule = issue.ruleId.toLowerCase();
    if (rule === "html-has-lang") {
      document.documentElement.lang ||= "en";
      finish(issue, "applied", "Declared a document language; confirm the language value with the content owner.");
      continue;
    }
    if (rule === "document-title") {
      const heading = document.querySelector("h1")?.textContent?.trim();
      document.title = heading || location.hostname || "Web page";
      finish(issue, "applied", "Added a descriptive document title derived from the page heading or host.");
      continue;
    }

    const element = query(issue.target);
    if (!element) {
      finish(issue, "manual", "The original selector no longer resolves on the live page.");
      continue;
    }

    if (rule.includes("color-contrast")) {
      const measuredBackground = issue.suggestedFix?.match(/background color:\s*(#[0-9a-f]{6})/i)?.[1];
      const computedBackground = getComputedStyle(element).backgroundColor.match(/\d+/g)?.slice(0, 3);
      const background = measuredBackground || (computedBackground?.length === 3
        ? `#${computedBackground.map((value) => Number(value).toString(16).padStart(2, "0")).join("")}`
        : "#ffffff");
      const foreground = bestTextColor(background);
      element.style.setProperty("color", foreground, "important");
      finish(issue, "applied", `Set text to ${foreground} against ${background}.`);
    } else if (rule.includes("target-size")) {
      element.style.setProperty("display", "inline-flex", "important");
      element.style.setProperty("align-items", "center", "important");
      element.style.setProperty("justify-content", "center", "important");
      element.style.setProperty("min-width", "24px", "important");
      element.style.setProperty("min-height", "24px", "important");
      element.style.setProperty("padding-block", "3px", "important");
      finish(issue, "applied", "Enforced the WCAG 2.2 minimum target dimensions and spacing.");
    } else if (rule.includes("heading-order") && /^H[3-6]$/.test(element.tagName)) {
      const level = Math.max(2, Number(element.tagName.slice(1)) - 1);
      const replacement = document.createElement(`h${level}`);
      for (const attr of Array.from(element.attributes)) replacement.setAttribute(attr.name, attr.value);
      replacement.innerHTML = element.innerHTML;
      element.replaceWith(replacement);
      finish(issue, "applied", `Changed the heading to h${level}.`);
    } else if (rule.includes("link-name") || rule.includes("button-name") || rule.includes("aria-command-name")) {
      const visible = element.textContent?.replace(/\s+/g, " ").trim();
      const imageAlt = element.querySelector("img[alt]")?.getAttribute("alt")?.trim();
      const nearbyHeading = element.closest("article,section,li,div")?.querySelector("h1,h2,h3,h4,h5,h6")?.textContent?.trim();
      const destination = humanizeUrl(element.getAttribute("href") || "");
      const label = visible || imageAlt || destination || nearbyHeading;
      if (!label) finish(issue, "manual", "A content owner must provide the control's purpose.");
      else {
        element.setAttribute("aria-label", label.slice(0, 120));
        finish(issue, "applied", `Added the accessible name “${label.slice(0, 120)}”.`);
      }
    } else if (rule === "label" || rule.includes("select-name") || rule.includes("form-field")) {
      const label = element.getAttribute("placeholder") || element.getAttribute("name") || element.getAttribute("id");
      if (!label) finish(issue, "manual", "A content owner must provide a meaningful visible field label.");
      else {
        element.setAttribute("aria-label", label.replace(/[-_]+/g, " "));
        finish(issue, "applied", "Added a programmatic field name; a visible label remains preferable.");
      }
    } else if (rule.includes("image-alt") || rule.includes("object-alt") || rule.includes("input-image-alt")) {
      finish(issue, "manual", "Accurate alternative text requires knowing the image's purpose; it was not invented automatically.");
    } else if (rule.includes("tabindex")) {
      element.setAttribute("tabindex", "0");
      finish(issue, "applied", "Restored the element to the natural keyboard tab order.");
    } else {
      finish(issue, "unsupported", "This rule is reported but is not safe to modify automatically.");
    }
  }

  return outcomes;
}
