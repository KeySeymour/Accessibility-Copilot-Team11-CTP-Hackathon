// lib/scan/score.ts
//
// Scoring model: a weighted pass rate over the rules that actually applied to
// the page.
//
//   score = 100 × Σ weight(passed rules) / Σ weight(passed ∪ violated rules)
//
// Three deliberate choices, because a score people act on should be defensible:
//
// 1. NORMALIZED BY APPLICABLE RULES, not a flat "100 − issues". A rule that
//    couldn't apply (no images on the page → no alt-text rule) belongs in
//    neither numerator nor denominator. Otherwise a large page is punished for
//    being large, and a nearly-empty page scores well for having nothing to
//    get wrong.
//
// 2. BINARY PER RULE, not per failing element. One rule broken across 200
//    elements is usually one mistake in a component, not 200 mistakes. Element
//    counts still drive the issue list ordering — they just don't compound the
//    score. This mirrors how Lighthouse weights its audits.
//
// 3. `incomplete` RESULTS ARE EXCLUDED. Those are the "a human needs to look at
//    this" cases. Counting them as passes inflates the score; counting them as
//    failures punishes pages for ambiguity axe couldn't resolve. They're
//    surfaced separately as a needs-review count instead.
//
// This is an automated score. It cannot see whether the reading order makes
// sense, whether alt text is accurate, or whether a flow is usable with a
// screen reader — which is why the UI never calls it a compliance guarantee.

import type { AxeResults, ImpactValue } from "axe-core";

// axe's ImpactValue includes null; the table is keyed on the non-null members.
const IMPACT_WEIGHT: Record<NonNullable<ImpactValue>, number> = {
  critical: 10,
  serious: 7,
  moderate: 3,
  minor: 1,
};

/** axe reports `impact: null` on passing rules, so unknown defaults to moderate. */
const DEFAULT_WEIGHT = IMPACT_WEIGHT.moderate;

function weightOf(impact: ImpactValue | undefined): number {
  return impact ? IMPACT_WEIGHT[impact] : DEFAULT_WEIGHT;
}

export interface ScoreBreakdown {
  score: number;
  passedRules: number;
  violatedRules: number;
  needsReview: number;
}

export function scoreResults(results: AxeResults): ScoreBreakdown {
  let earned = 0;
  let possible = 0;

  for (const rule of results.passes) {
    const w = weightOf(rule.impact);
    possible += w;
    earned += w;
  }

  for (const rule of results.violations) {
    // A violated rule earns nothing, regardless of how many nodes failed it.
    possible += weightOf(rule.impact);
  }

  // No rule applied at all — a blank or unrenderable page. Report 0 rather than
  // a vacuous 100; the scan is not evidence of accessibility.
  const score = possible === 0 ? 0 : Math.round((earned / possible) * 100);

  return {
    score,
    passedRules: results.passes.length,
    violatedRules: results.violations.length,
    needsReview: results.incomplete.length,
  };
}
