// lib/scan/extract.ts
//
// Pulls the accessibility-relevant elements out of a rendered page so the AI
// pass has something compact and structured to reason about.
//
// Runs inside the browser via page.evaluate(), so the function body must be
// self-contained — no imports, no closures over Node-side variables.

import "server-only";

import type { Page } from "playwright";
import type { PageElement, PageExtract } from "@/lib/scan/gemini";
import { capElements } from "@/lib/scan/gemini";

export async function extractPage(page: Page, url: string): Promise<PageExtract> {
  const data = await page.evaluate(() => {
    const out: Array<Record<string, unknown>> = [];
    let n = 0;

    /** A short, stable selector for an element — good enough to re-find it. */
    const selectorFor = (el: Element): string => {
      if (el.id) return `#${CSS.escape(el.id)}`;

      const parts: string[] = [];
      let node: Element | null = el;

      while (node && node !== document.body && parts.length < 4) {
        const tag = node.tagName.toLowerCase();
        const parent: Element | null = node.parentElement;

        if (parent) {
          const sameTag = Array.from(parent.children).filter((c) => c.tagName === node!.tagName);
          parts.unshift(sameTag.length > 1 ? `${tag}:nth-of-type(${sameTag.indexOf(node) + 1})` : tag);
        } else {
          parts.unshift(tag);
        }

        node = parent;
      }

      return parts.join(" > ") || el.tagName.toLowerCase();
    };

    const visible = (el: Element): boolean => {
      const style = window.getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden") return false;
      if (el.getAttribute("aria-hidden") === "true") return false;
      const r = el.getBoundingClientRect();
      // Links inside a collapsed menu still matter, so only drop true zero-boxes.
      return r.width > 0 || r.height > 0;
    };

    const text = (el: Element): string => (el.textContent ?? "").replace(/\s+/g, " ").trim();

    /** Approximates the accessible name well enough to spot vague ones. */
    const name = (el: Element): string => {
      const label = el.getAttribute("aria-label");
      if (label) return label.trim();

      const by = el.getAttribute("aria-labelledby");
      if (by) {
        const parts = by
          .split(/\s+/)
          .map((id) => document.getElementById(id))
          .filter(Boolean)
          .map((n) => text(n as Element));
        if (parts.length) return parts.join(" ");
      }

      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
        if (el.labels?.length) return text(el.labels[0]);
        const title = el.getAttribute("title");
        if (title) return title.trim();
        return "";
      }

      return text(el);
    };

    const push = (el: Element, kind: string, extra: Record<string, unknown>) => {
      if (!visible(el)) return;
      n += 1;
      out.push({ ref: `e${n}`, kind, selector: selectorFor(el), ...extra });
    };

    for (const el of Array.from(document.querySelectorAll("h1,h2,h3,h4,h5,h6"))) {
      push(el, "heading", { level: Number(el.tagName[1]), text: text(el) });
    }

    for (const el of Array.from(document.querySelectorAll("a[href]"))) {
      push(el, "link", {
        text: text(el),
        accessibleName: name(el),
        href: (el as HTMLAnchorElement).getAttribute("href") ?? "",
      });
    }

    for (const el of Array.from(document.querySelectorAll("button,[role='button'],input[type='submit'],input[type='button']"))) {
      push(el, "button", { text: text(el), accessibleName: name(el) });
    }

    for (const el of Array.from(document.querySelectorAll("img,[role='img']"))) {
      push(el, "image", {
        alt: el.getAttribute("alt") ?? "",
        accessibleName: name(el),
        href: (el.getAttribute("src") ?? "").slice(0, 120),
      });
    }

    for (const el of Array.from(document.querySelectorAll("input,select,textarea"))) {
      const type = el.getAttribute("type") ?? el.tagName.toLowerCase();
      if (type === "hidden" || type === "submit" || type === "button") continue;
      push(el, "field", {
        accessibleName: name(el),
        placeholder: el.getAttribute("placeholder") ?? "",
        type,
      });
    }

    for (const el of Array.from(document.querySelectorAll("main,nav,header,footer,aside,[role='main'],[role='navigation'],[role='banner'],[role='contentinfo']"))) {
      push(el, "landmark", {
        role: el.getAttribute("role") ?? el.tagName.toLowerCase(),
        accessibleName: name(el).slice(0, 60),
      });
    }

    return {
      title: document.title,
      lang: document.documentElement.lang,
      elements: out,
    };
  });

  return {
    url,
    title: data.title,
    lang: data.lang,
    elements: capElements(data.elements as unknown as PageElement[]),
  };
}
