// components/theme/ThemeToggle.tsx
//
// Light/dark switch (branding §9). Toggles the `dark` class on <html> and
// persists the choice; ThemeScript re-applies it before paint on the next load.

"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  // Start as null so the first client render matches the server HTML — the
  // real value is read from the DOM in useEffect, after hydration.
  const [dark, setDark] = useState<boolean | null>(null);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    document.documentElement.style.colorScheme = next ? "dark" : "light";
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {
      // Private browsing / storage disabled — the toggle still works for this page.
    }
    setDark(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      // 44px touch target (§13)
      className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
    >
      {dark ? <Sun className="h-5 w-5" strokeWidth={2} /> : <Moon className="h-5 w-5" strokeWidth={2} />}
    </button>
  );
}
