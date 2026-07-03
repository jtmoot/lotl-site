# Fable handoff — Ladies on the Links home redesign

You're picking up an in-progress **Home page redesign**. All edits are uncommitted in the
working tree (branch `feature/home-editorial-redesign`) — you can see them directly. Do not
commit unless asked.

## Goal
Make the Home page exceptional but **robust, not vibecoded/gamey** (Airbnb/Zillow solidity).
A skill is installed to help: **`.claude/skills/ui-ux-pro-max/`** — use it
(`python3 .claude/skills/ui-ux-pro-max/scripts/search.py "<q>" --design-system --stack astro`).
Its guidance for this site: pattern = Community landing, style = Exaggerated Minimalism.

## Locked brand — do NOT change
- Colors (src/styles/global.css @theme): forest #1a4a33, forest-deep #123425, cream #f6efdf,
  cream-soft #fbf6ec, rose #de809f, blush #eba9be, ink #1c1c22, slate.
- Fonts: Newsreader (serif display) + Geist (sans body). Keep both.
- Reuse utilities: .eyebrow .rule .zen-btn .ghost-btn .hero-cta-light .hero-cta-ghost
  .snapshot .rise .hero-settle.

## Hard rules
- Keep all copy verbatim. NO em or en dashes (— –) anywhere; use commas/periods.
- Keep integrations untouched (Bookwhen, MailerLite, Formspree, tee sheet).
- Preserve these Playwright TEST HOOKS (tests/e2e/home.spec.ts + foundation.spec.ts):
  - `data-hero` element contains "For the love of golf"; the single `<h1>` contains
    "plays together"; `<main>` contains "Every Monday"; hero has a[href="/register"] and
    a[href="/schedule"].
  - `data-feature-cards` contains exactly 3 anchors → /register, /schedule, /gallery.
  - `data-stats` contains these EXACT strings: "220+ ladies and counting",
    "Every Monday, June to September", "Countless memories made", "2 seasons strong".
  - Exactly ONE `<h1>`. Nav = 8 items (Home, Schedule, About, Gallery, Stories, Merch, FAQ,
    Contact) + Register button; nav must NOT contain "tee sheet".

## Current Home structure (src/pages/index.astro)
Hero → Welcome → FeatureCards (full-width numbered index) → StatsBar (rose numerals) →
MembersShowcase (10-photo wall + "Come sip & swing with us." + Register). Components in
src/components/home/. Shared: Nav.astro, Footer.astro. Photos: src/assets/photos/.

## Verify before claiming done (must stay green)
`npm run check` (0 errors; 1 known MailerLiteForm hint OK) · `npm run build` ·
`npm run test:e2e` → 38/38. NEVER run `astro dev` before e2e (its toolbar injects stray
<header>/<h1> and breaks strict-mode selectors). To screenshot: `npm run preview -- --host
0.0.0.0` then hit http://127.0.0.1:4321/ (server binds IPv6 by default, so --host is
required; use 127.0.0.1 not localhost).

## Status
Not launched. Only remaining launch step is #14 (Cloudflare Pages + domain + DNS), which is
human-gated on Stacey's 2FA. Design work here is pre-launch polish.
