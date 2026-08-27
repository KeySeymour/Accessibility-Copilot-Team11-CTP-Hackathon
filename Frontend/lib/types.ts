// lib/types.ts — shared shapes for the scan/issue data the API returns.
// Kept in one place so the server components that fetch and the client
// components that render agree on the contract.

export type Severity = "high" | "medium" | "low";

/** Lifecycle a scan moves through; the analyzing page polls until it leaves. */
export type ScanStatus = "queued" | "rendering" | "analyzing" | "complete" | "failed";

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
  fixApplied?: boolean;
}
