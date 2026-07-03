# Events, Meet the Team, and Policies — Design

**Date:** 2026-07-03
**Status:** Awaiting approval
**Source:** Stacey's 2026-07-03 update (Events page, Meet the Team, weather/cancellation
policy docs in the LOTL main directory) plus restructure discussion with Josh.

## Summary

Three additions and one correction, in one feature branch:

1. A new **`/events`** page backed by a new schema-validated `events` content
   collection. Launches with Glo Golf and a Summer 2027 golf trip teaser.
2. **`/about` absorbs Meet the Team**: league story → Meet the Team (Stacey,
   Melissa, Phoebe, Josh) → Meet the Pro (Christian, unchanged section, photo
   still pending).
3. A new **`/policies`** page carrying the Weather and Cancellation policies
   verbatim-in-spirit from Stacey's docs. Linked from the footer, FAQ, and
   schedule page — not the main nav.
4. **FAQ rewrite** of the rain and cancellation answers to match the new
   policies (the live FAQ currently contradicts them).

Nav becomes: Home · Schedule · **Events** · About · Gallery · Stories · Merch ·
FAQ · Contact + Register. One net-new item. No other IA changes.

## Decisions already made (with Josh)

- **Cancellation rule is Stacey's, as written:** cancel within **24 hours of
  booking**, then locked in. Strict. The FAQ is updated to match; we do NOT
  keep the old "24 hours before your tee time" rule anywhere.
- Events is a **content collection** (like stories/gallery), not a hand-edited
  page.
- Policies live on a footer-linked page, not in the main nav.
- Official email is `ladiesonthelinks.league@gmail.com` site-wide. The weather
  doc's `ladiesonthelinks@gmail.com` is treated as a typo and normalized.
- Header stays as-is plus Events (9 links + Register). No demotion of Merch or
  FAQ for now.

## 1. Events

### Collection schema (`events`)

Follows the exact seam pattern of `gallery`/`stories`: non-image fields in
`src/content/schemas.ts` (node-testable), `image()` swap in
`src/content.config.ts`.

| Field | Type | Notes |
| --- | --- | --- |
| `title` | string, required | e.g. "Evening Glo Golf" |
| `date` | date, optional | omitted → rendered as "Date coming soon" |
| `dateLabel` | string, optional | free-text override, e.g. "Summer 2027" |
| `tagline` | string, required | one-liner for the card |
| `image` | image, optional | card art; tasteful branded fallback if absent |
| `bookingUrl` | string URL, optional | CTA target (Bookwhen or `/schedule`) |
| `status` | enum: `upcoming` \| `teaser` \| `past`, default `upcoming` | drives grouping |
| `draft` | boolean, default false | same as other collections |

Body markdown = the event description.

### Page (`/events`)

- `PageIntro` header consistent with the rest of the site.
- **Upcoming** section: energetic cards, biggest visual weight. Launch content:
  **Glo Golf** (`status: upcoming`, no `date` → "Date coming soon", body notes
  date will be announced by email/Facebook, CTA to `/schedule`).
- **On the horizon** section: `teaser` events, softer/dreamier styling. Launch
  content: **Summer 2027 women's golf trip** (Scotland/Ireland concept,
  "brewing…" tone, explicitly not-yet-planned, no booking CTA — a "tell us
  you're interested" line pointing at Contact instead).
- **Past** section renders only when a `past` event exists (none at launch).
- Empty-state copy mirrors the stories index ("More events are on the way. 💚").
- Nav + Footer gain the Events link.

The season-end tournament and winter pop-ups from Stacey's email are **not**
launch content — they get added as content files when she confirms details.
The collection makes each one a single-file drop-in.

## 2. About — Meet the Team

Between the league story and the existing Meet the Pro section, insert a
**Meet the Team** section: a grid of cards (photo, name, title, 1–2 sentence
bio).

| Person | Photo | Title (draft — Stacey can retitle) |
| --- | --- | --- |
| Stacey | `stacey1.jpg` or `DSC_0531.jpg` (best crop wins) | Founder & League Director |
| Melissa | `melissa1.jpeg` or `IMG_8878.jpg` (best crop wins) | Co-Organizer |
| Phoebe Huff | placeholder (silhouette, "Photo coming soon" — same treatment as Christian's) | League Team |
| Josh | `josh.jpg` | Web & Technology |

- Bios are short, warm, league-relevant. Josh's: builds and runs this website.
  All bios are drafts for Stacey to edit — flagged as such in the PR/handoff.
- Team data lives as a typed array in the About page frontmatter (four people;
  a content collection would be overkill — YAGNI).
- Photos are copied into `src/assets/photos/team/`, resized/cropped to a
  consistent aspect (source files up to 25 MB / 5504×8256 — must be downsized
  before commit, target ≤ ~2000px long edge). Astro/sharp strips EXIF (two
  sources contain GPS data) — verify on the built output.
- **Meet the Pro stays its own visually distinct section** ("PGA Associate"
  copy constraint intact), honoring Stacey's "keep him separate" instinct.
  Christian's real photo swaps in when it arrives (existing swap-later TODO).

## 3. Policies page (`/policies`)

One page, two anchored sections:

- `/policies#weather` — Weather & Cancellation of play (from
  `LadiesOnTheLinks_WeatherPolicy .docx`)
- `/policies#cancellation` — Booking cancellation policy (from
  `LadiesOnTheLinks_CancellationPolicy.docx`)

Content is Stacey's text, lightly formatted for the web (headings, lists,
links), with only these normalizations:

- Email → `ladiesonthelinks.league@gmail.com` everywhere.
- The Lessons bullet "Cancel **after** 24 hours of your booking: … your spot is
  released" is corrected to "**within**" — as written it contradicts the
  locked-in rule two paragraphs above and is a clear typo given the confirmed
  strict rule.
- House copy rules apply: no em dashes; "Christian Grace, PGA Associate".

Linked from: Footer (next to Privacy), the two rewritten FAQ answers, and a
short line on `/schedule` near the booking embeds ("By booking you agree to
our cancellation policy"). Not in the main nav.

## 4. FAQ corrections

- **"Can I cancel, and how?"** → rewritten to the strict rule: cancel within
  24 hours of booking via the Bookwhen confirmation email; after that you're
  locked in; no-shows forfeit; transfers (once per booking) are the escape
  hatch; text Stacey or email for anything urgent; don't cancel via
  Facebook/DM. Links to `/policies#cancellation`.
- **"What if it rains?"** → rewritten: we play in the rain; cancel only when
  dangerous; Christian makes the final call; go/no-go no later than 1 hour
  before tee time via league email + Facebook; clinics cancel more readily
  with makeup slots. Links to `/policies#weather`.

## Error handling & testing

- Malformed event/team content fails `astro build` via the shared zod seam —
  same guarantee as gallery/stories.
- New node schema tests for `eventEntrySchema` mirroring the existing
  `tests/schema/*` pattern.
- Playwright e2e: `/events` renders the two launch events under the right
  groupings; `/about` shows four team cards + Meet the Pro; `/policies`
  anchors resolve; nav/footer contain the new links; FAQ answers contain the
  new rule text (guards against regression to the old contradictory copy).
- Full gate: `npm test` (check + schema + build + e2e).

## Out of scope

- Season-end tournament & winter pop-up event entries (await details).
- Phoebe's photo and Christian's photo (drop-in swaps later).
- Homepage "Latest from the Links" stories strip (separate idea, parked).
- Any CMS/self-serve publishing or Facebook syncing (previously rejected).
- Nav restructuring beyond adding Events.
