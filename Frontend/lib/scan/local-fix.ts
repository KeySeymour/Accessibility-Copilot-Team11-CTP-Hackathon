import "server-only";

import type { GeneratedFix } from "@/lib/types";

export interface FixableIssue {
  ruleId: string;
  title: string;
  html?: string;
  suggestedFix?: string;
  contrast?: { current: number; recommended: number };
}

function escapeAttribute(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function addAttribute(html: string, name: string, value: string): string {
  const attribute = `${name}="${escapeAttribute(value)}"`;
  const existing = new RegExp(`\\s${name}=(?:"[^"]*"|'[^']*'|[^\\s>]+)`, "i");
  if (existing.test(html)) return html.replace(existing, ` ${attribute}`);
  return html.replace(/^<([\w:-]+)/, `<$1 ${attribute}`);
}

function addStyle(html: string, declaration: string): string {
  const style = /\sstyle=("([^"]*)"|'([^']*)')/i;
  if (style.test(html)) {
    return html.replace(style, (_match, _quoted, doubleValue, singleValue) => {
      const current = doubleValue ?? singleValue ?? "";
      const separator = current.trim() && !current.trim().endsWith(";") ? "; " : "";
      return ` style="${escapeAttribute(`${current}${separator}${declaration}`)}"`;
    });
  }
  return addAttribute(html, "style", declaration);
}

function labelFrom(issue: FixableIssue): string {
  const placeholder = issue.html?.match(/placeholder=(?:"([^"]+)"|'([^']+)')/i);
  const text = placeholder?.[1] ?? placeholder?.[2];
  if (text) return text.replace(/[.…]+$/, "").trim();
  const visibleText = issue.html
    ?.replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (visibleText) return visibleText.slice(0, 80);
  const href = issue.html?.match(/href=(?:"([^"]+)"|'([^']+)')/i);
  const hrefValue = href?.[1] ?? href?.[2];
  if (hrefValue) {
    try {
      const url = new URL(hrefValue, "https://preview.local");
      const slug = url.pathname.split("/").filter(Boolean).at(-1);
      if (slug) return slug.replace(/[-_]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()).slice(0, 80);
    } catch {
      // Fall through to a conservative generic label.
    }
  }
  if (/search/i.test(issue.title + issue.suggestedFix)) return "Search";
  if (/close/i.test(issue.title + issue.suggestedFix)) return "Close";
  return "Open linked page";
}

/**
 * Produces a conservative fix without an external model. These transformations
 * cover axe's common, mechanically actionable failures. Ambiguous content is
 * marked for human review instead of being invented.
 */
export function generateLocalFix(issue: FixableIssue): GeneratedFix {
  const before = issue.html?.trim() || `<div>${escapeAttribute(issue.title)}</div>`;
  const rule = issue.ruleId.toLowerCase();
  let after = before;
  let patch: string | null = null;
  let caveat: string | null = null;
  let explanation = issue.suggestedFix || `Updates this element to address “${issue.title}”.`;

  if (rule.includes("color-contrast")) {
    const background = issue.suggestedFix?.match(/background color:\s*(#[0-9a-f]{6})/i)?.[1];
    const foreground = background ? bestTextColor(background) : "#000000";
    after = addStyle(before, `color: ${foreground} !important`);
    patch = `color: ${foreground}; /* selected for contrast against the measured background */`;
    explanation = "Uses a foreground color selected against the measured background to meet the required text contrast without replacing the design’s background.";
  } else if (rule.includes("target-size")) {
    after = addStyle(before, "display: inline-flex; align-items: center; min-height: 24px; padding-block: 3px");
    patch = "display: inline-flex; align-items: center; min-height: 24px; padding-block: 3px;";
    explanation = "Makes the interactive target at least 24 pixels high while preserving the page’s visual design.";
  } else if (rule.includes("image-alt") || rule.includes("object-alt") || rule.includes("input-image-alt")) {
    after = addAttribute(before, "alt", "TODO: describe the image purpose");
    patch = 'alt="TODO: describe the image purpose"';
    caveat = "Replace the TODO with a concise description of the image’s purpose, or use an empty alt value when it is purely decorative.";
    explanation = "Adds an alt-text placeholder so the image has an explicit text alternative to complete.";
  } else if (rule.includes("button-name") || rule.includes("link-name") || rule.includes("aria-command-name")) {
    const label = labelFrom(issue);
    after = addAttribute(before, "aria-label", label);
    patch = `aria-label="${label}"`;
    caveat = label === "Open linked page" ? "Replace the generic label with the control’s exact destination before shipping." : null;
    explanation = "Adds an accessible name so assistive technology can announce the control’s purpose.";
  } else if (rule.includes("label") || rule.includes("form-field") || rule.includes("select-name")) {
    const label = labelFrom(issue);
    after = addAttribute(before, "aria-label", label);
    patch = `aria-label="${label}"`;
    caveat = "A visible <label> connected with for/id is preferable when the design allows it.";
    explanation = "Gives the form control a programmatic name; a persistent visible label should be used in the final design.";
  } else if (rule === "region" || rule.includes("landmark")) {
    after = '<main id="main-content" aria-label="Primary page content">\n  <!-- Existing page sections remain here -->\n</main>';
    patch = "Place the primary content inside one <main> landmark and navigation groups inside named <nav> landmarks.";
    caveat = "Choose landmark boundaries from the full page structure; do not add a landmark to every individual element.";
    explanation = "Groups the page-level landmark finding into one structural recommendation instead of repeating it for every descendant.";
  } else if (rule.includes("html-has-lang")) {
    after = addAttribute(before, "lang", "en");
    patch = 'lang="en"';
    caveat = "Confirm that English is the primary language of this page.";
    explanation = "Declares the page language so screen readers use the appropriate pronunciation rules.";
  } else if (rule.includes("heading-order")) {
    after = before.replace(/^<h([3-6])(\s|>)/i, (_match, level, suffix) => `<h${Math.max(2, Number(level) - 1)}${suffix}`)
      .replace(/<\/h([3-6])>\s*$/i, (_match, level) => `</h${Math.max(2, Number(level) - 1)}>`);
    patch = "Use the next logical heading level in the document outline.";
    caveat = "Review surrounding headings to confirm the resulting outline reflects the content hierarchy.";
    explanation = "Moves the heading toward the next logical level to make the document outline easier to navigate.";
  } else if (rule.includes("tabindex")) {
    after = addAttribute(before, "tabindex", "0");
    patch = 'tabindex="0"';
    explanation = "Places the element in the natural keyboard tab order without assigning a positive tab index.";
  } else if (rule.includes("focus")) {
    after = addStyle(before, "outline: 3px solid #6d28d9; outline-offset: 3px");
    patch = ":focus-visible { outline: 3px solid #6d28d9; outline-offset: 3px; }";
    explanation = "Adds a strong visible focus indicator for keyboard users.";
  } else {
    after = addAttribute(before, "data-accessibility-review", "recommended-fix");
    patch = issue.suggestedFix || "Review and apply the recommendation shown for this issue.";
    caveat = "This issue needs page context or human judgment, so the preview marks it without inventing content.";
  }

  return { before, explanation, after, patch, caveat, source: "local" };
}

function bestTextColor(background: string): "#ffffff" | "#000000" {
  const rgb = [1, 3, 5].map((offset) => Number.parseInt(background.slice(offset, offset + 2), 16) / 255);
  const channels = rgb.map((value) => value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  const luminance = 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  return 1.05 / (luminance + 0.05) >= (luminance + 0.05) / 0.05 ? "#ffffff" : "#000000";
}

/** Remove executable markup before a generated fragment reaches srcDoc. */
export function sanitizeFixMarkup(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\s(?:href|src)\s*=\s*(["'])\s*javascript:[\s\S]*?\1/gi, "");
}
