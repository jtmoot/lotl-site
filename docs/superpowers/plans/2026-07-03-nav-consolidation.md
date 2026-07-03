# Nav Consolidation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consolidate the nav from 10 items to 8: merge Stories+Gallery into `/league-life`, merge FAQ into `/contact`, redirect the old URLs, keep everything else intact.

**Architecture:** Pure page/URL consolidation. Content collections, schemas, and story post URLs are untouched. Old URLs redirect via Astro's `redirects` config (static meta-refresh pages, host-independent). Tests migrate with their content.

**Tech Stack:** Astro 6, Tailwind 4, Playwright.

## Global Constraints

- Copy rules: no em dashes; "our pro, Christian Grace"; "PGA Associate"; never "PGA pro"/"Class A".
- `/stories/<slug>` post URLs must keep working unchanged (SEO/inbound links).
- The 24-hour-rule and weather FAQ regression assertions must survive the move to `/contact`.
- Branch: `feature/nav-consolidation`. Full gate `npm test` green before merge; merge to main and push (auto-deploy) at the end per Josh's instruction.

---

### Task 1: `/league-life` page + redirects for `/stories` and `/gallery`

**Files:**
- Create: `src/pages/league-life.astro` (stories grid from `stories/index.astro` + photo grid from `gallery.astro`, diamond divider between)
- Delete: `src/pages/stories/index.astro`, `src/pages/gallery.astro`
- Modify: `astro.config.mjs` (add `redirects: { '/stories': '/league-life', '/gallery': '/league-life' }`)
- Modify: `src/pages/stories/[slug].astro` (back-link `/stories` → `/league-life`, label "Back to League Life")
- Create: `tests/e2e/league-life.spec.ts` (absorbs `stories.spec.ts` + `gallery.spec.ts`)
- Delete: `tests/e2e/stories.spec.ts`, `tests/e2e/gallery.spec.ts`

**Interfaces:**
- Produces: `/league-life` route with `[data-stories-list]` and `[data-gallery-grid]` sections (attribute names preserved so migrated selectors keep meaning).

Steps: write failing e2e (page renders with both grids; story detail still at `/stories/<slug>`; read-only: no forms; anonymous grid; redirects: `page.goto('/stories')` + `waitForURL('**/league-life')`, same for `/gallery`) → verify fail → implement page (PageIntro eyebrow "News, recaps & photos", title "League Life"; gallery lede's "Reach out on the Contact page" line becomes a link to `/contact`) → build → e2e pass → commit `feat: merge stories and gallery into league life page`.

### Task 2: `/contact` absorbs FAQ + `/faq` redirect

**Files:**
- Modify: `src/pages/contact.astro` (PageIntro reworded; FAQ accordion section `id="faq"` inserted above the form section `id="message"`; divider between; the FAQ items array moves in verbatim including `link` fields)
- Delete: `src/pages/faq.astro`
- Modify: `astro.config.mjs` (add `'/faq': '/contact'`)
- Modify: `src/pages/policies.astro` (lede "see the FAQ" → "see the quick answers on the Contact page")
- Modify: `tests/e2e/contact.spec.ts` (absorb all `faq.spec.ts` assertions, retargeted to `/contact`; add `/faq` redirect test; keep form AJAX tests)
- Delete: `tests/e2e/faq.spec.ts`

Steps: failing e2e → implement → build → e2e pass → commit `feat: merge faq into contact page`.

Note: the old stories "read-only, no forms" assertion lives on `/league-life` (Task 1), NOT `/contact` (which has the form).

### Task 3: Nav, footer, home links, foundation test

**Files:**
- Modify: `src/components/Nav.astro` (links: Home, Schedule, Events, About, League Life, Merch, Contact; comment updated)
- Modify: `src/components/Footer.astro` (explore: Schedule & Book, Events, Register, League Life, Contact)
- Modify: `src/components/home/FeatureCards.astro` (`/gallery` card → `/league-life`, cta "See league life")
- Modify: `src/components/home/StoryQuote.astro` (fallback `'/stories'` → `'/league-life'`; slug links unchanged)
- Modify: `tests/e2e/foundation.spec.ts` (PRIMARY_NAV = 8 items above + Register)

Steps: update, build, full e2e, commit `feat: consolidate nav to eight destinations`.

### Task 4: Full gate, visual pass, merge, deploy, verify

Steps: `npm test` all green → preview screenshots of `/league-life`, `/contact`, home (scroll-through for reveals) → polish if needed → merge to main, push (auto-deploy) → Monitor until live pages respond and old URLs redirect → report.
