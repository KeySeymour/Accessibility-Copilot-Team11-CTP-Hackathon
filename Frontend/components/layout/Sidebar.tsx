// components/layout/Sidebar.tsx
//
// Renders SIDEBAR_NAV (lib/nav-config.ts) as the persistent left nav shown
// in mockup section 5. Keep this dumb — it just maps config to links so
// adding a route never means touching markup in two places.
//
// Styling follows the branding package: gradient logo tile with the Eye
// mark (§8.2), soft violet active state (§2.1), flat surface with a single
// hairline border (§7).

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Eye, HelpCircle, History, LayoutDashboard, ScanEye, Settings, type LucideIcon } from "lucide-react";
import { SIDEBAR_NAV, type NavItem } from "@/lib/nav-config";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { cn } from "@/lib/utils";

// nav-config owns the icon *names*; this map owns the components, so the
// config file stays free of React imports. Every name here is verified to
// exist in lucide-react (§11: never import a non-existent icon).
const ICONS: Record<NavItem["icon"], LucideIcon> = {
  home: LayoutDashboard,
  scan: ScanEye,
  history: History,
  settings: Settings,
  help: HelpCircle,
};

export function Sidebar() {
  const pathname = usePathname();

  return (
    <nav
      className="flex shrink-0 flex-col gap-6 border-b border-slate-200 bg-white px-5 py-5 dark:border-white/10 dark:bg-white/5 lg:h-screen lg:w-64 lg:sticky lg:top-0 lg:border-b-0 lg:border-r"
      aria-label="Primary"
    >
      <Link href="/dashboard" className="flex items-center gap-2.5 rounded-lg">
        <span
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/30"
          aria-hidden="true"
        >
          <Eye className="h-5 w-5" strokeWidth={2.2} />
        </span>
        <span className="font-heading text-[15px] font-semibold tracking-tight text-slate-900 dark:text-white">
          Accessibility Copilot
        </span>
      </Link>

      <ul className="flex flex-1 flex-col gap-1">
        {SIDEBAR_NAV.map((item) => {
          const Icon = ICONS[item.icon];
          const active = pathname?.startsWith(item.href);

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-[44px] items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition-colors",
                  active
                    ? "bg-violet-50 font-semibold text-violet-700 dark:bg-violet-500/10 dark:text-violet-300"
                    : "font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden="true" />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-4 dark:border-white/10">
        <p className="text-xs leading-relaxed text-slate-400">
          See it → Understand it → Fix it → Verify it
        </p>
        <ThemeToggle />
      </div>
    </nav>
  );
}
