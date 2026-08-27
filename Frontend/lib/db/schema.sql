-- lib/db/schema.sql
--
-- Two tables, matching the merge-logic writeup.
--
-- `scans.parent_scan_id` is what makes the /compare flow work: a re-analysis
-- is a NEW row pointing back at the original, never an update of the original's
-- score. That way "58 → 86" is two independently computed scans sitting side by
-- side, and the history of a page is preserved rather than overwritten.

CREATE TABLE IF NOT EXISTS scans (
  id              TEXT PRIMARY KEY,
  url             TEXT NOT NULL,
  -- queued | rendering | analyzing | complete | failed
  status          TEXT NOT NULL DEFAULT 'queued',
  score           INTEGER,
  error           TEXT,
  parent_scan_id  TEXT REFERENCES scans(id) ON DELETE SET NULL,
  screenshot_path TEXT,
  -- Full-page pixel dimensions, so percentage bounding boxes can be
  -- recomputed or debugged later.
  page_width      INTEGER,
  page_height     INTEGER,
  -- axe "incomplete" results: rules that need a human to decide. Counted but
  -- deliberately kept out of the score (see lib/scan/score.ts).
  needs_review    INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL,
  completed_at    TEXT
);

CREATE INDEX IF NOT EXISTS idx_scans_created_at ON scans(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scans_parent ON scans(parent_scan_id);

CREATE TABLE IF NOT EXISTS issues (
  id                    TEXT PRIMARY KEY,
  scan_id               TEXT NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
  rule_id               TEXT NOT NULL,
  -- high | medium | low
  severity              TEXT NOT NULL,
  title                 TEXT NOT NULL,
  wcag_ref              TEXT NOT NULL,
  why_it_matters        TEXT,
  suggested_fix         TEXT,
  help_url              TEXT,
  -- CSS selector axe reported, used to re-locate the element for a fix.
  target                TEXT,
  html                  TEXT,
  contrast_current      REAL,
  contrast_recommended  REAL,
  -- Percentages of the full-page screenshot, so the overlay scales.
  box_x                 REAL,
  box_y                 REAL,
  box_width             REAL,
  box_height            REAL,
  -- 'axe'  → a deterministic rule violation, authoritative, counts toward the score
  -- 'ai'   → a Gemini suggestion, shown as such, deliberately excluded from the score
  source                TEXT NOT NULL DEFAULT 'axe',
  -- JSON blob of surrounding DOM captured at scan time (lib/scan/context.ts).
  -- axe only reports the offending element; a document-level rule like
  -- landmark-one-main needs the page outline before a fix can be written.
  -- Captured during the scan because the browser is gone afterwards.
  context               TEXT,
  -- The generated fix, cached so it survives navigating between issues.
  fix_json              TEXT,
  -- Set only when the USER says they applied it. Generating a fix is not
  -- fixing anything, and the dashboard's "Issues fixed" tile must not imply
  -- otherwise.
  fix_applied           INTEGER NOT NULL DEFAULT 0,
  created_at            TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_issues_scan ON issues(scan_id);
