// tailwind.config.ts
//
// Theme mapping for the Accessibility Copilot branding package.
// Semantic colors are HSL channel tokens consumed as hsl(var(--token)) so the
// light/dark themes in app/globals.css can swap them without touching markup
// (branding §2, §9). Fonts map to --font-heading / --font-body / --font-mono
// (branding §4). Keyframes cover §10.2 plus the §10.3 additions.

import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",

        // Brand accents (branding §2.1). Theme-aware so dark mode shifts them
        // one step lighter for contrast, per §9.
        brand: {
          from: "hsl(var(--brand-from))", // violet-600
          to: "hsl(var(--brand-to))", // indigo-600
        },
        pass: "hsl(var(--pass))", // emerald-500
        fail: "hsl(var(--fail))", // red-500
        warn: "hsl(var(--warn))", // amber-400
      },
      fontFamily: {
        heading: ["var(--font-heading)", "Inter", "SF Pro Display", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "Inter", "SF Pro Text", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Inter", "SF Pro Display", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "ui-monospace", "monospace"],
      },
      borderRadius: {
        // Driven by --radius: 0.5rem (branding §6)
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        accordionDown: {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        accordionUp: {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        // branding §10.3
        "fade-up": {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.96)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        accordionDown: "accordionDown 0.2s ease-out",
        accordionUp: "accordionUp 0.2s ease-out",
        "fade-up": "fade-up 0.5s ease-out both",
        "fade-in": "fade-in 0.4s ease-out both",
        "scale-in": "scale-in 0.18s ease-out both",
        shimmer: "shimmer 2.4s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
