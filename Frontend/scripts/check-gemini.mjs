// scripts/check-gemini.mjs — `npm run gemini:check`
//
// Confirms your key works before you wonder why scans have no AI suggestions.
// Reads Frontend/.env.local the same way Next does, lists the models the key
// can actually reach, then makes one real structured-output call.

import fs from "node:fs";
import path from "node:path";
import { GoogleGenAI } from "@google/genai";

// Minimal .env.local reader — this runs outside Next, so nothing has loaded it.
const envPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} else {
  console.log("!  No .env.local found. Create it with:\n     cp .env.example .env.local\n");
}

const key = process.env.GEMINI_API_KEY?.trim();
const model = process.env.GEMINI_MODEL?.trim() || "gemini-3.6-flash";

if (!key) {
  console.error("✗ GEMINI_API_KEY is not set in Frontend/.env.local");
  console.error("  Get a key at https://aistudio.google.com/apikey");
  process.exit(1);
}

// Never print the key itself.
console.log(`key    : ${key.slice(0, 6)}…${key.slice(-4)} (${key.length} chars)`);
console.log(`model  : ${model}\n`);

const ai = new GoogleGenAI({ apiKey: key });

console.log("Models your key can use (generateContent):");
let sawModel = false;
try {
  for await (const m of await ai.models.list()) {
    const actions = m.supportedActions ?? m.supportedGenerationMethods ?? [];
    if (actions.length && !actions.includes("generateContent")) continue;
    const name = (m.name ?? "").replace(/^models\//, "");
    if (name === model) sawModel = true;
    console.log(`  ${name === model ? "→" : " "} ${name}`);
  }
} catch (err) {
  console.error(`\n✗ Could not list models: ${err.message}`);
  console.error("  A 400/403 here usually means the key is wrong, revoked, or restricted.");
  process.exit(1);
}

if (!sawModel) {
  console.log(`\n!  "${model}" wasn't in that list. Set GEMINI_MODEL in .env.local to one that is.`);
}

console.log("\nMaking one real call…");
try {
  const res = await ai.models.generateContent({
    model,
    contents: 'Reply with JSON: {"ok": true, "note": "<5 words about web accessibility>"}',
    config: { responseMimeType: "application/json", temperature: 0 },
  });
  console.log(`✓ ${model} responded: ${res.text?.trim()}`);
  console.log("\nAI pass is ready. Run a scan and look for 'AI suggestion' badges.");
} catch (err) {
  console.error(`✗ Call failed: ${err.message}`);
  process.exit(1);
}
