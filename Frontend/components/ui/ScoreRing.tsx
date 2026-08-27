// components/ui/ScoreRing.tsx — mockup 2.3 / 2.4 / 2.7 score ring
//
// An SVG progress ring. The track is a flat slate circle; the value arc uses
// the status color for the band the score falls in (branding §2.1:
// emerald = pass, amber = medium, red = fail).
//
// Accessibility (§13): the ring is decorative SVG, so the score is announced
// through an aria-label that names it an *automated* score — never a
// compliance guarantee.

import { cn } from "@/lib/utils";

type Band = "pass" | "warn" | "fail";

function band(score: number): Band {
  if (score >= 90) return "pass";
  if (score >= 70) return "warn";
  return "fail";
}

const ARC: Record<Band, string> = {
  pass: "stroke-emerald-500",
  warn: "stroke-amber-400",
  fail: "stroke-red-500",
};

const TEXT: Record<Band, string> = {
  pass: "text-emerald-600 dark:text-emerald-400",
  warn: "text-amber-600 dark:text-amber-400",
  fail: "text-red-600 dark:text-red-400",
};

export function ScoreRing({
  score,
  size = 120,
  label = "Accessibility score",
  className,
}: {
  score: number;
  size?: number;
  label?: string;
  className?: string;
}) {
  const stroke = size >= 100 ? 9 : 7;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, score));
  const offset = circumference - (clamped / 100) * circumference;
  const tone = band(clamped);

  return (
    <div
      className={cn("relative inline-flex shrink-0 items-center justify-center", className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${label}: ${clamped} out of 100, automated score`}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true" focusable="false">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className="stroke-slate-200 dark:stroke-white/10"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={cn(ARC[tone], "transition-[stroke-dashoffset] duration-700 ease-out")}
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center" aria-hidden="true">
        <span className={cn("font-heading font-semibold tabular-nums", TEXT[tone], size >= 100 ? "text-3xl" : "text-xl")}>
          {clamped}
        </span>
        {size >= 100 && <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400">/ 100</span>}
      </div>
    </div>
  );
}
