// components/ui/Button.tsx — branding §8.1
//
// Primary / accent / outline / ghost, all pill-shaped and all
// `inline-flex items-center justify-center gap-2 transition-colors`.
// Renders as <a> (via next/link) when `href` is passed, <button> otherwise,
// so a nav action and a form action share one visual definition.

import Link from "next/link";
import { cn } from "@/lib/utils";

type Variant = "primary" | "accent" | "outline" | "ghost";
type Size = "md" | "sm";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-slate-900 text-white font-medium shadow-lg shadow-slate-900/10 hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100",
  // Used on top of the brand gradient (§8.1)
  accent: "bg-white text-violet-700 font-semibold hover:bg-violet-50",
  outline:
    "bg-white border border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:bg-white/5 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/10",
  ghost: "text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white",
};

// Both sizes clear the 44px touch-target minimum (§13).
const SIZES: Record<Size, string> = {
  md: "px-6 py-3.5 text-sm",
  sm: "px-4 py-2.5 text-sm min-h-[44px]",
};

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-full transition-colors disabled:opacity-55 disabled:cursor-not-allowed";

export function Button({
  children,
  href,
  variant = "primary",
  size = "md",
  className,
  ...props
}: {
  children: React.ReactNode;
  href?: string;
  variant?: Variant;
  size?: Size;
  className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const classes = cn(BASE, VARIANTS[variant], SIZES[size], className);

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
}
