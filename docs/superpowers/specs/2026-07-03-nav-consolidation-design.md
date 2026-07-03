# Nav Consolidation — Design

**Date:** 2026-07-03
**Status:** Awaiting approval
**Source:** Josh: header too busy after Events shipped (10 items). Approved shape:
7 links + Register. Names (League Life, Contact) are Josh-delegated picks.

## Summary

Nav goes from 10 items to 8:

> Home · Schedule · Events · About · **League Life** · Merch · **Contact** + Register

- **League Life** (`/league-life`) = Stories + Gallery merged onto one page.
- **Contact** (`/contact`) = FAQ + Contact merged onto one page.
- **Schedule and Events stay separate** (booking utility vs marketing showcase),
  already cross-linked. Register stays the lone CTA button.
- No content is deleted; only pages/URLs consolidate.

## 1. League Life (`/league-life`)

New page, replacing the `/stories` index and `/gallery`:

- `PageIntro`: eyebrow "News, recaps & photos", title "League Life", lede
  merging the two pages' existing ledes.
- **Stories section**: the exact card grid from today's `stories/index.astro`
  (newest first, cover, date, attribution, author).
- Diamond divider (site motif).
- **Photos section**: the photo grid from today's `gallery.astro`, unchanged
  behavior (anonymous, grouped by event).
- Both content collections stay exactly as they are; this is a page merge, not
  a schema change.

**URLs:**
- `/stories/<slug>` post pages stay live and unchanged (inbound links/SEO);
  their "Back to all stories" link retargets to `/league-life`.
- `/stories` (index) and `/gallery` redirect to `/league-life` via Astro
  `redirects` config (static meta-refresh pages).

**Internal link updates:** Nav, Footer (one "League Life" entry replaces
Gallery + Stories), home `FeatureCards` (`/gallery` card), home `StoryQuote`
fallback link, `stories/[slug]` back-link.

## 2. Contact (`/contact`)

Merged page at the existing `/contact` URL:

- `PageIntro`: eyebrow "Say hello", title "Questions? Get in touch.", lede
  covering both jobs ("Quick answers below; anything else, send us a note.").
- **Quick answers section** (`id="faq"`): the FAQ accordion moved verbatim from
  `faq.astro`, including the policy links added earlier today. The old FAQ
  lede's "Reach out on the Contact page" line becomes "send us a note below".
- Diamond divider.
- **Send a note section** (`id="message"`): the existing Formspree contact form
  and its inline submit script, unchanged.

**URLs:** `/faq` redirects to `/contact#faq` (config redirect to `/contact`;
anchor noted in copy, redirect target is the page). Policies page lede "For
the quick version, see the FAQ" retargets to `/contact`.

## 3. Tests

- `foundation.spec.ts`: nav list becomes the 8 items above.
- `faq.spec.ts` merges into `contact.spec.ts`: all FAQ content assertions
  (including today's 24-hour + weather regression tests) now run against
  `/contact`; form assertions unchanged.
- `stories.spec.ts` + `gallery.spec.ts` merge into `league-life.spec.ts`:
  stories grid, photo grid, and story-detail assertions; story detail page
  test stays pointed at `/stories/<slug>`.
- New redirect assertions: `/faq`, `/stories`, `/gallery` respond with a
  redirect (meta refresh page or 3xx) that lands on the right target.
- Full gate `npm test` green before merge.

## Out of scope

- Merch demotion to footer (Josh chose to keep it in the nav).
- Schedule + Events merge (rejected: booking utility vs marketing showcase).
- Any change to content collections, schemas, or the Events/About/Policies
  work shipped earlier today.
