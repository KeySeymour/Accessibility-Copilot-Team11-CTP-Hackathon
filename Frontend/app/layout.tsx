// app/layout.tsx
//
// Root layout. Renders the persistent left sidebar (mockup section 5:
// Dashboard / Scans / History / Settings / Help) around every route below.
//
// Fonts are self-hosted through next/font and exposed as the
// --font-heading / --font-body / --font-mono tokens the Tailwind theme
// reads (branding §4). ThemeScript sets the light/dark class before first
// paint so the dark theme never flashes (branding §9).

import "./globals.css";
import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Sidebar } from "@/components/layout/Sidebar";
import { ThemeScript } from "@/components/theme/ThemeScript";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Accessibility Copilot",
  description: "See it. Understand it. Fix it. Verify it. Keep it fixed.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${jetbrainsMono.variable}`}
      // Headings and display text use the same family as body per §4's
      // recommended stack; aliasing here keeps font-heading meaningful.
      style={{ ["--font-heading" as string]: "var(--font-body)", ["--font-display" as string]: "var(--font-body)" }}
    >
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-slate-900 focus:px-5 focus:py-3 focus:text-sm focus:font-medium focus:text-white"
        >
          Skip to main content
        </a>

        <div className="flex min-h-screen flex-col lg:flex-row">
          <Sidebar />
          <main id="main-content" className="min-w-0 flex-1 px-6 py-8 lg:px-10 lg:py-10">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
