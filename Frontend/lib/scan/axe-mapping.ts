// lib/scan/axe-mapping.ts
//
// Translates axe-core results into our Issue shape. This is where the WCAG
// "comparison" actually lands: axe already encodes ~90 rules against specific
// success criteria, so we read its output rather than maintaining our own
// WCAG table.
//
// Tag vocabulary axe emits:
//   wcag2a / wcag2aa / wcag21a / wcag21aa / wcag22aa  → version + conformance level
//   wcag143 / wcag412 / wcag2410                      → success criterion (1.4.3, 4.1.2, 2.4.10)
//   best-practice                                     → not a WCAG criterion at all

import type { ImpactValue, Result } from "axe-core";
import type { Issue, Severity } from "@/lib/types";

// axe's ImpactValue includes null, so the lookup table is keyed on the
// non-null members and the null case is handled by the caller.
type Impact = NonNullable<ImpactValue>;

/**
 * axe impact → our three-level severity (mockup 2.4 groups High/Medium/Low).
 * critical and serious both surface as High: from a user's point of view a
 * blocked flow is a blocked flow.
 */
const SEVERITY_BY_IMPACT: Record<Impact, Severity> = {
  critical: "high",
  serious: "high",
  moderate: "medium",
  minor: "low",
};

export function severityOf(impact: ImpactValue | undefined): Severity {
  return impact ? SEVERITY_BY_IMPACT[impact] : "medium";
}

/** "wcag2410" → "2.4.10". Level tags like "wcag21aa" contain letters and won't match. */
const SC_TAG = /^wcag(\d)(\d)(\d{1,2})$/;
const LEVEL_TAG = /^wcag2\d?(a{1,3})$/;

/**
 * Builds the human-facing reference, e.g. "WCAG 1.4.3 (AA)".
 * Rules tagged only `best-practice` aren't WCAG requirements, and saying so
 * matters — the product must never overstate what a failure means (§13).
 */
export function wcagRefOf(tags: string[]): string {
  const criteria = tags
    .map((tag) => tag.match(SC_TAG))
    .filter((m): m is RegExpMatchArray => m !== null)
    .map((m) => `${m[1]}.${m[2]}.${m[3]}`);

  const levels = tags
    .map((tag) => tag.match(LEVEL_TAG))
    .filter((m): m is RegExpMatchArray => m !== null)
    .map((m) => m[1].toUpperCase());

  if (criteria.length === 0) {
    return tags.includes("best-practice") ? "Best practice" : "Accessibility rule";
  }

  // Prefer the strictest level listed (A < AA < AAA by string length).
  const level = levels.sort((a, b) => b.length - a.length)[0];
  const sc = criteria.sort().join(", ");

  return level ? `WCAG ${sc} (${level})` : `WCAG ${sc}`;
}

/**
 * Pulls the contrast numbers out of a color-contrast violation. axe puts them
 * on the failing check's `data`, with the expected value as a "4.5:1" string.
 */
function contrastOf(node: Result["nodes"][number]): { current: number; recommended: number } | undefined {
  for (const check of [...node.any, ...node.all, ...node.none]) {
    const data = check.data as { contrastRatio?: number; expectedContrastRatio?: string | number } | undefined;
    if (!data || typeof data.contrastRatio !== "number") continue;

    const expected =
      typeof data.expectedContrastRatio === "number"
        ? data.expectedContrastRatio
        : Number.parseFloat(String(data.expectedContrastRatio ?? ""));

    if (!Number.isFinite(expected)) continue;

    return { current: Math.round(data.contrastRatio * 100) / 100, recommended: expected };
  }
  return undefined;
}

/**
 * axe's `failureSummary` is the actionable part — "Fix any of the following:
 * Element has insufficient color contrast of 2.4:1...". Strip the boilerplate
 * heading so the Fix Studio panel reads as plain language (§1).
 */
function suggestedFixOf(node: Result["nodes"][number]): string | undefined {
  const summary = node.failureSummary?.trim();
  if (!summary) return undefined;

  return summary
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !/^fix (any|all) of the following:?$/i.test(line))
    .join(" ")
    .trim();
}

/** axe targets can nest for iframes; we only handle top-document selectors. */
function selectorOf(node: Result["nodes"][number]): string | undefined {
  const first = node.target[0];
  return typeof first === "string" ? first : undefined;
}

export interface MappedIssue extends Omit<Issue, "id" | "fixApplied"> {
  /** Kept separate from the stored fields so the runner can look up a box. */
  selector?: string;
}

/**
 * Flattens axe violations (rule → many failing nodes) into one Issue per node,
 * because the UI marks up individual elements on the screenshot.
 */
export function mapViolations(violations: Result[]): MappedIssue[] {
  const issues: MappedIssue[] = [];

  for (const violation of violations) {
    for (const node of violation.nodes) {
      const selector = selectorOf(node);

      issues.push({
        ruleId: violation.id,
        // A node can be less severe than its rule's headline impact.
        severity: severityOf(node.impact ?? violation.impact),
        title: violation.help,
        wcagRef: wcagRefOf(violation.tags),
        whyItMatters: violation.description,
        suggestedFix: suggestedFixOf(node),
        helpUrl: violation.helpUrl,
        target: selector,
        html: node.html?.slice(0, 500),
        contrast: contrastOf(node),
        selector,
      });
    }
  }

  return issues;
}
