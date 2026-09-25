# Design System: OutreachAI

## 0. What this product is (context for screen generation)

OutreachAI is a job-application outreach agent. A candidate pastes a job
posting (URL or text) and their resume; the app then, in order:

1. Parses the job description (company, role, tech stack, talking points)
2. Scrapes the company's public pages for real signal
3. Finds likely contacts at the company via Hunter.io domain search
4. Lets the user review/edit that contact list (add a name, fix an email,
   optionally add a LinkedIn URL for richer research)
5. Researches each contact (Perplexity/DuckDuckGo) and writes a personalized
   cold email per contact, backed by real facts only — never invented
6. Shows every draft for the user to review/edit inline
7. Creates Gmail drafts for the ones they approve (or lets them copy manually
   if Gmail isn't connected)

This is a **tool an engineer trusts with their job search**, not a marketing
site. It has five linear screens (Input → Agent Progress → Contacts Review →
Draft Preview → Done), no dashboard, no data tables, no admin chrome. Every
screen is a single focused card in the center of the viewport. The emotional
register is calm competence — like a well-built CLI wearing a UI, not a SaaS
landing page trying to sell something.

## 1. Visual Theme & Atmosphere

A dark, low-glare operator console. Density is "Daily App Balanced" (~5) —
form-heavy screens need breathing room, but this isn't an airy portfolio
site either. Variance is moderate (~6): the step indicator lives in a
floating pill nav offset from a centered content card, not a symmetric
marketing hero. Motion is quiet and confident — soft spring settles on
buttons, staggered fade-up reveals as SSE progress messages and generated
drafts stream in one at a time. Nothing bounces or plays; this app is
handling someone's job search, and the interface should feel as serious
and unhurried as that deserves.

## 2. Color Palette & Roles

- **Obsidian** (#0A0A0C) — Primary background surface. Off-black, never pure #000.
- **Ink Panel** (#131316) — Card and container fill, one step lighter than the canvas.
- **Raised Panel** (#1B1B1F) — Nested/hover surface (e.g. input fields inside a card).
- **Bone White** (#F4F4F5) — Primary text.
- **Muted Steel** (#A1A1AA) — Secondary text, labels, metadata.
- **Faint Steel** (#71717A) — Tertiary text, placeholders, disabled state.
- **Whisper Border** (rgba(255,255,255,0.08)) — 1px structural lines on cards and inputs.
- **Warm Ember** (#C2793C) — Single accent. Primary CTAs, active step indicator, focus rings,
  links. Desaturated amber/copper, not blue or purple — deliberately distinct from generic
  SaaS/AI blue-violet defaults. Used sparingly: one primary action per screen, never more.
- **Signal Red** (#F87171 at 10% fill, #F87171 text) — Failed-draft cards, error banners only.
- **Signal Green** (#4ADE80 text only, no fill) — Success confirmations (Gmail ✓, Done screen).

No gradients. No glow/shadow on the accent. Max one accent color for the entire app.

## 3. Typography Rules

- **Display/Body:** `Geist` — track-tight headings, relaxed-leading body text, max 65ch.
- **Mono:** `Geist Mono` — used for: step counters ("2/5"), confidence percentages,
  email addresses, timestamps, and the floating nav's step labels. Never for prose.
- **Banned:** Inter, any serif (this is a dashboard-class tool, sans-serif only).
- Hierarchy comes from weight and color (Bone White vs. Muted Steel), not size alone —
  most text in this app sits between 12px and 16px; nothing marketing-scale.

## 4. Component Stylings

- **Buttons:** Flat fill, no outer glow. Primary = Warm Ember fill, Obsidian text.
  Ghost = transparent with Whisper Border, Bone White text. -1px translate + subtle
  scale on active press (spring, not linear). Icon (arrow) slides right 2px on hover.
- **Cards:** `Ink Panel` fill, `Whisper Border` outline, generously rounded (1.5rem).
  Each card in a list (drafts, contacts, progress steps) fades up with an 80ms stagger
  per item as it streams in — this app's core visual signature, since content genuinely
  arrives incrementally over SSE.
- **Inputs:** Label above (Muted Steel, mono, uppercase, tracked), `Raised Panel` fill,
  Whisper Border, Warm Ember focus ring. Helper/error text below in Faint Steel or
  Signal Red. Low-confidence contact emails get an amber-tinted border, not a full
  color swap — a warning, not an error.
- **Step indicator (floating pill nav):** Fixed-width circles, mono step numbers,
  filled Warm Ember for the current step, outlined for completed (with a checkmark),
  Faint Steel for upcoming. This is the one persistent piece of chrome across all
  five screens.
- **Loading/streaming state:** No spinners for the SSE step list — messages simply
  append with a fade-up as they arrive, each one staying visible (a running log, not
  a replaced status line). A small spinner is acceptable only on submit buttons
  mid-request (e.g. "Creating drafts...").
- **Empty/failed states:** A failed draft is its own card (Signal Red tint) with the
  real error message and an inline Retry button — never a generic toast.

## 5. Layout Principles

- Every screen: a single card, max-width ~640-720px, vertically centered with
  generous top padding, on the Obsidian canvas. No sidebars, no multi-column
  dashboards — this is a linear wizard, not an app shell.
- The floating step-indicator pill sits above the card, centered, offset from
  it visually (its own glass panel, not fused to the card below).
- Contact/draft lists inside a card are single-column, full-width rows —
  never a grid of equal cards. Density comes from vertical rhythm, not columns.
- `min-h-[100dvh]` for the page wrapper, never `h-screen`.

## 6. Responsive Rules

- Below 768px: the card goes full-width with 16px side gutters; the step
  indicator's text labels hide, leaving just the numbered circles.
- Contact-row and draft-row internal grids (name/role/email/linkedin fields)
  collapse from 2 columns to 1 below `sm`.
- All buttons/inputs maintain 44px minimum touch targets.
- No horizontal scroll anywhere, including the mono-font metadata rows.

## 7. Motion & Interaction

- Spring physics (stiffness ~100, damping ~20) on all button presses and
  card entrances. No linear easing, no bounce/overshoot.
- Staggered 80ms cascade on any list that populates from a stream (progress
  messages, contacts, drafts) — this is the app's signature motion, since it
  mirrors how the backend actually delivers results one at a time.
- Animate only `transform`/`opacity`. The step-indicator fill transition
  (upcoming → active → complete) is the one exception worth a slightly
  longer, deliberate 400-500ms ease.

## 8. Anti-Patterns (Banned)

- No emojis anywhere in the UI (checkmark icons are fine, emoji characters are not).
- No Inter, no serif fonts.
- No pure black backgrounds.
- No neon glow / purple-blue AI aesthetic — Warm Ember is the only accent, ever.
- No 3-equal-column feature grids — this app has no such content anyway.
- No generic circular spinners for the SSE step list specifically (staggered
  fade-up log only); spinners are fine only on an active submit button.
- No placeholder names like "John Doe" or "Acme Corp" in generated mockups —
  use realistic tech-company/job-posting content (e.g. "Stripe", "Backend
  Engineer", real-sounding names) since this is a job-search tool.
- No fake round completion numbers or progress bars — this app shows a real
  step count ("3/5 contacts") or nothing, never a fabricated percentage.
