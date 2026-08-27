// lib/db/index.ts
//
// SQLite persistence. Deliberately boring: one file on disk, synchronous
// queries, no ORM. Swapping this for Postgres later means rewriting this
// module and nothing else — every caller goes through the exported functions.
//
// The connection is cached on globalThis because Next's dev server re-evaluates
// modules on hot reload; without the cache each edit would open a new handle.

import "server-only";

import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { BoundingBox, Issue, ScanStatus, Severity } from "@/lib/types";

const DATA_DIR = path.join(process.cwd(), ".data");
const DB_PATH = path.join(DATA_DIR, "copilot.db");

export const SCREENSHOT_DIR = path.join(DATA_DIR, "screenshots");

function connect(): Database.Database {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

  const db = new Database(DB_PATH);
  // WAL keeps the polling reads from blocking the worker's writes.
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(fs.readFileSync(path.join(process.cwd(), "lib/db/schema.sql"), "utf8"));

  return db;
}

const globalForDb = globalThis as unknown as { __copilotDb?: Database.Database };

export const db: Database.Database = globalForDb.__copilotDb ?? connect();
if (process.env.NODE_ENV !== "production") globalForDb.__copilotDb = db;

// ---------------------------------------------------------------------------
// Row shapes (snake_case as stored) and their camelCase public equivalents.
// ---------------------------------------------------------------------------

interface ScanRow {
  id: string;
  url: string;
  status: ScanStatus;
  score: number | null;
  error: string | null;
  parent_scan_id: string | null;
  screenshot_path: string | null;
  page_width: number | null;
  page_height: number | null;
  needs_review: number;
  created_at: string;
  completed_at: string | null;
}

export interface Scan {
  id: string;
  url: string;
  status: ScanStatus;
  score: number | null;
  error: string | null;
  parentScanId: string | null;
  hasScreenshot: boolean;
  pageWidth: number | null;
  pageHeight: number | null;
  needsReview: number;
  createdAt: string;
  completedAt: string | null;
}

function toScan(row: ScanRow): Scan {
  return {
    id: row.id,
    url: row.url,
    status: row.status,
    score: row.score,
    error: row.error,
    parentScanId: row.parent_scan_id,
    hasScreenshot: Boolean(row.screenshot_path),
    pageWidth: row.page_width,
    pageHeight: row.page_height,
    needsReview: row.needs_review,
    createdAt: row.created_at,
    completedAt: row.completed_at,
  };
}

// ---------------------------------------------------------------------------
// Scans
// ---------------------------------------------------------------------------

export function createScan({ url, parentScanId }: { url: string; parentScanId?: string }): Scan {
  const id = randomUUID();

  db.prepare(
    `INSERT INTO scans (id, url, status, parent_scan_id, created_at)
     VALUES (?, ?, 'queued', ?, ?)`,
  ).run(id, url, parentScanId ?? null, new Date().toISOString());

  return getScan(id)!;
}

export function getScan(id: string): Scan | null {
  const row = db.prepare("SELECT * FROM scans WHERE id = ?").get(id) as ScanRow | undefined;
  return row ? toScan(row) : null;
}

export function listScans(limit = 10): Scan[] {
  const rows = db
    .prepare("SELECT * FROM scans ORDER BY created_at DESC LIMIT ?")
    .all(limit) as ScanRow[];
  return rows.map(toScan);
}

/** The most recent completed re-analysis of `scanId`, if one exists. */
export function getChildScan(scanId: string): Scan | null {
  const row = db
    .prepare("SELECT * FROM scans WHERE parent_scan_id = ? ORDER BY created_at DESC LIMIT 1")
    .get(scanId) as ScanRow | undefined;
  return row ? toScan(row) : null;
}

export function setScanStatus(id: string, status: ScanStatus, error?: string): void {
  db.prepare("UPDATE scans SET status = ?, error = ? WHERE id = ?").run(status, error ?? null, id);
}

export function completeScan(
  id: string,
  data: { score: number; screenshotPath: string | null; pageWidth: number; pageHeight: number; needsReview: number },
): void {
  db.prepare(
    `UPDATE scans
        SET status = 'complete', score = ?, screenshot_path = ?, page_width = ?,
            page_height = ?, needs_review = ?, completed_at = ?
      WHERE id = ?`,
  ).run(
    data.score,
    data.screenshotPath,
    data.pageWidth,
    data.pageHeight,
    data.needsReview,
    new Date().toISOString(),
    id,
  );
}

export function getScreenshotPath(id: string): string | null {
  const row = db.prepare("SELECT screenshot_path FROM scans WHERE id = ?").get(id) as
    | { screenshot_path: string | null }
    | undefined;
  return row?.screenshot_path ?? null;
}

// ---------------------------------------------------------------------------
// Issues
// ---------------------------------------------------------------------------

interface IssueRow {
  id: string;
  scan_id: string;
  rule_id: string;
  severity: Severity;
  title: string;
  wcag_ref: string;
  why_it_matters: string | null;
  suggested_fix: string | null;
  help_url: string | null;
  target: string | null;
  html: string | null;
  contrast_current: number | null;
  contrast_recommended: number | null;
  box_x: number | null;
  box_y: number | null;
  box_width: number | null;
  box_height: number | null;
  fix_applied: number;
}

function toIssue(row: IssueRow): Issue {
  const box: BoundingBox | undefined =
    row.box_x !== null && row.box_y !== null && row.box_width !== null && row.box_height !== null
      ? { x: row.box_x, y: row.box_y, width: row.box_width, height: row.box_height }
      : undefined;

  return {
    id: row.id,
    ruleId: row.rule_id,
    severity: row.severity,
    title: row.title,
    wcagRef: row.wcag_ref,
    whyItMatters: row.why_it_matters ?? undefined,
    suggestedFix: row.suggested_fix ?? undefined,
    helpUrl: row.help_url ?? undefined,
    target: row.target ?? undefined,
    html: row.html ?? undefined,
    contrast:
      row.contrast_current !== null && row.contrast_recommended !== null
        ? { current: row.contrast_current, recommended: row.contrast_recommended }
        : undefined,
    box,
    fixApplied: row.fix_applied === 1,
  };
}

/** Written as one transaction so a scan is never half-populated. */
export function replaceIssues(scanId: string, issues: Omit<Issue, "id" | "fixApplied">[]): void {
  const insert = db.prepare(
    `INSERT INTO issues (
       id, scan_id, rule_id, severity, title, wcag_ref, why_it_matters, suggested_fix,
       help_url, target, html, contrast_current, contrast_recommended,
       box_x, box_y, box_width, box_height, created_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );

  const run = db.transaction((rows: Omit<Issue, "id" | "fixApplied">[]) => {
    db.prepare("DELETE FROM issues WHERE scan_id = ?").run(scanId);
    const now = new Date().toISOString();

    for (const issue of rows) {
      insert.run(
        randomUUID(),
        scanId,
        issue.ruleId,
        issue.severity,
        issue.title,
        issue.wcagRef,
        issue.whyItMatters ?? null,
        issue.suggestedFix ?? null,
        issue.helpUrl ?? null,
        issue.target ?? null,
        issue.html ?? null,
        issue.contrast?.current ?? null,
        issue.contrast?.recommended ?? null,
        issue.box?.x ?? null,
        issue.box?.y ?? null,
        issue.box?.width ?? null,
        issue.box?.height ?? null,
        now,
      );
    }
  });

  run(issues);
}

const SEVERITY_RANK = "CASE severity WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END";

export function listIssues(scanId: string): Issue[] {
  const rows = db
    .prepare(`SELECT * FROM issues WHERE scan_id = ? ORDER BY ${SEVERITY_RANK}, rule_id`)
    .all(scanId) as IssueRow[];
  return rows.map(toIssue);
}

export function getIssue(id: string): (Issue & { scanId: string }) | null {
  const row = db.prepare("SELECT * FROM issues WHERE id = ?").get(id) as IssueRow | undefined;
  return row ? { ...toIssue(row), scanId: row.scan_id } : null;
}

export function countIssues(scanId: string): number {
  const row = db.prepare("SELECT COUNT(*) AS n FROM issues WHERE scan_id = ?").get(scanId) as { n: number };
  return row.n;
}

// ---------------------------------------------------------------------------
// Dashboard summary (mockup 2.1 stat tiles)
// ---------------------------------------------------------------------------

export function getSummary() {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const scansThisWeek = (
    db.prepare("SELECT COUNT(*) AS n FROM scans WHERE created_at >= ?").get(weekAgo) as { n: number }
  ).n;

  const averageScore = (
    db.prepare("SELECT ROUND(AVG(score)) AS avg FROM scans WHERE status = 'complete' AND score IS NOT NULL").get() as {
      avg: number | null;
    }
  ).avg;

  const issuesFound = (db.prepare("SELECT COUNT(*) AS n FROM issues").get() as { n: number }).n;

  const issuesFixed = (
    db.prepare("SELECT COUNT(*) AS n FROM issues WHERE fix_applied = 1").get() as { n: number }
  ).n;

  return { scansThisWeek, averageScore: averageScore ?? 0, issuesFound, issuesFixed };
}
