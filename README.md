# Accessibility Copilot

> **See it → Understand it → Fix it → Verify it → Keep it fixed.**

**Accessibility Copilot** is a visual accessibility design and remediation workspace for designers, developers, and non-technical users.

It helps teams find accessibility issues, understand their impact in plain language, preview practical fixes, and verify that accessibility actually improved.

---

## 1. Project Overview

### 1.1 The Problem

Accessibility issues are often discovered too late in the design and development process. Traditional accessibility reports can also be technical and difficult for designers or non-accessibility experts to understand and act on.

Teams need a simple way to answer:

- Where is the accessibility problem?
- Why does it matter?
- Who could it affect?
- How can it be fixed?
- Did the fix actually improve accessibility?

### 1.2 The Solution

Accessibility Copilot turns accessibility testing into a visual remediation workflow:

**Upload / Scan → Detect → Understand → Fix → Verify → Re-score**

The platform analyzes a screenshot or webpage, highlights potential accessibility issues directly on the interface, explains them in simple language, recommends improvements, and re-checks the updated product.

### 1.3 Target Users

- UX/UI designers
- Frontend developers
- Product and engineering teams
- Companies and organizations managing websites or applications
- Non-experts who need accessibility guidance without reading complex audit reports

---

## 2. Accessibility Fix Studio

The **Accessibility Fix Studio** is the main workspace of Accessibility Copilot.

Instead of presenting a long technical report, it shows accessibility issues directly on the product and helps the user move from detection to remediation.

### 2.1 For Each Issue

Users can see:

- The affected area of the interface
- A plain-language description of the problem
- Why the issue matters
- Who may be affected
- Severity and confidence
- Relevant WCAG guidance
- A recommended fix
- A preview of the suggested improvement
- Before-and-after validation

### 2.2 Example

```text
Low Contrast Detected

Current contrast:     2.8:1  ❌
Suggested contrast:   6.1:1  ✅

Accessibility Score
Before: 58 / 100
After:  94 / 100
```

---

## 3. MVP Features

The first version focuses on making the core remediation workflow reliable and easy to understand.

### 3.1 Analysis

- Screenshot upload and preview
- Website URL analysis
- AI-assisted visual accessibility analysis
- Structured accessibility findings

### 3.2 Issue Detection

Initial checks focus on a small set of high-value issues, including:

- Low color contrast
- Text readability
- Small interactive/touch targets
- Unclear controls or labels
- Other visual accessibility problems that can be reasonably detected from the available interface data

### 3.3 Remediation

- Visual issue highlighting using bounding boxes
- Plain-language explanations
- WCAG-based recommendations
- AI-assisted candidate fixes
- Fix preview
- Before-and-after comparison

### 3.4 Verification

- Deterministic validation where possible
- Versioned accessibility scoring
- Re-analysis after a fix
- Updated score based on the new analysis rather than an artificial score increase

---

## 4. How It Works

```text
Screenshot / Website
        ↓
Accessibility Analysis
        ↓
AI Visual Understanding
        +
Deterministic Accessibility Rules
        +
DOM / axe-core Validation (when available)
        ↓
Normalized Accessibility Issues
        ↓
Accessibility Fix Studio
        ↓
Suggested Fix
        ↓
Re-validation
        ↓
Before / After Result
```

### 4.1 AI Responsibilities

AI is used for tasks where visual understanding and reasoning are useful, such as:

- Understanding interface context
- Identifying potential visual problems
- Explaining issues in simple language
- Generating candidate remediation suggestions

### 4.2 Deterministic Responsibilities

Deterministic tools are preferred for measurable checks such as:

- Contrast calculations
- DOM-based accessibility rules
- axe-core validation
- Candidate-fix verification
- Accessibility score calculation

> **AI proposes. Accessibility rules verify whenever possible.**

---

## 5. Technology Stack

### 5.1 Frontend

- Next.js and React
- TypeScript
- Tailwind CSS

### 5.2 Backend

- Python and FastAPI for screenshot analysis
- Next.js REST API routes for scans and remediation
- SQLite for scans, issues, scores, and artifact metadata

### 5.3 Accessibility

- WCAG guidelines
- axe-core
- Custom deterministic accessibility rules

### 5.4 AI

- Google Gemini multimodal models
- Structured JSON analysis output
- AI-assisted explanations and remediation

### 5.5 Infrastructure

- Playwright for rendering and capturing public webpages
- Local private storage for screenshots and generated previews
- In-process background scans for a simple local-development workflow

---

## 6. Run Locally

Prerequisites: Node.js 20+, Python 3.11+, and a Gemini API key for AI screenshot analysis. URL scans still run axe-core when Gemini is disabled or unavailable.

```bash
git clone https://github.com/KeySeymour/Accessibility-Copilot-Team11-CTP-Hackathon.git
cd Accessibility-Copilot-Team11-CTP-Hackathon

python3 -m venv .venv
.venv/bin/pip install -r backend/requirements.txt

cp backend/.env.example backend/.env
cp Frontend/.env.example Frontend/.env.local

cd Frontend
npm install
npx playwright install chromium
```

Add the same `GEMINI_API_KEY` to `backend/.env` and `Frontend/.env.local`. Never commit either file.

Start the backend from the repository root:

```bash
.venv/bin/uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```

Start the frontend in a second terminal:

```bash
cd Frontend
npm run dev
```

Open `http://localhost:3000`, or on macOS run:

```bash
open http://localhost:3000
```

Run the project checks:

```bash
cd Frontend
npm run lint
npm run typecheck
npm run test:remediation
npm run build
```

---

## 7. Product Direction

Accessibility Copilot starts as a focused visual remediation workspace and can expand across the complete product lifecycle.

```text
DESIGN
Figma / Screenshots
        ↓
Accessibility Fix Studio
        ↓
DEVELOPMENT
Developer Handoff + DOM Validation
        ↓
PULL REQUEST
CI/CD Accessibility Checks
        ↓
DEPLOYMENT
Regression Monitoring
        ↓
TEAM
Collaboration + Accessibility Governance
```

### 7.1 Planned Expansion

- Figma integration
- Design-system-aware fixes
- Developer handoff
- DOM accessibility validation
- Pull-request accessibility checks
- CI/CD integration
- Accessibility regression monitoring
- Team collaboration
- Accessibility history and reporting
- Organization-level accessibility dashboards and policies

---

## 8. Product Principles

### 8.1 Visual First

Show users where the problem is instead of starting with a technical audit report.

### 8.2 Plain Language First

Make accessibility understandable to designers, developers, and non-experts while keeping technical WCAG details available when needed.

### 8.3 Fix, Not Just Report

The goal is not only to identify problems but to help users move toward a practical solution.

### 8.4 Verify Improvement

A suggested fix should be re-tested before the product claims that accessibility improved.

### 8.5 Continuous Accessibility

Accessibility should be considered during design, development, deployment, and ongoing product maintenance—not only during a final audit.

---

## 9. Important Accessibility Note

Accessibility Copilot is designed to **assist accessibility testing and remediation**. It should not be treated as a complete accessibility certification tool.

Automated analysis cannot guarantee full WCAG conformance. Some accessibility requirements require manual review, keyboard testing, assistive technology testing, semantic inspection, and human judgment.

The product should therefore describe its score as an **automated accessibility score** rather than a guarantee of compliance.

---

## 10. Vision

Accessibility Copilot aims to become the accessibility layer connecting **design and engineering**.

The long-term goal is a continuous workflow where accessibility issues are:

**caught during design → understood and fixed → verified during development → checked before release → monitored after deployment.**

### North Star

**Design → Fix → Build → Verify → Ship → Monitor**
