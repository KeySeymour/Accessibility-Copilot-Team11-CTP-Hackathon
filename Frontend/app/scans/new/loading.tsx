// app/scans/new/loading.tsx — Next.js automatically shows this while the
// route segment's data is loading (App Router streaming convention).
//
// Skeleton mirrors the real layout so the page doesn't jump on swap
// (branding §4 "Empty / Loading States").

export default function LoadingNewScan() {
  return (
    <div className="animate-fade-in" role="status" aria-label="Preparing upload">
      <div className="h-4 w-24 rounded-full bg-slate-200 dark:bg-white/10" />
      <div className="mt-4 h-9 w-80 max-w-full rounded-lg bg-slate-200 dark:bg-white/10" />
      <div className="mt-3 h-5 w-96 max-w-full rounded-lg bg-slate-100 dark:bg-white/5" />

      <div className="mt-8 grid max-w-5xl gap-6 md:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="h-72 rounded-2xl border border-slate-200 bg-white p-7 dark:border-white/10 dark:bg-white/5">
            <div className="h-10 w-10 rounded-xl bg-slate-200 dark:bg-white/10" />
            <div className="mt-4 h-5 w-40 rounded-lg bg-slate-200 dark:bg-white/10" />
            <div className="mt-3 h-4 w-full rounded-lg bg-slate-100 dark:bg-white/5" />
          </div>
        ))}
      </div>

      <span className="sr-only">Preparing upload…</span>
    </div>
  );
}
