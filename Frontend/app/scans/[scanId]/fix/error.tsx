"use client";

import { ErrorState } from "@/components/states/ErrorState";

export default function FixStudioError({ reset }: { error: Error; reset: () => void }) {
  return (
    <ErrorState
      title="Something went wrong"
      body="We couldn't load the issues for this scan. Please try again."
      actionLabel="Try Again"
      onAction={reset}
      className="max-w-xl"
    />
  );
}
