// app/not-found.tsx — rendered by notFound() and for unmatched routes.
// Uses the same empty-state shape as the rest of the app so a missing scan
// doesn't drop the user onto an unstyled default page.

import { ScanEye } from "lucide-react";
import { EmptyState } from "@/components/states/EmptyState";
import { Eyebrow } from "@/components/ui/Eyebrow";

export default function NotFound() {
  return (
    <section aria-labelledby="not-found-heading" className="animate-fade-up">
      <Eyebrow>Not found</Eyebrow>
      <h1
        id="not-found-heading"
        className="mt-2 font-heading text-3xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-4xl"
      >
        We couldn&apos;t find that page
      </h1>
      <p className="mt-2 max-w-2xl text-lg leading-relaxed text-slate-600 dark:text-slate-400">
        The scan may have been removed, or the link may be wrong.
      </p>

      <EmptyState
        title="Nothing here"
        body="Head back to the dashboard, or start a new scan."
        actionLabel="Go to dashboard"
        actionHref="/dashboard"
        icon={ScanEye}
        className="mt-8 max-w-xl"
      />
    </section>
  );
}
