# Route Map

Every route below is traced back to a numbered section in the mockup
("ACCESSIBILITY COPILOT — Visual Accessibility Design & Remediation
Workspace").

| Route | Mockup section | Purpose |
|---|---|---|
| `/` | — | Redirects to `/dashboard` |
| `/dashboard` | 2.1 Dashboard / Home | Stat tiles, Recent Scans, Quick Start |
| `/scans/new` | 2.2 Upload / New Scan | Upload screenshot or submit a URL |
| `/scans/[scanId]/analyzing` | 2.3 Analysis Progress | Poll job status, step checklist |
| `/scans/[scanId]/fix` | 2.4 Fix Studio + 2.5 Fix Preview | Three-pane workspace: issue list, annotated canvas, issue/fix detail panel |
| `/scans/[scanId]/compare` | 2.6 Re-analyze, 2.7 Results Comparison, 2.8 Updated Results | Trigger re-analysis, show before/after score, per-issue fixed/remaining |
| `/history` | Sidebar item (5) | Full scan history, same row shape as Recent Scans |
| `/settings` | Sidebar item (5) | Account/app settings |
| `/help` | Sidebar item (5) | Help/support |

Mobile views (section 3) are **not** separate routes — they're the same
pages above rendered responsively. Build the Fix Studio's three-pane
layout as a single-column stack with a tab or back-button pattern below
your mobile breakpoint (the mockup's "Mobile - Fix Studio" and "Mobile -
Issue Details" screens are two states of the same `/scans/[scanId]/fix`
route, not two URLs).

Empty and loading states (section 4 — "No scans yet", "No issues found",
"Something went wrong") are shared components (`EmptyState`,
`ErrorState`) rendered conditionally inside the routes above, plus
Next.js's `loading.tsx`/`error.tsx` file conventions for route-level
suspense/error boundaries.

## API routes

| Route | Called from |
|---|---|
| `POST /api/scans` | `/scans/new` on submit |
| `GET /api/scans` | `/dashboard` Recent Scans, `/history` |
| `GET /api/scans/[scanId]` | `/scans/[scanId]/analyzing` polling loop |
| `GET /api/scans/[scanId]/issues` | `/scans/[scanId]/fix` |
| `POST /api/scans/[scanId]/reanalyze` | `/scans/[scanId]/compare` "Re-analyze" button — creates a **child** scan row |
| `POST /api/issues/[issueId]/fix` | Fix Studio's "Preview Fix" / "Apply This Fix" |

## Not yet routed (out of MVP scope per README section 6.1)

Figma integration, PR/CI checks, and org-level dashboards are on the
roadmap but intentionally have no routes here — adding them later is a
new top-level segment (e.g. `/integrations/figma`, `/ci-checks`) without
touching anything above.
