// lib/scan/gemini.ts
//
// The AI half of the pipeline described in the merge-logic design:
// "Playwright render -> axe + Gemini in parallel -> merge -> score".
//
// WHAT THIS IS FOR. axe-core is deterministic and authoritative for the rules
// it encodes — do not ask a model to re-check contrast ratios or missing alt
// attributes, because axe already measures those exactly and a model will only
// add noise and disagreement. Gemini's job is the complement: the judgement
// calls axe explicitly cannot make.
//
//   axe knows       an <img> has no alt attribute
//   Gemini judges   the alt text that IS there says "image1.png"
//
//   axe knows       a link has an accessible name
//   Gemini judges   that name is "click here", meaningless out of context
//
//   axe knows       headings exist
//   Gemini judges   the heading order skips h1 -> h3 and reads incoherently
//
// TRUST LEVEL. Everything this module returns is a SUGGESTION, stored with
// source="ai" and labelled as such in the UI. AI findings never feed the score
// (see lib/scan/score.ts) — a model's opinion must not move a number users
// read as objective.
//
// FAILURE POLICY. Every export degrades to null/[] rather than throwing. A
// missing key, a rate limit, or a malformed response must never fail a scan
// that axe already completed successfully.

import "server-only";

import { GoogleGenAI, Type } from "@google/genai";
import type { GeneratedFix, Severity } from "@/lib/types";

const DEFAULT_MODEL = "gemini-2.5-flash";

/** Cap on elements sent per category — keeps the prompt bounded on large pages. */
const MAX_PER_CATEGORY = 40;

export function geminiModel(): string {
  return process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;
}

/**
 * True when an AI pass should run. Checked before every call so the whole
 * product works with no key configured — scans just run axe-only.
 */
export function isGeminiEnabled(): boolean {
  if (process.env.GEMINI_ENABLED?.trim() === "0") return false;
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

function client(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
}

// ---------------------------------------------------------------------------
// Page extract — what we actually send
// ---------------------------------------------------------------------------

/**
 * A compact, accessibility-relevant summary of the page.
 *
 * Sending raw HTML would blow the context window and bury the signal. Each
 * element carries a short `ref` ("e7") and the model answers with that ref, so
 * it never has to invent a CSS selector — we map the ref back to the real
 * selector ourselves. That removes a whole class of hallucinated targets.
 */
export interface PageElement {
  ref: string;
  kind: "link" | "button" | "image" | "field" | "heading" | "landmark";
  selector: string;
  text?: string;
  accessibleName?: string;
  alt?: string;
  level?: number;
  role?: string;
  href?: string;
  placeholder?: string;
  type?: string;
}

export interface PageExtract {
  url: string;
  title: string;
  lang: string;
  elements: PageElement[];
}

export interface AiFinding {
  ref: string | null;
  category: string;
  severity: Severity;
  title: string;
  whyItMatters: string;
  suggestedFix: string;
  confidence: number;
}

const FINDINGS_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    findings: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          ref: {
            type: Type.STRING,
            description: "The ref of the element this is about, exactly as given. Use \"\" for a whole-page issue.",
          },
          category: {
            type: Type.STRING,
            description: "Short kebab-case slug, e.g. vague-link-text, uninformative-alt, heading-order.",
          },
          severity: { type: Type.STRING, enum: ["high", "medium", "low"] },
          title: { type: Type.STRING, description: "Under 60 characters, plain language, no jargon." },
          whyItMatters: {
            type: Type.STRING,
            description: "One or two sentences naming who this affects and how. No WCAG numbers.",
          },
          suggestedFix: { type: Type.STRING, description: "One concrete, specific change." },
          confidence: { type: Type.NUMBER, description: "0-1. Below 0.6 will be discarded." },
        },
        required: ["ref", "category", "severity", "title", "whyItMatters", "suggestedFix", "confidence"],
      },
    },
  },
  required: ["findings"],
};

const SYSTEM_INSTRUCTION = `You review web pages for accessibility problems that automated rule checkers cannot detect.

An axe-core scan has ALREADY run on this page. It has already caught every one of these, so do not report them:
- missing alt attributes, missing form labels, missing button/link accessible names
- colour contrast ratios
- invalid ARIA roles or attributes
- missing lang attribute, missing landmarks, duplicate IDs

Report ONLY judgement calls that require reading and understanding the content:
- Link or button text that is present but meaningless out of context ("click here", "read more", "learn more", bare URLs)
- Alt text that exists but does not describe the image ("image", "photo", "img_1234.png", the filename, or text repeating adjacent visible text)
- Labels or placeholders that are present but ambiguous, or a placeholder used INSTEAD of a label
- Heading structure that is technically valid but reads incoherently, or skipped levels that break the document outline
- Reading order or grouping that would confuse someone navigating linearly by screen reader
- Link text that is identical across links pointing to different destinations

Rules:
- Reference elements ONLY by the exact ref string given to you. Never invent a ref.
- Report each distinct problem once. Do not report the same problem on many elements separately; pick the clearest one.
- If the page has no problems of these kinds, return an empty findings array. Returning nothing is a correct and expected answer.
- Be conservative. A false positive costs the user more than a missed suggestion, because they must investigate it.
- Write plain language. No WCAG numbers, no jargon, no hedging.`;

/**
 * Runs the AI pass over a page extract.
 * Returns [] on any failure — the caller keeps its axe results either way.
 */
export async function findAiIssues(extract: PageExtract, screenshot?: Buffer): Promise<AiFinding[]> {
  const ai = client();
  if (!ai || !isGeminiEnabled()) return [];

  const prompt = [
    `URL: ${extract.url}`,
    `Title: ${extract.title || "(none)"}`,
    `Language: ${extract.lang || "(not set)"}`,
    "",
    "Elements on the page:",
    ...extract.elements.map((el) => `  ${el.ref} [${el.kind}] ${describe(el)}`),
  ].join("\n");

  try {
    const parts: Array<Record<string, unknown>> = [{ text: prompt }];

    // The screenshot helps with reading order and grouping, which are hard to
    // judge from a flat element list.
    if (screenshot && screenshot.byteLength < 4_000_000) {
      parts.push({ inlineData: { mimeType: "image/png", data: screenshot.toString("base64") } });
    }

    const response = await ai.models.generateContent({
      model: geminiModel(),
      contents: [{ role: "user", parts }],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: FINDINGS_SCHEMA,
        // Low temperature: this is an analysis task, not a creative one.
        temperature: 0.2,
      },
    });

    const raw = response.text;
    if (!raw) return [];

    const parsed = JSON.parse(raw) as { findings?: AiFinding[] };
    const validRefs = new Set(extract.elements.map((e) => e.ref));

    return (parsed.findings ?? [])
      // Drop low-confidence guesses and any hallucinated ref.
      .filter((f) => f.confidence >= 0.6)
      .filter((f) => !f.ref || validRefs.has(f.ref))
      .map((f) => ({ ...f, ref: f.ref || null }));
  } catch (err) {
    console.error("[gemini] issue pass failed:", err instanceof Error ? err.message : err);
    return [];
  }
}

function describe(el: PageElement): string {
  const bits: string[] = [];
  if (el.level) bits.push(`h${el.level}`);
  if (el.text) bits.push(`text=${JSON.stringify(truncate(el.text, 120))}`);
  if (el.accessibleName && el.accessibleName !== el.text) {
    bits.push(`name=${JSON.stringify(truncate(el.accessibleName, 120))}`);
  }
  if (el.alt !== undefined) bits.push(`alt=${JSON.stringify(truncate(el.alt, 120))}`);
  if (el.href) bits.push(`href=${JSON.stringify(truncate(el.href, 80))}`);
  if (el.placeholder) bits.push(`placeholder=${JSON.stringify(truncate(el.placeholder, 60))}`);
  if (el.type) bits.push(`type=${el.type}`);
  if (el.role) bits.push(`role=${el.role}`);
  return bits.join(" ") || "(empty)";
}

function truncate(s: string, n: number): string {
  const clean = s.replace(/\s+/g, " ").trim();
  return clean.length > n ? `${clean.slice(0, n)}…` : clean;
}

/** Trims each category so one enormous page can't dominate the prompt. */
export function capElements(elements: PageElement[]): PageElement[] {
  const seen = new Map<string, number>();
  const out: PageElement[] = [];

  for (const el of elements) {
    const n = seen.get(el.kind) ?? 0;
    if (n >= MAX_PER_CATEGORY) continue;
    seen.set(el.kind, n + 1);
    out.push(el);
  }

  return out;
}

// ---------------------------------------------------------------------------
// Fix generation — POST /api/issues/[issueId]/fix
// ---------------------------------------------------------------------------

const FIX_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    explanation: { type: Type.STRING, description: "One or two plain sentences on what this changes and why." },
    after: { type: Type.STRING, description: "The corrected HTML for this element only. No surrounding markup." },
    patch: {
      type: Type.STRING,
      description: "The CSS rule or attribute change, if expressible as one. Otherwise an empty string.",
    },
    caveat: {
      type: Type.STRING,
      description: "Anything a human must verify before applying, e.g. that alt text is actually accurate. Empty if none.",
    },
  },
  required: ["explanation", "after", "patch", "caveat"],
};

export async function generateFix(issue: {
  ruleId: string;
  title: string;
  html?: string;
  suggestedFix?: string;
  contrast?: { current: number; recommended: number };
}): Promise<GeneratedFix | null> {
  const ai = client();
  if (!ai || !isGeminiEnabled()) return null;

  const prompt = [
    `Rule: ${issue.ruleId}`,
    `Problem: ${issue.title}`,
    issue.suggestedFix ? `Checker said: ${issue.suggestedFix}` : null,
    issue.contrast
      ? `Measured contrast: ${issue.contrast.current}:1. Must be at least ${issue.contrast.recommended}:1.`
      : null,
    "",
    "Current element:",
    issue.html ?? "(not captured)",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const response = await ai.models.generateContent({
      model: geminiModel(),
      contents: prompt,
      config: {
        systemInstruction: `You fix accessibility problems in HTML. Return the corrected element only.

Rules:
- Change the minimum necessary. Preserve all existing classes, ids, data attributes, and content.
- For contrast, pick a colour that meets the required ratio AND stays close to the original hue, so the design still looks intended. State the new value.
- Never invent alt text describing an image you cannot see. Instead, write a placeholder like "TODO: describe what this image shows" and say so in the caveat.
- If a correct fix needs information you do not have, say exactly what is needed in the caveat rather than guessing.
- Plain language. No WCAG numbers.`,
        responseMimeType: "application/json",
        responseSchema: FIX_SCHEMA,
        temperature: 0.1,
      },
    });

    const raw = response.text;
    if (!raw) return null;

    const parsed = JSON.parse(raw) as GeneratedFix;

    return {
      explanation: parsed.explanation,
      after: parsed.after,
      patch: parsed.patch?.trim() || null,
      caveat: parsed.caveat?.trim() || null,
    };
  } catch (err) {
    console.error("[gemini] fix generation failed:", err instanceof Error ? err.message : err);
    return null;
  }
}
