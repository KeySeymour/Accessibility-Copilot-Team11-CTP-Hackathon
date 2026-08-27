// lib/types.ts — shared shapes for the scan/issue data the API returns.
// Kept in one place so the server components that fetch and the client
// components that render agree on the contract.

export type Severity = "high" | "medium" | "low";

/** Lifecycle a scan moves through; the analyzing page polls until it leaves. */
export type ScanStatus = "queued" | "rendering" | "analyzing" | "complete" | "failed";

/**
 * Where an issue came from.
 *
 * "axe" — a deterministic rule violation. Authoritative, counts toward the score.
 * "ai"  — a Gemini suggestion about something a rule checker can't judge
 *         (vague link text, unhelpful alt text, incoherent heading order).
 *         Labelled as a suggestion in the UI and deliberately excluded from the
 *         score, so a model's opinion never moves a number users read as
 *         objective.
 */
export type IssueSource = "axe" | "ai";

export interface BoundingBox {
  /** Percentages of the screenshot's width/height, so the overlay scales. */
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Issue {
  id: string;
  ruleId: string;
  severity: Severity;
  title: string;
  wcagRef: string;
  /** Plain-language explanation — branding §1 "Plain language first". */
  whyItMatters?: string;
  suggestedFix?: string;
  /** Deque rule documentation for this violation. */
  helpUrl?: string;
  /** CSS selector axe reported, used to re-locate the element for a fix. */
  target?: string;
  /** Outer HTML of the offending element, trimmed for display. */
  html?: string;
  /** Populated for contrast rules: current vs. recommended ratio. */
  contrast?: { current: number; recommended: number };
  box?: BoundingBox;
  source?: IssueSource;
  /**
   * Surrounding DOM captured at scan time (see lib/scan/context.ts). Opaque
   * here because the shape varies by rule; the fix route passes it straight
   * through to the model.
   */
  context?: unknown;
  /** A previously generated fix, cached so it survives navigation. */
  fix?: GeneratedFix;
  /** Set only when the user says they applied it — not when one is generated. */
  fixApplied?: boolean;
}

/**
 * A generated fix, as returned by POST /api/issues/[issueId]/fix.
 *
 * Lives here rather than in lib/scan/gemini.ts because the Fix Studio is a
 * client component: gemini.ts is marked server-only, so the client must not
 * import from it even for a type.
 */
export interface GeneratedFix {
  explanation: string;
  /** The corrected markup for this element. */
  after: string;
  /** CSS rule or attribute change, when the fix is expressible as one. */
  patch: string | null;
  /** What a human must check before applying — e.g. that alt text is accurate. */
  caveat: string | null;
  before?: string | null;
}
