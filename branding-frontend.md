# Accessibility Copilot — Branding Package

A complete design system reference for the Accessibility Copilot brand site.
Use these tokens, rules, and patterns to keep every screen visually consistent,
on-brand, and accessible.

---

## 1. Brand Essence

| | |
|---|---|
| **Name** | Accessibility Copilot |
| **Tagline** | See it → Understand it → Fix it → Verify it → Keep it fixed. |
| **Voice** | Clear, confident, human, plain-language. Never jargon-heavy. |
| **Mood** | Calm, precise, trustworthy, modern editorial. |
| **North star** | Design → Fix → Build → Verify → Ship → Monitor |

**Core principles the brand must always feel:**
Visual first · Plain language first · Fix, not just report · Verify improvement · Continuous accessibility.

---

## 2. Color Palette

The system uses HSL channel tokens consumed as `hsl(var(--token))` in Tailwind.
Two themes: **Light** (default) and **Dark**.

### 2.1 Primary Brand Colors

| Token | Role | Light (HSL) | Dark (HSL) | Usage |
|---|---|---|---|---|
| `primary` | Brand action / CTA | `0 0% 9%` (slate-900) | `0 0% 98%` | Primary buttons, key text |
| `primary-foreground` | Text on primary | `0 0% 98%` | `0 0% 9%` | Labels on dark/primary |
| **violet-600** | Accent / brand gradient | `262 83% 58%` | `262 83% 65%` | Highlights, gradient starts |
| **indigo-600** | Accent / brand gradient | `243 75% 59%` | `243 75% 66%` | Gradient ends, focus rings |
| **emerald-500** | Positive / "fixed" / pass | `160 84% 39%` | `160 70% 45%` | Pass states, success score |
| **red-500** | Negative / fail | `0 84% 60%` | `0 70% 55%` | Fail states, low score, errors |
| **amber-400** | Warning / medium | `38 92% 50%` | `38 92% 55%` | Medium severity |

### 2.2 Surface & Neutral Scale (Light)

| Token | HSL | Use |
|---|---|---|
| `background` | `0 0% 100%` | Page canvas |
| `foreground` | `0 0% 3.9%` | Body text |
| `card` | `0 0% 100%` | Card backgrounds |
| `muted` | `0 0% 96.1%` | Subtle fills / section bands |
| `muted-foreground` | `0 0% 45.1%` | Secondary text |
| `border` | `0 0% 89.8%` | Hairline borders |
| `input` | `0 0% 89.8%` | Form inputs |

### 2.3 Slate Scale (workhorse neutrals)

`slate-50 · slate-100 · slate-200 · slate-300 · slate-400 · slate-500 · slate-600 · slate-700 · slate-800 · slate-900`

Preferred for text, borders, browser chrome mockups, and subtle surfaces.

### 2.4 Gradient System

| Name | Direction | Class |
|---|---|---|
| **Brand** | violet → indigo | `bg-gradient-to-br from-violet-600 to-indigo-600` |
| **Deep** | violet → indigo → violet-700 | `from-violet-600 via-indigo-600 to-violet-700` |
| **Text accent** | violet → indigo (clip) | `bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent` |
| **Glow** | violet-100 → indigo-50 → transparent | `bg-gradient-to-b from-violet-100/60 via-indigo-50/40 to-transparent` |

---

## 3. Spacing & Padding Scale

Base unit: **4px**. Use Tailwind's default spacing scale.

| Token | Value | Typical use |
|---|---|---|
| `0.5` | 2px | Icon gap |
| `1` | 4px | Tight inline gap |
| `2` | 8px | Small gaps, badge padding |
| `3` | 12px | Input padding `px-3 py-1.5` |
| `4` | 16px | Default gap, small card padding |
| `5` | 20px | List item gap |
| `6` | 24px | Card padding `p-6`, section stack gap |
| `7` | 28px | Feature card padding `p-7` |
| `8` | 32px | Inner section gap |
| `10` | 40px | CTA padding, divider margin |
| `14` | 56px | Grid gap between feature cards |
| `16` | 64px | Card stack `mt-16` |
| `20 / 28` | 80 / 112px | Section vertical padding `py-20 lg:py-28` |

### Standard padding recipes

- **Section:** `py-20 lg:py-28` with `mx-auto max-w-7xl px-6 lg:px-10`
- **Banded section:** add `bg-slate-50/60 border-y border-slate-100`
- **Card:** `p-6` / `p-7` + `rounded-2xl bg-white border border-slate-200`
- **CTA block:** `p-10 lg:p-16`
- **Pill button:** `px-6 py-3.5 rounded-full`
- **Badge:** `px-2.5 py-1 rounded-full`

---

## 4. Typography

Fonts map to `--font-heading`, `--font-body`, `--font-display` tokens.

| Role | Token | Default | Recommended stack |
|---|---|---|---|
| Display / Headings | `font-heading` | system-ui | `Inter`, `"SF Pro Display"`, system-ui, sans-serif |
| Body | `font-body` | system-ui | `Inter`, `"SF Pro Text"`, system-ui, sans-serif |
| Mono | `font-mono` | ui-monospace | `JetBrains Mono`, `ui-monospace`, monospace |

### Type scale

| Element | Classes |
|---|---|
| Hero H1 | `text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight leading-[1.05]` |
| Section H2 | `text-3xl sm:text-4xl font-semibold tracking-tight` |
| Card H3 | `text-lg font-semibold` |
| Eyebrow / label | `text-sm font-semibold text-violet-600 uppercase tracking-wider` |
| Body | `text-lg text-slate-600 leading-relaxed` |
| Small / meta | `text-sm text-slate-500` |
| Caption | `text-xs text-slate-400` (often `font-mono`) |

**Rules:** Headings are `font-semibold` (never `font-bold` — keeps it editorial).
Body copy uses `leading-relaxed` and `text-slate-600` for warmth and contrast.
Eyebrows precede every section H2 in violet uppercase.

---

## 5. Layout — Flex & Grid

### 5.1 Page shell

```
<div className="min-h-screen bg-white text-slate-900 antialiased">
  <Navbar />            // fixed, h-16
  <main>
    <Hero /> <Problem /> <HowItWorks /> ... <CTA />
  </main>
  <Footer />
</div>
```

### 5.2 Container

- Always: `mx-auto max-w-7xl px-6 lg:px-10`
- Text blocks: constrain to `max-w-2xl` for readable line length

### 5.3 Common flex patterns

| Pattern | Classes |
|---|---|
| Row, centered | `flex items-center justify-between` |
| Centered inline actions | `flex flex-col sm:flex-row gap-3 justify-center` |
| Icon + label | `flex items-center gap-2.5` |
| Badge + count | `flex items-center justify-between` |
| Flow chips | `flex flex-wrap items-center gap-x-2 gap-y-2` |

### 5.4 Grid recipes

| Use | Classes |
|---|---|
| 5-up questions | `grid gap-4 sm:grid-cols-2 lg:grid-cols-5` |
| 6-up workflow steps | `grid gap-5 sm:grid-cols-2 lg:grid-cols-3` |
| Feature groups | `grid gap-6 md:grid-cols-2` |
| Principles | `grid gap-5 sm:grid-cols-2 lg:grid-cols-3` |
| Lifecycle | `grid gap-4 sm:grid-cols-2 lg:grid-cols-5` |
| Fix Studio split | `grid lg:grid-cols-5 gap-6` (2 + 3) |
| Before/after | `grid sm:grid-cols-2 gap-6` |

### 5.5 Width tokens

- `max-w-2xl` — readable copy
- `max-w-5xl` — CTA
- `max-w-7xl` — section content

---

## 6. Border Radius

| Token | Value | Use |
|---|---|---|
| `rounded-full` | pill | Buttons, badges, chips |
| `rounded-xl` | 0.75rem | Icon tiles, inner panels |
| `rounded-2xl` | 1rem | Cards, code blocks, device chrome |
| `rounded-3xl` | 1.5rem | Hero CTA block |
| `rounded-lg` | 0.5rem | Small controls |

Radius token `--radius: 0.5rem` drives `lg/md/sm` scales.

---

## 7. Shadows & Elevation

| Name | Classes | Use |
|---|---|---|
| Subtle | `shadow-sm` | Badges, small buttons |
| Card | `border border-slate-200` (no shadow) | Default cards on hover → `hover:shadow-lg` |
| Lifted | `shadow-xl` | Popover cards, floating score tag |
| Hero | `shadow-2xl shadow-slate-900/10` | Hero device frame |
| Accent glow | `shadow-lg shadow-violet-500/30` | Logo icon, gradient buttons |
| CTA | `shadow-2xl shadow-violet-500/20` | Gradient CTA block |

**Elevation rule:** Most surfaces are flat with a 1px `border-slate-200`.
Reserve shadows for floating elements, hovers, and focal CTAs — never blanket the page.

---

## 8. Components & Style Primitives

### 8.1 Buttons

| Variant | Classes |
|---|---|
| Primary | `px-6 py-3.5 rounded-full bg-slate-900 text-white font-medium hover:bg-slate-800 shadow-lg shadow-slate-900/10` |
| Accent (gradient) | `bg-white text-violet-700 font-semibold hover:bg-violet-50` (on gradient bg) |
| Outline | `bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50` |
| Ghost | `text-slate-700 hover:text-slate-900` |

All buttons are `inline-flex items-center justify-center gap-2` and `transition-colors`

### 8.2 Icon tiles

- Logo: `w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white`
- Feature icon: `w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white`
- Soft icon: `w-11 h-11 rounded-xl bg-violet-50 text-violet-600` (hover → `bg-violet-600 text-white`)

### 8.3 Cards

```
p-6 | p-7 rounded-2xl bg-white border border-slate-200
hover:border-violet-300 hover:shadow-lg hover:shadow-violet-500/5
transition-all
```

### 8.4 Badges

```
px-2.5 py-1 rounded-full text-xs font-semibold
```
- Pass: `bg-emerald-50 text-emerald-600`
- Fail: `bg-red-50 text-red-600`
- Info: `bg-violet-50 text-violet-700`

### 8.5 Browser-chrome mockup

```
rounded-2xl overflow-hidden border border-slate-200 shadow-2xl shadow-slate-900/10 bg-white
+ header bar: flex items-center gap-1.5 px-4 py-3 border-b border-slate-100 bg-slate-50
  (3 dots + mono URL `text-xs text-slate-400`)
```

---

## 9. Themes (Light / Dark)

Two themes via `.dark` class on the root. Toggle strategy:

```ts
// add/remove `dark` on <html> based on user/system preference
document.documentElement.classList.toggle("dark", prefersDark)
```

| Surface | Light | Dark |
|---|---|---|
| Background | `0 0% 100%` | `0 0% 3.9%` |
| Foreground | `0 0% 3.9%` | `0 0% 98%` |
| Card | white | `0 0% 3.9%` |
| Muted | `0 0% 96.1%` | `0 0% 14.9%` |
| Border | `0 0% 89.8%` | `0 0% 14.9%` |
| Primary | slate-900 | `0 0% 98%` |
| Accent | violet-600 | violet-500 |

**Banded sections dark variant:** swap `bg-slate-50/60` for `bg-white/5` and
borders for `border-white/10`. Accent emerald/red shift one step lighter for
contrast on dark.

> Because this is an accessibility brand, **all text/background pairs must pass
> WCAG AA** (4.5:1 body, 3:1 large/UI). Violet-600 on white = 5.9:1 ✓.

---

## 10. Motion & Animation

Motion is restrained — enhances, never distracts.

### 10.1 Transitions (Tailwind)

| Token | Use |
|---|---|
| `transition-colors` | Buttons, links, text |
| `transition-all` | Cards (border + shadow + bg) |
| `duration-300` | Navbar, hover states |

### 10.2 Keyframes (defined in `tailwind.config.js`)

```js
accordionDown / accordionUp  // 0.2s ease-out
```

### 10.3 Recommended animations to add

| Name | Trigger | Spec |
|---|---|---|
| `fade-up` | on scroll into view | opacity 0→1, translateY 12px→0, 0.5s ease-out |
| `fade-in` | mount / lazy | opacity 0→1, 0.4s ease-out |
| `scale-in` | modal/popover | scale 0.96→1, 0.18s ease-out |
| `shimmer` | score badge | subtle gradient sweep on the score number |
| `pulse-dot` | "live" status dot | existing `animate-pulse` on 1.5px dot |

### 10.4 Scroll behavior

- `ScrollToTop` component restores scroll on route change (already wired)
- Hero glow: a single large `blur-3xl` radial — static, no parallax
- Navbar: transparent → `bg-white/80 backdrop-blur-xl border-b` after 12px scroll

### 10.5 Motion principles

1. **Subtle:** durations 0.2–0.5s; easings `ease-out`.
2. **Functional:** animate to show state change (highlight box appearing,
   score ticking 58→94), not decoration.
3. **Reduced-motion:** respect `prefers-reduced-motion` — disable non-essential
   transforms and the hero glow sweep.

---

## 11. Iconography

- Library: **lucide-react** (only icons that exist in the package)
- Stroke width: `2` (logo `2.2` for slightly heavier mark)
- Icon tile sizes: `w-4 h-4` inline, `w-5 h-5` tiles
- Never invent or import non-existent icons — a missing icon breaks the app.

| Concept | Icon |
|---|---|
| Brand / scan | `Eye` |
| Analyze | `ScanEye`, `ScanSearch` |
| Upload | `ImageUp`, `Upload` |
| URL | `Link2` |
| Issue | `AlertTriangle`, `ShieldAlert` |
| Fix | `Wrench`, `Wand2`, `Sparkles` |
| Verify | `BadgeCheck`, `ShieldCheck`, `CheckCircle2` |
| Score | `Gauge` |
| Lifecycle | `PenTool`, `Code2`, `GitPullRequest`, `Rocket`, `Users` |

---

## 12. Imagery

- Hero: AI-generated abstract "interface being scanned" visual, 16:9, violet/
  indigo + teal accents, lots of whitespace.
- Content/section images: `Image` component from `@/components/ui/image` (never
  bare `<img>`) for media.base44.com / static URLs.
- Photos only from Unsplash with known-valid URLs.
- No real people/product shots in mockups — keep abstract and editorial.

---

## 13. Accessibility (eating our own dog food)

As an accessibility product, the brand site itself must model best practice:

- Body text ≥ 4.5:1 contrast; UI/large ≥ 3:1.
- Focus visible: use `outline-ring/50` (already global) + `ring` token.
- Interactive elements have meaningful labels and ≥ 44px touch targets.
- Respects `prefers-reduced-motion`.
- Score described as **automated accessibility score**, not a compliance
  guarantee (per the README's Important Accessibility Note).

---

## 14. File & Token Locations

| What | Where |
|---|---|
| Color & font tokens | `src/index.css` (`:root`, `.dark`) |
| Tailwind theme mapping | `tailwind.config.js` (`theme.extend.colors`, `fontFamily`, `keyframes`, `animation`) |
| Brand site page | `src/pages/Home.jsx` |
| Brand components | `src/components/site/*` (`Navbar`, `Hero`, `Problem`, `HowItWorks`, `FixStudio`, `Features`, `Principles`, `Vision`, `CTA`, `Footer`) |

---

## 15. Brand Do / Don't

**Do**
- Use the violet→indigo gradient for focal accents only.
- Lead every section with a violet uppercase eyebrow.
- Pair flat cards (1px border) with layered + shadowed focal elements.
- Keep copy plain-language and human.

**Don't**
- Don't blanket the page in shadows.
- Don't use `font-bold` for headings (use `font-semibold`).
- Don't introduce neon, candy, or novelty colors.
- Don't claim compliance — describe scores as automat