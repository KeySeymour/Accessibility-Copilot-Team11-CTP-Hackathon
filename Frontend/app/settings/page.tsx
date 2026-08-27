// app/settings/page.tsx — sidebar "Settings" item (mockup section 5).

import { Eye, Gauge, Palette } from "lucide-react";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

export default function SettingsPage() {
  return (
    <section aria-labelledby="settings-heading" className="animate-fade-up">
      <Eyebrow>Settings</Eyebrow>
      <h1
        id="settings-heading"
        className="mt-2 font-heading text-3xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-4xl"
      >
        Settings
      </h1>
      <p className="mt-2 max-w-2xl text-lg leading-relaxed text-slate-600 dark:text-slate-400">
        Control how Accessibility Copilot looks and what it checks.
      </p>

      <div className="mt-8 flex max-w-2xl flex-col gap-4">
        <div className="flex items-center justify-between gap-6 rounded-2xl border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-white/5">
          <div className="flex items-start gap-3">
            <span
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400"
              aria-hidden="true"
            >
              <Palette className="h-5 w-5" strokeWidth={2} />
            </span>
            <div>
              <h2 className="font-heading text-base font-semibold tracking-tight text-slate-900 dark:text-white">
                Appearance
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                Switch between the light and dark theme. We follow your system setting by default.
              </p>
            </div>
          </div>
          <ThemeToggle />
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-white/5">
          <div className="flex items-start gap-3">
            <span
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400"
              aria-hidden="true"
            >
              <Gauge className="h-5 w-5" strokeWidth={2} />
            </span>
            <div>
              <h2 className="font-heading text-base font-semibold tracking-tight text-slate-900 dark:text-white">
                Scoring
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                Choose which WCAG level to score against. Coming soon.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-white/5">
          <div className="flex items-start gap-3">
            <span
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400"
              aria-hidden="true"
            >
              <Eye className="h-5 w-5" strokeWidth={2} />
            </span>
            <div>
              <h2 className="font-heading text-base font-semibold tracking-tight text-slate-900 dark:text-white">
                Checks
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                Turn individual rules on or off for your scans. Coming soon.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
