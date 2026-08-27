// app/scans/[scanId]/fix/loading.tsx — shown while the Fix Studio's issue
// data streams in. Skeleton matches the three-pane grid so the layout
// doesn't shift when the real panes arrive.

export default function LoadingFixStudio() {
  return (
    <div className="animate-fade-in" role="status" aria-label="Loading issues">
      <div className="h-4 w-24 rounded-full bg-slate-200 dark:bg-white/10" />
      <div className="mt-4 h-9 w-72 max-w-full rounded-lg bg-slate-200 dark:bg-white/10" />
      <div className="mt-3 h-5 w-96 max-w-full rounded-lg bg-slate-100 dark:bg-white/5" />

      <div className="mt-8 grid gap-6 lg:grid-cols-12">
        <div className="h-96 rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5 lg:col-span-3" />
        <div className="h-96 rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5 lg:col-span-5" />
        <div className="h-96 rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/5 lg:col-span-4" />
      </div>

      <span className="sr-only">Loading issues…</span>
    </div>
  );
}
