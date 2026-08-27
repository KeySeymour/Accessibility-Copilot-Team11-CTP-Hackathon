// app/scans/new/page.tsx — mockup 2.2 "Upload / New Scan"
//
// Two entry points into a scan, matching the mockup: drag-and-drop
// screenshot upload ("Choose File", PNG/JPG up to 10MB), or a URL field
// ("Analyze URL"). Per our discussion the project has moved to
// URL-based analysis (Playwright render + axe-core + Gemini), so the
// URL path is primary; screenshot upload stays as the Figma/mockup
// fallback path.
//
// On submit: POST /api/scans { url } -> { scanId } -> redirect to
// /scans/[scanId]/analyzing.

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FileImage, ImageUp, Link2, Loader2, ScanSearch, X } from "lucide-react";
import { TopNav } from "@/components/layout/TopNav";
import { ErrorState } from "@/components/states/ErrorState";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { Button } from "@/components/ui/Button";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // matches the "up to 10MB" copy
const ACCEPTED = ["image/png", "image/jpeg"];

export default function NewScanPage() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Object URLs hold the blob in memory until revoked, so tie each one's
  // lifetime to the file it previews.
  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  function acceptFile(candidate: File | undefined) {
    setFileError(null);

    if (!candidate) return;

    if (!ACCEPTED.includes(candidate.type)) {
      setFileError("That file isn't a PNG or JPG. Pick an image and try again.");
      setFile(null);
      return;
    }

    if (candidate.size > MAX_UPLOAD_BYTES) {
      const mb = (candidate.size / 1024 / 1024).toFixed(1);
      setFileError(`That image is ${mb}MB. The limit is 10MB.`);
      setFile(null);
      return;
    }

    setFile(candidate);
  }

  async function handleAnalyzeScreenshot() {
    if (!file) return;

    setUploading(true);
    setFileError(null);

    try {
      const body = new FormData();
      body.append("screenshot", file);

      const res = await fetch("/api/scans", { method: "POST", body });
      const payload = await res.json().catch(() => null);

      if (!res.ok) {
        setFileError(payload?.error ?? "We couldn't start that scan.");
        return;
      }

      router.push(`/scans/${payload.scanId}/analyzing`);
    } catch {
      setFileError("We couldn't reach the server. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  async function handleAnalyzeUrl(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/scans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      const body = await res.json().catch(() => null);

      if (!res.ok) {
        // The SSRF guard and URL validation return plain-language messages
        // meant to be shown as-is (see lib/scan/url-guard.ts).
        throw new Error(body?.error ?? "We couldn't start that scan.");
      }

      router.push(`/scans/${body.scanId}/analyzing`);
    } catch (err) {
      // Plain-language error copy (§1 Voice) rather than a raw status code.
      setError(err instanceof Error ? err.message : "We couldn't start that scan. Check the address and try again.");
      setSubmitting(false);
    }
  }

  return (
    <section aria-labelledby="new-scan-heading" className="animate-fade-up">
      <TopNav currentLabel="Upload" />

      <Eyebrow>New scan</Eyebrow>
      <h1
        id="new-scan-heading"
        className="mt-2 font-heading text-3xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-4xl"
      >
        Start an accessibility scan
      </h1>
      <p className="mt-2 max-w-2xl text-lg leading-relaxed text-slate-600 dark:text-slate-400">
        Analyze a live website, or upload a screenshot of a design you haven&apos;t shipped yet.
      </p>

      <div className="mt-8 grid max-w-5xl gap-6 md:grid-cols-2">
        {/* Primary path: live URL */}
        <div className="rounded-2xl border border-slate-200 bg-white p-7 dark:border-white/10 dark:bg-white/5">
          <span
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white"
            aria-hidden="true"
          >
            <Link2 className="h-5 w-5" strokeWidth={2} />
          </span>

          <h2 className="mt-4 font-heading text-lg font-semibold tracking-tight text-slate-900 dark:text-white">
            Analyze a live website
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
            We render the page, check it, and explain what we find in plain language.
          </p>

          <form onSubmit={handleAnalyzeUrl} className="mt-6 flex flex-col gap-3">
            <label htmlFor="scan-url" className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Website address
            </label>
            <input
              id="scan-url"
              type="url"
              placeholder="https://example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
              className="min-h-[44px] w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 font-mono text-sm text-slate-900 placeholder:text-slate-400 dark:border-white/10 dark:bg-white/5 dark:text-white"
            />
            <Button type="submit" disabled={submitting} className="mt-1 w-full">
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} aria-hidden="true" />
                  Starting…
                </>
              ) : (
                <>
                  <ScanSearch className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                  Analyze URL
                </>
              )}
            </Button>
          </form>
        </div>

        {/* Fallback path: screenshot */}
        <div className="rounded-2xl border border-slate-200 bg-white p-7 dark:border-white/10 dark:bg-white/5">
          <span
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400"
            aria-hidden="true"
          >
            <ImageUp className="h-5 w-5" strokeWidth={2} />
          </span>

          <h2 className="mt-4 font-heading text-lg font-semibold tracking-tight text-slate-900 dark:text-white">
            Upload a screenshot
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
            For designs that aren&apos;t live yet. PNG or JPG, up to 10MB.
          </p>

          {/* Drag-and-drop zone: "Choose File", PNG/JPG up to 10MB */}
          <label
            htmlFor="screenshot"
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              acceptFile(e.dataTransfer.files?.[0]);
            }}
            className={`mt-6 flex cursor-pointer flex-col items-center rounded-2xl border-2 border-dashed px-6 py-8 text-center transition-colors ${
              dragging
                ? "border-violet-500 bg-violet-50/60 dark:border-violet-400 dark:bg-violet-500/10"
                : "border-slate-200 bg-slate-50/60 hover:border-violet-300 hover:bg-violet-50/40 dark:border-white/10 dark:bg-white/5 dark:hover:border-violet-500/40"
            }`}
          >
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- local object URL; optimization is not applicable.
              <img
                src={previewUrl}
                alt={`Preview of ${file?.name ?? "the selected screenshot"}`}
                className="max-h-40 w-auto rounded-lg border border-slate-200 object-contain dark:border-white/10"
              />
            ) : (
              <FileImage className="h-6 w-6 text-slate-400" strokeWidth={2} aria-hidden="true" />
            )}

            <span className="mt-3 text-sm font-medium text-slate-700 dark:text-slate-300">
              {file ? file.name : dragging ? "Drop it here" : "Choose a file or drag it here"}
            </span>
            <span className="mt-1 font-mono text-xs text-slate-400">
              {file ? `${(file.size / 1024 / 1024).toFixed(1)}MB` : "PNG · JPG · max 10MB"}
            </span>

            <input
              id="screenshot"
              type="file"
              accept="image/png,image/jpeg"
              className="sr-only"
              onChange={(e) => acceptFile(e.target.files?.[0])}
            />
          </label>

          {fileError && (
            <p role="alert" className="mt-3 text-sm leading-relaxed text-red-600 dark:text-red-400">
              {fileError}
            </p>
          )}

          <Button
            type="button"
            onClick={handleAnalyzeScreenshot}
            // Nothing to send until a valid image is chosen, so the button
            // stays disabled rather than failing on click.
            disabled={!file || uploading}
            className="mt-4 w-full"
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} aria-hidden="true" />
                Uploading…
              </>
            ) : (
              <>
                <ScanSearch className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                Analyze Screenshot
              </>
            )}
          </Button>

          {file && !uploading && (
            <button
              type="button"
              onClick={() => {
                setFile(null);
                setFileError(null);
              }}
              className="mt-2 inline-flex w-full min-h-[44px] items-center justify-center gap-1.5 rounded-full text-sm text-slate-500 transition-colors hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            >
              <X className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
              Remove
            </button>
          )}
        </div>
      </div>

      {error && (
        <ErrorState
          title="Something went wrong"
          body={error}
          actionLabel="Try Again"
          onAction={() => setError(null)}
          className="mt-6 max-w-5xl"
        />
      )}
    </section>
  );
}
