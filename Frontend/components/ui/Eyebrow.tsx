// components/ui/Eyebrow.tsx — branding §4 + §15
//
// "Lead every section with a violet uppercase eyebrow." One component so
// the tracking/weight never drifts between screens.

import { cn } from "@/lib/utils";

export function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn("text-sm font-semibold uppercase tracking-wider text-violet-600 dark:text-violet-400", className)}>
      {children}
    </p>
  );
}
