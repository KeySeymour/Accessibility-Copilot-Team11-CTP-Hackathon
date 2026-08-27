// components/ui/Card.tsx — branding §8.3 + §7
//
// The default surface: flat, 1px border, no shadow until hover. The
// elevation rule (§7) is enforced here rather than left to each caller —
// "most surfaces are flat; reserve shadows for hovers and focal elements."

import { cn } from "@/lib/utils";

export function Card({
  children,
  className,
  interactive = false,
  padding = "p-6",
}: {
  children: React.ReactNode;
  className?: string;
  /** Adds the violet hover lift. Use for cards that link somewhere. */
  interactive?: boolean;
  padding?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5",
        padding,
        interactive &&
          "transition-all hover:border-violet-300 hover:shadow-lg hover:shadow-violet-500/5 dark:hover:border-violet-500/40",
        className,
      )}
    >
      {children}
    </div>
  );
}
