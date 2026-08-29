# Accessibility Copilot

> **See it. Understand it. Fix it. Verify it.**

Accessibility Copilot is an AI-assisted accessibility research platform that helps designers and developers identify, understand, remediate, and verify accessibility issues in digital interfaces.

The project explores one central research question:

> **Can multimodal AI and deterministic accessibility testing work together to make accessibility remediation faster, clearer, and more reliable?**

---

## 1. Research Motivation

Accessibility problems are often detected late, reported in technical language, and separated from the design decisions that created them.

Accessibility Copilot reframes accessibility testing as an iterative process:

```text
Detect → Explain → Fix → Verify → Improve
```

The system combines:

* **Multimodal AI** for visual understanding and explanation
* **axe-core and WCAG rules** for deterministic validation
* **Human review** for decisions requiring context and judgment

> **AI proposes. Rules verify. Humans decide.**

---

## 2. System Architecture

```text
Screenshot / Website
        ↓
Accessibility Analysis
        ↓
┌─────────────────────────────┐
│ Multimodal AI               │
│ axe-core                    │
│ WCAG / Deterministic Rules  │
└─────────────────────────────┘
        ↓
Normalized Findings
        ↓
Accessibility Fix Studio
        ↓
Suggested Remediation
        ↓
Re-validation
        ↓
Before / After Result
```

The **Accessibility Fix Studio** helps users understand:

* What is wrong
* Why it matters
* Who may be affected
* Which WCAG guidance applies
* How the issue could be fixed
* Whether the fix improved accessibility

---

## 3. Research Evaluation

The system can be evaluated across three dimensions.

### Detection Quality

$$
\text{Precision} = \frac{TP}{TP + FP}
$$

$$
\text{Recall} = \frac{TP}{TP + FN}
$$

### Remediation Success

$$
\text{Fix Rate} =
\frac{\text{Verified Fixes}}
{\text{Attempted Fixes}}
$$

### Accessibility Improvement

$$
\Delta S = S_{\text{after}} - S_{\text{before}}
$$

where \(S\) represents the automated accessibility score.

A positive \(\Delta S\) indicates measurable improvement after remediation.

> **Note:** The score is an automated evaluation metric, not a guarantee of WCAG conformance.

---

## 4. Core Capabilities

* Screenshot accessibility analysis
* Website URL scanning
* AI-assisted visual issue detection
* axe-core validation
* WCAG-based recommendations
* Plain-language explanations
* Visual issue highlighting
* Suggested remediation
* Before-and-after comparison
* Re-validation after changes

Initial research focuses on issues such as:

* Color contrast
* Text readability
* Interactive target size
* Labels and controls
* Visually detectable accessibility barriers

---

## 5. Technology Stack

| Layer              | Technology                               |
| ------------------ | ---------------------------------------- |
| Frontend           | Next.js, React, TypeScript, Tailwind CSS |
| Backend            | Node.js, Python, FastAPI                          |
| AI                 | Google Gemini Multimodal                 |
| Accessibility      | WCAG, axe-core, custom rules             |
| Browser Automation | Playwright                               |
| Database           | SQLite                                   |

---

## 6. Run Locally

### Requirements

* Node.js 20+
* Python 3.11+
* Gemini API key for AI analysis

### Setup

```bash
git clone https://github.com/KeySeymour/Accessibility-Copilot-Team11-CTP-Hackathon.git
cd Accessibility-Copilot-Team11-CTP-Hackathon

# Backend
python3 -m venv .venv
.venv/bin/pip install -r backend/requirements.txt
cp backend/.env.example backend/.env

# Frontend
cp Frontend/.env.example Frontend/.env.local
cd Frontend
npm install
npx playwright install chromium
cd ..
```

Add the same `GEMINI_API_KEY` to:

```text
backend/.env
Frontend/.env.local
```

> **Security:** Never commit API keys or `.env` files.

### Start the Application

Run the backend and frontend in **two terminals**.

**Terminal 1 — Backend**

```bash
.venv/bin/uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```

**Terminal 2 — Frontend**

```bash
cd Frontend
npm run dev
```

Open:

```text
http://localhost:3000
```

---

## 7. Test

Before contributing, run:

```bash
cd Frontend

npm run lint
npm run typecheck
npm run test:remediation
npm run build
```

Then verify the main workflow:

```text
Upload / Scan
     ↓
Detect Issues
     ↓
Inspect Findings
     ↓
Preview Fix
     ↓
Re-analyze
     ↓
Compare Results
```

---

## 8. Contributing

Create a development branch:

```bash
git checkout -b feature/your-feature
```

Make your changes, run the tests, then:

```bash
git add .
git commit -m "feat: describe your change"
git push origin feature/your-feature
```

Open a pull request explaining:

1. What changed
2. Why it changed
3. How it was tested
4. Accessibility impact

---

## 9. Research Principles

### Accessibility Should Be Understandable

Accessibility reports should help people act, not simply list violations.

### AI Should Assist, Not Certify

AI can identify patterns and propose solutions, but deterministic testing and human judgment remain essential.

### Improvements Should Be Measurable

A remediation is meaningful only when the resulting interface is evaluated again.

### Accessibility Belongs Throughout the Lifecycle

```text
Design → Detect → Understand → Fix → Verify → Ship → Monitor
```

---

## 10. Limitations

Accessibility Copilot is a **research and assistive remediation system**.

It does **not** guarantee WCAG compliance or replace professional accessibility evaluation.

Complete accessibility testing may also require:

* Keyboard navigation testing
* Screen-reader testing
* Semantic HTML inspection
* Assistive technology testing
* Manual expert review
* Evaluation with people with disabilities

---

## 11. Future Research

Future work may explore:

* Figma integration
* Design-system-aware remediation
* DOM-level fix generation
* CI/CD accessibility checks
* Pull-request validation
* Accessibility regression detection
* Longitudinal accessibility scoring
* Team accessibility analytics
* Human-versus-AI evaluation studies

---

## Vision

Accessibility should not begin with an audit after a product is finished.

It should be part of how products are **designed, built, tested, and improved**.

### North Star

> **Make accessibility problems visible, understandable, actionable, and verifiable before they become barriers for users.**

**Design → Detect → Understand → Fix → Verify → Ship → Monitor**
