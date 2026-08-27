// lib/nav-config.ts
//
// Single source of truth for sidebar navigation (mockup section 5) and the
// MVP1 core flow breadcrumb (mockup top bar: Upload → Analyze → Detect issues →
// Understand → Fix & Preview → Re-analyze → Compare).
//
// Sidebar items and their icons come straight from mockup section 5.

export interface NavItem {
  label: string;
  href: string;
  icon: "home" | "scan" | "history" | "settings" | "help";
}

export const SIDEBAR_NAV: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: "home" },
  { label: "Scans", href: "/scans/new", icon: "scan" },
  { label: "History", href: "/history", icon: "history" },
  { label: "Settings", href: "/settings", icon: "settings" },
  { label: "Help", href: "/help", icon: "help" },
];

// MVP1 Core Flow breadcrumb (mockup top bar, section header).
// scanId is optional — steps before a scan exists (Upload) don't need it.
export interface FlowStep {
  label: string;
  buildHref: (scanId?: string) => string;
}

export const CORE_FLOW: FlowStep[] = [
  { label: "Upload", buildHref: () => "/scans/new" },
  { label: "Analyze", buildHref: (id) => `/scans/${id}/analyzing` },
  { label: "Detect issues", buildHref: (id) => `/scans/${id}/fix` },
  { label: "Understand", buildHref: (id) => `/scans/${id}/fix` },
  { label: "Fix & Preview", buildHref: (id) => `/scans/${id}/fix` },
  { label: "Re-analyze", buildHref: (id) => `/scans/${id}/compare` },
  { label: "Compare", buildHref: (id) => `/scans/${id}/compare` },
];
