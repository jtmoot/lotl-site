# Events, Meet the Team, and Policies Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an `/events` page (content collection), a Meet the Team section on `/about`, a `/policies` page from Stacey's docs, and fix the FAQ answers that contradict the new policies.

**Architecture:** Follows the site's existing schema-seam pattern: shared zod fields in `src/content/schemas.ts` (node-testable) mirrored in `src/content.config.ts` with Astro's `image()` swap. Pages are static Astro with Tailwind, matching the visual language of `/stories` and `/about`. Events have no detail pages; card bodies render inline via `render()`.

**Tech Stack:** Astro 6, Tailwind 4, zod (astro/zod), node:test for schema tests, Playwright for e2e.

## Global Constraints

- Copy rules: no em dashes anywhere; "our pro, Christian Grace"; "PGA Associate"; never "PGA pro", never "Class A".
- Official email everywhere: `ladiesonthelinks.league@gmail.com`.
- Cancellation rule (Stacey's, confirmed strict): cancel within **24 hours of booking**, then locked in. One transfer per booking is the escape hatch.
- Weather rule: play in the rain; cancel only when dangerous; Christian Grace makes the final call; go/no-go no later than 1 hour before tee time via league email + Facebook.
- Photos committed to the repo must be ≤ ~1600px long edge with EXIF/GPS stripped (sources contain GPS).
- Branch: `feature/events-team-policies`. Conventional commits. Full gate: `npm test`.

---

### Task 1: Events schema + content

**Files:**
- Modify: `src/content/schemas.ts` (append event fields/schema)
- Modify: `src/content.config.ts` (add `events` collection)
- Create: `tests/schema/events.test.ts`
- Create: `src/content/events/glo-golf.md`
- Create: `src/content/events/summer-2027-golf-trip.md`

**Interfaces:**
- Produces: `eventFields`, `eventEntrySchema`, `type EventEntry` from `src/content/schemas.ts`; `events` collection with fields `title: string`, `date?: Date`, `dateLabel?: string`, `tagline: string`, `image?: ImageMetadata`, `bookingUrl?: string`, `status: 'upcoming'|'teaser'|'past'`, `draft: boolean`.

- [ ] **Step 1: Write the failing schema test** (`tests/schema/events.test.ts`):

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { eventEntrySchema } from '../../src/content/schemas.ts';

const valid = {
  title: 'Evening Glo Golf',
  tagline: 'Nine holes under the lights.',
  status: 'upcoming',
  bookingUrl: '/schedule',
  image: '../../assets/photos/gallery/league-01.jpg',
};

test('a valid entry parses', () => {
  assert.equal(eventEntrySchema.safeParse(valid).success, true);
});

test('a minimal entry (title + tagline) parses with defaults', () => {
  const r = eventEntrySchema.parse({ title: 'T', tagline: 'x' });
  assert.equal(r.status, 'upcoming');
  assert.equal(r.draft, false);
});

test('coerces an ISO date string into a Date', () => {
  const r = eventEntrySchema.parse({ ...valid, date: '2026-08-10' });
  assert.ok(r.date instanceof Date);
});

test('accepts a free-text dateLabel', () => {
  const r = eventEntrySchema.parse({ title: 'Trip', tagline: 'x', dateLabel: 'Summer 2027', status: 'teaser' });
  assert.equal(r.dateLabel, 'Summer 2027');
});

test('rejects a missing title', () => {
  assert.equal(eventEntrySchema.safeParse({ tagline: 'x' }).success, false);
});

test('rejects a missing tagline', () => {
  assert.equal(eventEntrySchema.safeParse({ title: 'T' }).success, false);
});

test('rejects an unknown status', () => {
  assert.equal(eventEntrySchema.safeParse({ title: 'T', tagline: 'x', status: 'someday' }).success, false);
});

test('rejects an unparseable date', () => {
  assert.equal(eventEntrySchema.safeParse({ title: 'T', tagline: 'x', date: 'not-a-date' }).success, false);
});
```

- [ ] **Step 2: Run to verify it fails** — `npm run test:schema` → FAIL (`eventEntrySchema` not exported).

- [ ] **Step 3: Implement schema.** Append to `src/content/schemas.ts`:

```ts
/**
 * Event entry: the Events page (special events, not weekly league play).
 *
 * Same seam as gallery/stories: non-image fields live in `eventFields` so the
 * build collection and this node-importable schema share one source of truth.
 * The build collection swaps the string `image` validator for Astro's
 * `image()` helper. Events have no detail pages; the body renders on the card.
 */
export const eventFields = {
  /** Display title, e.g. "Evening Glo Golf". */
  title: z.string().min(1),
  /** Event date. Omit while unannounced; the page shows "Date coming soon". */
  date: z.coerce.date().optional(),
  /** Free-text date override, e.g. "Summer 2027". Wins over `date` display. */
  dateLabel: z.string().min(1).optional(),
  /** One-line hook for the card. */
  tagline: z.string().min(1),
  /** Booking CTA target (Bookwhen URL or /schedule). Teasers omit it. */
  bookingUrl: z.string().min(1).optional(),
  /** upcoming = bookable/announced; teaser = dream stage; past = archived. */
  status: z.enum(['upcoming', 'teaser', 'past']).default('upcoming'),
  draft: z.boolean().default(false),
};

export const eventEntrySchema = z.object({
  image: z.string().min(1).optional(),
  ...eventFields,
});

export type EventEntry = z.infer<typeof eventEntrySchema>;
```

Add to `src/content.config.ts` (import `eventFields`, define collection, export):

```ts
// Events: special happenings beyond weekly league play (Glo Golf, tournaments,
// winter pop ups). No detail pages; the Events page renders each body inline.
const events = defineCollection({
  loader: glob({ base: './src/content/events', pattern: '**/*.md' }),
  schema: ({ image }) =>
    z.object({
      image: image().optional(),
      ...eventFields,
    }),
});

export const collections = { notes, gallery, stories, events };
```

- [ ] **Step 4: Content files.** `src/content/events/glo-golf.md`:

```markdown
---
title: Evening Glo Golf
tagline: Nine holes after dark with glow balls, lit fairways, and a whole lot of laughing.
status: upcoming
bookingUrl: /schedule
image: ../../assets/photos/gallery/league-02.jpg
---

Golf, but make it glow. We are lighting up North Hill for a night of glow-ball
golf you will not stop talking about. The date is being chosen right now and
will be announced by league email and on our Facebook page, so keep an eye on
your inbox. Spots will go fast. 💚
```

`src/content/events/summer-2027-golf-trip.md`:

```markdown
---
title: A Women's Golf Trip Abroad
tagline: Scotland or Ireland. Links golf, sea air, and a trip built for us.
dateLabel: Summer 2027
status: teaser
---

This one is still a dream in the making: a women's golf retreat across the
pond, playing the courses where the game was born. If a week of links golf,
cozy pubs, and unforgettable views sounds like your kind of trip, tell us on
the Contact page. The more interest, the sooner the dream gets a date.
```

- [ ] **Step 5: Verify** — `npm run test:schema` PASS, `npm run build` PASS (build validates the content files against the collection).
- [ ] **Step 6: Commit** — `feat: add events content collection with launch entries`

---

### Task 2: Team photos processed into assets

**Files:**
- Create: `src/assets/photos/team/stacey.jpg`, `src/assets/photos/team/melissa.jpg`, `src/assets/photos/team/josh.jpg` (from `~/Projects/LOTL/team-photos/`)

**Interfaces:**
- Produces: three repo-committed JPEGs, ≤1600px long edge, EXIF stripped, importable by `about.astro`.

- [ ] **Step 1: Preview all five source photos** (small `sips` copies in the scratchpad, then Read) and pick the better crop per person: `stacey1.jpg` vs `DSC_0531.jpg` (both Stacey), `melissa1.jpeg` vs `IMG_8878.jpg` (both Melissa). Criteria: face clearly visible, works as a roughly square team card crop.
- [ ] **Step 2: Process with sharp** (already in node_modules; strips metadata by default, `.rotate()` bakes in EXIF orientation first):

```bash
node -e "
const sharp = require('sharp');
const jobs = [
  ['<chosen stacey source>', 'src/assets/photos/team/stacey.jpg'],
  ['<chosen melissa source>', 'src/assets/photos/team/melissa.jpg'],
  ['/Users/joshuamoorehead/Projects/LOTL/team-photos/josh.jpg', 'src/assets/photos/team/josh.jpg'],
];
Promise.all(jobs.map(([i, o]) =>
  sharp(i).rotate().resize({ width: 1600, height: 1600, fit: 'inside' }).jpeg({ quality: 82 }).toFile(o)
)).then(() => console.log('done'));
"
```

- [ ] **Step 3: Verify** — files exist, each < 1 MB, and `sips -g allxml` / `node -e "sharp(...).metadata()"` shows no GPS EXIF.
- [ ] **Step 4: Commit** — `feat: add processed team headshots (exif stripped)`

---

### Task 3: /events page + nav/footer links

**Files:**
- Create: `src/pages/events.astro`
- Modify: `src/components/Nav.astro` (links array: add Events after Schedule)
- Modify: `src/components/Footer.astro` (explore list: add Events after Schedule & Book)
- Test: `tests/e2e/events.spec.ts`

**Interfaces:**
- Consumes: `events` collection from Task 1.
- Produces: `/events` route; nav + footer links.

- [ ] **Step 1: Write failing e2e** (`tests/e2e/events.spec.ts`):

```ts
import { test, expect } from '@playwright/test';

test('Events page renders and is indexable', async ({ page }) => {
  const res = await page.goto('/events');
  expect(res?.status()).toBe(200);
  await expect(page.locator('h1')).toContainText(/events/i);
  await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
});

test('Glo Golf appears as an upcoming event with a booking CTA', async ({ page }) => {
  await page.goto('/events');
  const upcoming = page.locator('[data-events="upcoming"]');
  await expect(upcoming).toContainText('Evening Glo Golf');
  await expect(upcoming).toContainText('Date coming soon');
  await expect(upcoming.locator('a[href="/schedule"]')).toBeVisible();
});

test('the 2027 trip appears as a teaser without a booking CTA', async ({ page }) => {
  await page.goto('/events');
  const teaser = page.locator('[data-events="teaser"]');
  await expect(teaser).toContainText("A Women's Golf Trip Abroad");
  await expect(teaser).toContainText('Summer 2027');
  await expect(teaser.locator('a[href="/schedule"]')).toHaveCount(0);
});

test('Events is linked from the nav and footer', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-nav="primary"] a[href="/events"]')).toBeVisible();
  await expect(page.locator('footer a[href="/events"]')).toBeVisible();
});
```

- [ ] **Step 2: Run to verify it fails** — `npx playwright test tests/e2e/events.spec.ts` → 404s.
- [ ] **Step 3: Implement `src/pages/events.astro`:** groups by `status`, upcoming = big cards (image, date eyebrow or "Date coming soon", title, tagline, rendered body, `zen-btn` CTA "Save your spot" when `bookingUrl`); teaser = softer full-width card under an "On the horizon" heading, italic dreamy styling, no CTA; past section renders only if non-empty ("Good times we already had"). Sections wrapped in `data-events="upcoming|teaser|past"`. Empty state mirrors stories ("More events are on the way. 💚"). Layout/`PageIntro` usage copied from `stories/index.astro`; eyebrow "What's coming", title "Events on the Links", lede mentioning special events beyond Monday league play.
- [ ] **Step 4: Add nav + footer links** (one-line array additions).
- [ ] **Step 5: Run e2e** — `npx playwright test tests/e2e/events.spec.ts` PASS.
- [ ] **Step 6: Commit** — `feat: add events page with upcoming and teaser sections`

---

### Task 4: Meet the Team on /about

**Files:**
- Modify: `src/pages/about.astro` (insert team section between story and pro)
- Test: `tests/e2e/about.spec.ts` (append tests)

**Interfaces:**
- Consumes: `src/assets/photos/team/*.jpg` from Task 2.

- [ ] **Step 1: Append failing e2e to `tests/e2e/about.spec.ts`:**

```ts
test('Meet the Team lists the four organizers with titles', async ({ page }) => {
  await page.goto('/about');
  const team = page.locator('[data-section="team"]');
  await expect(team).toContainText('Stacey');
  await expect(team).toContainText('Founder & League Director');
  await expect(team).toContainText('Melissa');
  await expect(team).toContainText('Phoebe');
  await expect(team).toContainText('Josh');
  // Phoebe has no photo yet; her card carries the placeholder treatment.
  await expect(team).toContainText('Photo coming soon');
});
```

- [ ] **Step 2: Run to verify it fails.**
- [ ] **Step 3: Implement.** Frontmatter gains image imports + a `team` array; a `Meet the Team` section (grid `sm:grid-cols-2`, cards matching the site's `rounded-xl border border-forest/10 bg-cream-soft/60` language) is inserted after the league story, followed by the existing diamond divider and the untouched Meet the Pro section.

```ts
import { Image } from 'astro:assets';
import staceyPhoto from '../assets/photos/team/stacey.jpg';
import melissaPhoto from '../assets/photos/team/melissa.jpg';
import joshPhoto from '../assets/photos/team/josh.jpg';

// Titles and bios are drafts for Stacey to edit. First names only on the site.
const team = [
  { name: 'Stacey', title: 'Founder & League Director', photo: staceyPhoto,
    bio: 'Stacey built this league on a simple idea: women, golf, and a Monday worth looking forward to. If you have gotten a warm welcome at the first tee, that was probably her.' },
  { name: 'Melissa', title: 'Co-Organizer', photo: melissaPhoto,
    bio: 'Melissa keeps Monday nights humming, from tee sheets to contests to making sure no one ever plays alone.' },
  { name: 'Phoebe Huff', title: 'League Team', photo: null,
    bio: 'Phoebe helps bring the fun, the energy, and the extra hands that make every league night feel easy.' },
  { name: 'Josh', title: 'Web & Technology', photo: joshPhoto,
    bio: 'Josh builds and runs this website, keeping tee times, events, and league news one click away.' },
];
```

Card markup: `<Image ... class="aspect-square w-full object-cover" widths={[320, 640]} />` when `photo`, else the same silhouette-SVG + "Photo coming soon" figure used by Christian. Bios must not contain "PGA pro"/"Class A"/em dashes (existing forbidden-phrase test runs against the whole main).
- [ ] **Step 4: Run all about e2e** — old pro/story/placeholder tests must still pass.
- [ ] **Step 5: Commit** — `feat: add meet the team section to about page`

---

### Task 5: /policies page + links from footer and schedule

**Files:**
- Create: `src/pages/policies.astro`
- Modify: `src/components/Footer.astro` (Legal list: add Policies)
- Modify: `src/pages/schedule.astro` (one policy line under the intro card)
- Test: `tests/e2e/policies.spec.ts`

- [ ] **Step 1: Write failing e2e** (`tests/e2e/policies.spec.ts`):

```ts
import { test, expect } from '@playwright/test';

test('Policies page renders with both anchored sections', async ({ page }) => {
  const res = await page.goto('/policies');
  expect(res?.status()).toBe(200);
  await expect(page.locator('h1')).toContainText(/policies/i);
  await expect(page.locator('#weather')).toBeVisible();
  await expect(page.locator('#cancellation')).toBeVisible();
});

test('the strict cancellation rule is stated', async ({ page }) => {
  await page.goto('/policies');
  const c = page.locator('#cancellation');
  await expect(c).toContainText('24 hours');
  await expect(c).toContainText('locked in');
  await expect(c).toContainText('ladiesonthelinks.league@gmail.com');
});

test('the weather commitment is stated', async ({ page }) => {
  await page.goto('/policies');
  const w = page.locator('#weather');
  await expect(w).toContainText('We play in the rain');
  await expect(w).toContainText('Christian Grace');
  await expect(w).toContainText('1 hour before');
});

test('policies is linked from the footer and the schedule page', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('footer a[href="/policies"]')).toBeVisible();
  await page.goto('/schedule');
  await expect(page.locator('main a[href^="/policies"]')).toBeVisible();
});
```

- [ ] **Step 2: Run to verify it fails.**
- [ ] **Step 3: Implement `policies.astro`.** `PageIntro` (eyebrow "The fine print, with love", title "League policies", lede pointing at FAQ for the short version). Two `<section>`s (`id="weather"`, `id="cancellation"`) in the site's `max-w-2xl` text-page style (per `privacy.astro`), content transcribed from Stacey's two docs with: email normalized to `ladiesonthelinks.league@gmail.com`, the Lessons "Cancel after 24 hours" typo corrected to "within", em dashes replaced, ❤️ → 💚, links live (`facebook.com/Ladiesonthelinksgolfleague`, `bookwhen.com/ladiesonthelinks`, `/register`, `/contact`). All policy substance preserved as written, including: decision no later than 1 hour before tee time; email + Facebook as the only official channels; no cash refunds; credits/makeups matrix; what to bring on a rainy day; 24-hours-after-booking rule; no-show forfeiture; one transfer per booking; do not cancel via Facebook/DM; "Why no refunds" rationale.
- [ ] **Step 4: Footer Legal gains `{ href: '/policies', label: 'Policies' }`; schedule intro card gains:** `<p class="mt-3 text-sm text-slate">Heads up: bookings can be cancelled within 24 hours of booking, then you are locked in. See our <a href="/policies#cancellation" ...>cancellation policy</a>.</p>`
- [ ] **Step 5: Run e2e** PASS. **Step 6: Commit** — `feat: add policies page from stacey's weather and cancellation docs`

---

### Task 6: FAQ corrections

**Files:**
- Modify: `src/pages/faq.astro` (two answers + optional link support)
- Test: `tests/e2e/faq.spec.ts` (append regression tests)

- [ ] **Step 1: Append failing e2e:**

```ts
test('cancellation answer states the strict 24-hours-after-booking rule', async ({ page }) => {
  await page.goto('/faq');
  const main = page.locator('main');
  await expect(main).toContainText('24 hours after booking');
  await expect(main).toContainText('locked in');
  // The old, contradictory rule must be gone.
  await expect(main).not.toContainText('24 hours before your tee time');
});

test('weather answer matches the published policy', async ({ page }) => {
  await page.goto('/faq');
  const main = page.locator('main');
  await expect(main).toContainText('We play in the rain');
  await expect(main).toContainText('Christian Grace');
  await expect(main).not.toContainText('rain-or-shine sport');
  await expect(page.locator('main a[href^="/policies"]').first()).toBeAttached();
});
```

- [ ] **Step 2: Run to verify it fails.**
- [ ] **Step 3: Rewrite the two answers** (and add optional `link` rendering after the answer paragraph, `Read the full policy →` to `/policies#cancellation` / `/policies#weather`; drop the `provisional` flag and its rendering if now unused):

Cancel answer: "You have 24 hours after booking to cancel through your Bookwhen confirmation email, and your spot goes to the waitlist automatically. After that you are locked in, and no-shows forfeit their spot. Need a different time instead? Bookwhen lets you transfer your booking to another open slot, once per booking. For anything urgent, text Stacey or email ladiesonthelinks.league@gmail.com. Please do not cancel through Facebook posts or DMs, those can be missed."

Rain answer: "We play in the rain. Light or steady rain is not a cancellation, and league play is called off only when conditions are dangerous or the course closes. Our pro, Christian Grace, makes the final call with North Hill Country Club, and you will hear from us by league email and Facebook no later than 1 hour before your tee time. Clinics cancel more readily, and you will always be offered a makeup slot."

- [ ] **Step 4: Run all faq e2e** PASS (note: existing faq.spec.ts may assert old copy; update any such assertions to the new rule as part of this task, they are the contradiction we are removing).
- [ ] **Step 5: Commit** — `fix: align faq cancellation and weather answers with published policies`

---

### Task 7: Full gate + visual pass

- [ ] **Step 1:** `npm test` (check + schema + build + e2e) → all green. Fix anything that fails before proceeding.
- [ ] **Step 2:** `npm run preview`, screenshot `/events`, `/about`, `/policies` at desktop + mobile widths; check the team grid crops, the events card hierarchy, and the policies typography. Adjust styling as needed.
- [ ] **Step 3:** Commit any polish — `chore: visual polish for events, team, and policies`
