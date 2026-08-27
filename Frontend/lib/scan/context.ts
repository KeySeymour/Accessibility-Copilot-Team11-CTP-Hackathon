// lib/scan/context.ts
//
// Captures the surrounding DOM an issue needs before a fix can be written.
//
// WHY THIS EXISTS. axe hands back `node.html`, the offending element's markup
// and nothing else. For an element-scoped rule that's enough. For a
// document-scoped rule it is actively useless: `landmark-one-main` fires on
// <html>, so `node.html` is the 16 characters `<html lang="en">`. Asking a
// model "where should <main> go?" while showing it only that is unanswerable,
// and a well-behaved model refuses rather than inventing markup.
//
// TIMING. This has to run while Playwright still has the page open, during the
// scan. Once the browser closes the context is gone, and re-fetching later
// risks describing a page that has since changed.
//
// Different rules need different context, so the capture is scoped by rule —
// sending a full body skeleton for a contrast failure would be noise, and
// sending computed colours for a landmark rule would be useless.

import "server-only";

import type { Page } from "playwright";

export type ContextKind = "document" | "contrast" | "form" | "image" | "element";

export interface IssueContext {
  kind: ContextKind;
  /** Depth-limited outline of <body>, for rules about page structure. */
  bodySkeleton?: string;
  existingLandmarks?: string[];
  /** The element itself, with a far higher cap than axe's own summary. */
  outerHTML?: string;
  /** Ancestor tags/classes, so a fix can say where the change belongs. */
  parentChain?: string;
  computed?: {
    color: string;
    backgroundColor: string;
    fontSize: string;
    fontWeight: string;
    className: string;
  };
  /** Copy around an image, so alt text can be grounded rather than invented. */
  nearbyText?: string;
  /** The wrapping <form>, for label rules. */
  formHTML?: string;
}

// Rules whose target is the document or a large region, where the element
// alone tells you nothing about where the fix goes.
const DOCUMENT_RULES = new Set([
  "landmark-one-main",
  "landmark-unique",
  "landmark-complementary-is-top-level",
  "region",
  "bypass",
  "page-has-heading-one",
  "heading-order",
  "document-title",
  "html-has-lang",
  "html-lang-valid",
  "landmark-no-duplicate-banner",
  "landmark-no-duplicate-contentinfo",
]);

const CONTRAST_RULES = new Set(["color-contrast", "color-contrast-enhanced", "link-in-text-block"]);

const FORM_RULES = new Set([
  "label",
  "label-title-only",
  "form-field-multiple-labels",
  "select-name",
  "input-button-name",
  "aria-input-field-name",
]);

const IMAGE_RULES = new Set(["image-alt", "image-redundant-alt", "input-image-alt", "area-alt", "role-img-alt"]);

export function contextKindFor(ruleId: string): ContextKind {
  if (DOCUMENT_RULES.has(ruleId)) return "document";
  if (CONTRAST_RULES.has(ruleId)) return "contrast";
  if (FORM_RULES.has(ruleId)) return "form";
  if (IMAGE_RULES.has(ruleId)) return "image";
  // AI-sourced findings are about wording, so the element and its neighbours
  // are the useful context.
  return "element";
}

/**
 * Runs in the page. Returns null rather than throwing if the selector no longer
 * resolves — a missing context degrades the fix, it doesn't fail the scan.
 */
export async function captureContext(
  page: Page,
  selector: string | undefined,
  kind: ContextKind,
): Promise<IssueContext | null> {
  try {
    const data = await page.evaluate(
      ({ selector, kind }) => {
        const el = selector ? document.querySelector(selector) : null;

        const describe = (node: Element): string => {
          const tag = node.tagName.toLowerCase();
          const id = node.id ? `#${node.id}` : "";
          const cls =
            typeof node.className === "string" && node.className.trim()
              ? "." + node.className.trim().split(/\s+/).slice(0, 2).join(".")
              : "";
          return `${tag}${id}${cls}`;
        };

        // Depth-limited outline: enough to see where landmarks belong without
        // pasting the entire document into the prompt.
        const skeleton = (node: Element, depth = 0): string => {
          if (depth > 3) return "";
          const pad = "  ".repeat(depth);
          const leaf =
            node.children.length === 0 ? ` "${(node.textContent || "").replace(/\s+/g, " ").trim().slice(0, 60)}"` : "";
          const children = Array.from(node.children)
            .slice(0, 10)
            .map((c) => skeleton(c, depth + 1))
            .join("");
          return `${pad}<${describe(node)}>${leaf}\n${children}`;
        };

        const parents: string[] = [];
        let p = el?.parentElement ?? null;
        while (p && p !== document.documentElement && parents.length < 5) {
          parents.push(describe(p));
          p = p.parentElement;
        }

        const out: Record<string, unknown> = {
          outerHTML: el ? el.outerHTML.slice(0, 3000) : null,
          parentChain: parents.length ? parents.reverse().join(" > ") : null,
        };

        if (kind === "document") {
          out.bodySkeleton = skeleton(document.body);
          out.existingLandmarks = Array.from(
            document.querySelectorAll("main,nav,header,footer,aside,[role=main],[role=navigation],[role=banner]"),
          ).map((n) => n.tagName.toLowerCase());
        }

        if (kind === "contrast" && el) {
          const cs = window.getComputedStyle(el);
          // Walk up for the first non-transparent background — the failing
          // element usually inherits its background from an ancestor.
          let bg = cs.backgroundColor;
          let node: Element | null = el;
          while (node && (bg === "rgba(0, 0, 0, 0)" || bg === "transparent")) {
            node = node.parentElement;
            if (!node) break;
            bg = window.getComputedStyle(node).backgroundColor;
          }
          out.computed = {
            color: cs.color,
            backgroundColor: bg || "rgb(255, 255, 255)",
            fontSize: cs.fontSize,
            fontWeight: cs.fontWeight,
            className: typeof el.className === "string" ? el.className : "",
          };
        }

        if (kind === "image" && el) {
          const parent = el.parentElement;
          out.nearbyText = parent ? (parent.textContent || "").replace(/\s+/g, " ").trim().slice(0, 300) : null;
        }

        if (kind === "form" && el) {
          const form = el.closest("form");
          out.formHTML = form ? form.outerHTML.slice(0, 2000) : null;
        }

        return out;
      },
      { selector: selector ?? "", kind },
    );

    return { kind, ...data } as IssueContext;
  } catch {
    return null;
  }
}
