# PRD: Ladies on the Links website — Facebook-replacement static site

## Problem Statement

Ladies on the Links is a 220-member women's golf league in Duxbury, MA, run by Stacey (owner/operator). Today the league's online presence is scattered across four disconnected places: a Facebook page (announcements + photos), a standalone MailerLite registration form, Bookwhen (tee-time and lesson bookings), and a public Google Sheet tee sheet. Members have no single, warm, branded home — they have to know which silo to visit for which thing, and Stacey has no front door that both serves existing members and attracts new ones. Facebook in particular is doing two jobs poorly: it broadcasts announcements and hosts photos, but it locks the league inside a platform Stacey doesn't control and can't brand.

## Solution

Build one custom, statically-generated website that becomes the league's home and **replaces Facebook** as the primary presence (Facebook demoted to a footer link). The site is a warm, branded shell — green/cream palette, existing logo, voice "For the love of golf" — that **wraps the existing tools rather than replacing them**: Bookwhen stays the booking engine, MailerLite stays comms + registration, the Google Sheet stays the live tee sheet, Stripe is deferred until merch exists. The site is **hybrid-purpose**: evergreen pages (Home, About, FAQ, Register) and the **Blog / News** archive are public and indexed to recruit new women, while the one PII-bearing surface (the live tee sheet, which lists members' names) stays unindexed.

The site is fully static (no member login/auth layer) because the community does not actually interact on Facebook today — it only consumes broadcasts and photos. Real-time coordination is already served by Bookwhen (a booking *is* an RSVP) and the tee sheet. Timely announcements move to MailerLite email (the subscriber list is the member list). Content is maintainer-edited in the repo (no CMS); a non-developer helper (Melissa) is given a narrow, browser-only path to perform the ~monthly gallery and blog updates. A read-only **Blog / News** section provides a browsable, indexed archive that **complements (does not replace)** the MailerLite email blasts — email remains the push channel for timely announcements; the blog is the permanent, searchable home for recaps, news, and member stories.

Stack: **Astro**, deployed to **Cloudflare Pages** (GitHub-connected, auto-deploy on push). Domain `ladiesonthelinksgolf.com` is on Cloudflare for both registrar and DNS; the root `A` record (currently placeholder `192.0.2.1`) is swapped to the Pages deployment at launch.

## User Stories

1. As a prospective member, I want to land on a warm, branded Home page that explains what the league is, so that I understand the pitch and feel invited.
2. As a prospective member, I want clear jump-offs from Home to Register / Book / Gallery, so that I can act on my interest immediately.
3. As a prospective member, I want to find the site via a Google search for local women's golf, so that I can discover the league without already knowing it exists.
4. As an existing member, I want a single place that links to everything (booking, registration, tee sheet, gallery), so that I stop hunting across Facebook, email, and Bookwhen.
5. As an existing member, I want to register for the league through a form that looks like it belongs to the league, so that the experience feels trustworthy and branded (not a pink third-party form).
6. As an existing member, I want to book a tee time, so that I can play.
7. As an existing member, I want to book a lesson with our pro Christian Grace, so that I can improve my game.
8. As an existing member, I want tee times and lessons clearly distinguished on one Schedule page, so that I land on the right booking product without confusion.
9. As an existing member, I want to view the live tee sheet, so that I can see who has signed up and for which times.
10. As a member whose full name appears on the tee sheet, I want that roster to not be searchable on the open web, so that my participation isn't publicly indexed.
11. As an existing member, I want to browse a gallery of league photos, so that I can relive events and feel part of the community.
12. As an existing member, I want to read member stories and event recaps on the blog, so that I feel connected to other women in the league.
13. As a member featured in a Story/spotlight, I want to be attributed by first name only and only with my permission, so that my privacy is respected. (The launch gallery is an anonymous grid with no names or captions.)
14. As a member featured in a photo or Story, I want an easy way to have it taken down, so that I retain control over my image.
15. As a prospective member, I want to read an About page with the league's story and our pro's background, so that I trust the league before joining.
16. As a prospective member, I want an FAQ that answers common questions, so that I don't have to email to learn the basics.
17. As any visitor, I want to send a message through a contact form, so that I can reach the league without needing to find an email address.
18. As Stacey (and Melissa), I want contact-form submissions to land in our shared admin inbox, so that whoever is available can respond.
19. As a visitor interested in merch, I want to see a dedicated "Coming Soon" merch section, so that I know league gear is on the way even though nothing is for sale yet.
20. As any visitor, I want a link to the league's Facebook page in the footer, so that I can still find it if I prefer.
21. As Stacey, I want timely announcements (rainouts, schedule changes) to go out by MailerLite email, so that members are notified quickly without me editing the website.
22. As Stacey, I want the site's core pages to stay evergreen and the blog to carry the dated content, so that the site looks current and active without me editing pages between updates.
23. As Melissa, I want to add new gallery photos by copying a template and dragging images in the GitHub web interface, so that I can update the site monthly without installing any tools.
24. As Melissa, I want a malformed gallery entry to fail the build rather than break the live site, so that my mistakes never take the site down.
25. As Melissa, I want a narrow click-by-click runbook for only the tasks I own (gallery photos, blog posts, shop/FAQ edits), so that I'm not overwhelmed by a full editing manual.
26. As Josh (maintainer), I want content stored as schema-validated Markdown in the repo, so that updates are reviewable and the build catches errors.
27. As Josh, I want the contact form handled by a hosted service with no backend code, so that I have nothing to maintain or secure.
28. As Josh, I want the registration form to keep MailerLite's bot protection and double opt-in, so that I don't re-implement spam handling and confirmation flows.
29. As Stacey, I want the site to serve double duty (recruit + members' home), so that one build grows the league and serves current members.
30. As Stacey, I want privacy-friendly analytics, so that I can tell whether the site is attracting new members without a cookie banner.
31. As a mobile member, I want the Schedule page to load fast even though it embeds Bookwhen, so that booking isn't sluggish on my phone.
32. As a visitor, I want pages to be fully readable on mobile, so that I can use the site on the course.
33. As Stacey, I want our pro referred to correctly as "our pro Christian Grace" (PGA Associate, never "our PGA pro"), so that we represent his credentials accurately.
34. As a prospective member, I want to browse a Blog / News section of recaps and spotlights, so that I can see the league is active and warm before joining.
35. As a prospective member, I want blog posts indexed by search engines, so that recaps and spotlights help me discover the league.
36. As Stacey, I want to repurpose an email blast into a blog post, so that announcements get a permanent, browsable home with near-zero extra effort.
37. As Stacey, I want to write blog content in my own voice and have Melissa publish it, so that posting doesn't depend on my technical skills.
38. As Melissa, I want to publish a blog post the same way I add a gallery photo (GitHub web UI + template), so that I don't have to learn a second workflow.
39. As a visitor, I want the blog to look intentional even when posts are sparse, so that infrequent updates don't make the league look inactive.
40. As a member, I want my story published as a blog post only with my permission and first-name attribution, so that my privacy is respected.
41. As a new member, I want the site to tell me to register before booking, so that I'm on the email list for tee-time releases and reminders.
42. As a member, I want to know tee times drop on the first Sunday of each month, so that I don't miss the dates I want.
43. As a nervous beginner, I want to book a small-group lesson with Christian before my first Monday, so that I feel ready to play.
44. As a member without clubs, I want to flag that I need loaner clubs when I book, so that I can play without owning a set.
45. As any visitor, I want a short, plain-language Privacy note linked in the footer, so that I understand how my info and photos are handled.
46. As a visitor using the contact form, I want inline success/error feedback without leaving the page, so that sending a message feels smooth.

## Implementation Decisions

**Architecture**
- Static site built with **Astro**, deployed to **Cloudflare Pages**. No server runtime, no member-identity/auth layer — the community does not interact on FB today (broadcast + photos only), so no interactive primitives are needed.
- Domain `ladiesonthelinksgolf.com` already on Cloudflare (registrar + DNS). Launch cutover = swap the root `A` record from placeholder `192.0.2.1` to the Pages deployment. (Maintainer/Stacey can perform DNS changes in the Cloudflare dashboard.)
- **Deploy:** GitHub-connected Cloudflare Pages — **auto-deploy on push**, no API token or manual upload. The Pages project, custom-domain attach, and `A`-record swap all happen at launch (needs Stacey's Cloudflare 2FA; only required at deploy, not during the build).

**Indexing / privacy posture (hybrid)**
- Evergreen pages (Home, About/The Pro, FAQ, Register, Gallery, Merch) **and the Stories / Blog index + posts** are public and indexed; included in a sitemap.
- The one PII-bearing surface — the **tee sheet link page** — emits `noindex` and is excluded from the sitemap / disallowed in robots. The launch gallery is **anonymous** so it is safe to index; Stories carry first-name-only, consented content and are indexed for recruiting.
- Cloudflare Web Analytics enabled (privacy-friendly, no cookie banner).

**Navigation / IA**
- Nav: Home · Schedule/Book · Register · About/The Pro · Gallery · Stories · Merch · FAQ · Contact. Footer carries: Facebook link, North Hill address, and a **Privacy** link (own page). ("Stories" may also read "Stories from the Links".)
- The **tee sheet is NOT a nav item** — it is a contextual link beside the Bookwhen embed on the Schedule/Book page.

**Booking (Bookwhen)**
- Bookwhen remains the booking engine for both tee times and lessons. Embedded via its **true iframe** (not the button/link widget). Wix Bookings was rejected (no per-attendee detail, app-only waitlist, breaks tee-sheet sync).
- Two distinct Bookwhen products = two embeds. **One Schedule/Book page with two tabs**: "Tee Times" (default) and "Lessons with Christian Grace". The inactive tab's iframe is **lazy-loaded** so only one Bookwhen app loads on arrival (mobile perf).
- **Real embeds (confirmed):** Tee Times → `https://bookwhen.com/ladiesonthelinks/iframe`; Lessons → `https://bookwhen.com/ladiesonthelinks-lessons/iframe`. Both true iframes (`width:100%; height:900px; border:none`).
- **Tee-time release cadence:** new tee times drop the **first Sunday of each month**, a few weeks at a time (surfaced in FAQ + email).
- An intro above the tabs tells members to **register first**; come solo, with a friend, or sign up a full foursome at checkout; loaner clubs available via a checkbox at booking.

**Tee sheet (Google Sheet, full names + bookings)**
- **Link out, do not embed.** Matches today's "anyone with the link" exposure without increasing it (embedding would pull the roster into the indexed DOM). The link sits on the Schedule/Book page next to the Bookwhen embed; that page is `noindex`. **Sheet (view-only link):** `https://docs.google.com/spreadsheets/d/1QxwULZs7nSwiVBU6x3CSJo0McFHUbhtuL_Ufa0osAGU/edit?gid=1173477351`.

**Registration (MailerLite)**
- **Custom HTML embed** (not the JS snippet) lives in the repo at `design-reference/mailerlite-embed.html`; Josh places it. Keep the `<form>` action and all `name="fields[...]"` attributes; **restyle only** from the current pink (`#F8D5DE`/`#E891A4`) to brand. MailerLite retains bot protection, double opt-in, and field mapping.
- **Branding-strip contingency is RESOLVED** — the embed is fully custom CSS with no MailerLite badge, so the native-form fallback is off the table.
- **Fields:** Name (req), Email (req), phone, "How did you hear about us?" (select), "Back for more or brand new?" (radio), "Describe your golf game" (radio: New to golf / Comfortable), "How are you picturing your season?" (radio), "Anything else?" (textarea), required "I Understand" terms checkbox.
- **Automation is live (do not rebuild):** on completion, golf level "New" → Beginners group, else → Advanced. The site only mounts the form.
- **`/register` is the front door** — copy across the site tells members to register before booking so they land on the email list for tee-time releases and reminders.

**Contact form**
- **Formspree** (no backend code, free tier, built-in spam filtering). Submissions land in the shared admin inbox **stacey@ladiesonthelinksgolf.com** (Stacey + Melissa + Josh all have access; no new Workspace seat). Melissa is primary responder. mailto, Pages Functions, and routing into MailerLite were rejected. **Endpoint (confirmed):** `https://formspree.io/f/mvznnvdv`. Use the **AJAX/vanilla** submission (`@formspree/ajax` or fetch) for inline success/error without leaving the site; collect at least name, email, message.

**Gallery + content pipeline**
- Static **general photo grid (not a feed)**. **At launch the gallery has NO per-photo names or captions** — an anonymous showcase of league/event photos. Named, individual member content lives in **Stories / Blog** (below).
- **Astro content collection**, one Markdown file per gallery entry, validated by a schema. Fields: image filename(s), optional alt text, optional event/date grouping. No member attribution at launch.
- **Consent / takedown:** photos are league-curated; any member may request a photo be removed (email Stacey). The first-name-attribution + opt-in consent model applies to **Stories / Blog**, where individuals are actually named.
- **Authoring:** Melissa edits via the **GitHub web UI** from a copy-paste template; photos drag-dropped into a repo folder in the browser. **Optimized photos stored in the repo** (Astro generates responsive variants at build). No local toolchain.
- **Safety:** Cloudflare Pages keeps the last good deploy on a failed build, so a malformed entry can't take the live site down — it just doesn't publish until fixed. Curated, not publicly submitted (no live moderation needed).
- **Asset handling:** raw photo originals (~249MB incl. `.mov` video) are staged **outside** the repo (parent `LOTL/` folder) and are **not** bulk-committed. Only curated, web-optimized derivatives enter the repo, added **per-slice** as images are actually used; videos are excluded from git (host externally if ever needed). This preserves the "optimized images in repo" intent without git-history bloat.

**Stories / Blog**
- A read-only, dated **Stories / Blog** section ("Stories from the Links"): the league's browsable, indexed archive of member spotlights, event recaps, and the occasional tip from Christian. Better individual photos accrue here over time. **Read-only** — no comments, reactions, or on-site subscriptions (subscribe = MailerLite). This does not reintroduce the interactive-feed features rejected in §Out of Scope.
- **Complements email, does not replace it.** MailerLite email stays the *push* channel for timely announcements; the blog is the *pull/archive* home. An email blast can be repurposed into a post with near-zero extra effort. The "announcements via email" decision is unchanged.
- **Indexed for recruiting** — posts and the blog index are public and in the sitemap; a fresh recap signals an active league to prospective members.
- **Ownership / cadence:** Stacey writes / provides the voice; **Melissa publishes**. Cadence is **as-events-happen, roughly monthly, no fixed schedule** — the UI is designed so sparse posting still reads as intentional (e.g. "News & Recaps", not a date-stamped ladder that highlights gaps).
- **Same pattern as the gallery:** an Astro content collection, one schema-validated Markdown file per post (fields: title, date, author, cover image, body; optional member attribution), edited via the **GitHub web UI from a template**, images in the repo. Melissa uses the identical workflow she learns for the gallery — no second toolchain. Same build-safety net (a malformed post fails the build, last good deploy stays live).
- **Member stories live here** (moved out of the gallery), under the shared consent model (opt-in, first-name attribution, takedown path).

**Announcements / comms**
- Timely announcements (rainouts, schedule changes) go out via **MailerLite email** (subscriber list = member list); email is the **push** channel. The site's **core pages stay evergreen**, while the **Blog / News** section carries the dated content as a complementary, indexed archive of those blasts. No Home "latest update" banner at launch.

**Merch**
- A dedicated, **visible "Coming Soon" section** (not a one-liner) — drafted copy: *"Ladies on the Links merch is on the way… Hats, layers, and more."* No live store, no cart. A full shop + shipping is a **later project** (Stripe deferred).

**Pricing / dues**
- **No membership dues and no pricing section** — the template's pricing cards are **cut**. Costs appear only as plain facts in copy: **$45 per round, $35 per lesson**.

**Stats bar**
- **Keep** a playful four-stat bar on Home: "220+ ladies and counting" · "Every Monday, June to September" · "Countless memories made" · "2 seasons strong".

**Privacy note**
- A short, plain-language **Privacy page** (own route, linked in the footer "Legal" slot; `noindex`). Covers: registration data → MailerLite; contact messages → Formspree → league inbox; tee sheet shows names by link (not open web); photos/stories first-name + consent + takedown; no selling data; how to update/remove. Drafted copy provided in build inputs.

**Content authoring / handoff**
- **Launch copy is already drafted** (Stacey's voice) in `lotl-build-inputs.md` §4 — use it **verbatim** for Home (hero, welcome, three feature cards), About / Meet-the-Pro, Schedule intro, FAQ, Stats bar, Merch, Stories intro, Footer, and the Privacy note. Voice rules: warm/playful, light emoji, bold key phrases, **no em dashes**. PENDING/provisional: Christian's headshot (placeholder until provided), weather-policy FAQ answer (confirm with Stacey).
- Melissa receives a **narrow click-by-click runbook** (`docs/melissa-runbook.md`, GitHub-web-UI steps + screenshots) scoped to only her recurring tasks: add gallery photo, publish a Story/blog post (incl. member spotlights), edit the merch/FAQ copy.

## Testing Decisions

A good test here asserts **external, observable behavior** — what a visitor or the build produces — not implementation details. Because the dynamic functionality is entirely third-party (Bookwhen, MailerLite, Formspree) living behind iframes/hosted services, we do **not** test those services; we test that our site mounts and configures them correctly. There is almost no in-repo business logic, so there are no deep unit tests by design.

Two seams, highest first:

1. **Content-schema / build seam (preferred, highest).** The Astro content-collection schema is the primary test: a malformed or incomplete gallery **or blog** entry must fail the build with a clear error. This is the safety net protecting Melissa's monthly edits. Tests assert that valid entries parse and invalid entries (missing required field, bad image reference) are rejected, for **both** the gallery and blog collections.

2. **Rendered-page smoke seam (Playwright against the built site).** For each route: the page renders and core content is present; the nav contains the expected items and **excludes** the tee sheet; `noindex` pages actually emit the `noindex` directive and indexed pages do not; each integration's **embed container/iframe is present** on its page (we assert our markup mounts the embed — not that Bookwhen/MailerLite render their own content); the Schedule page's inactive tab does not eagerly load its iframe (lazy-load behavior); the Stories/Blog index lists posts and a post page renders and is indexable (does **not** emit `noindex`); the gallery renders as an anonymous grid (no member-name captions); the registration page mounts the MailerLite form with brand styling and **no** MailerLite badge; the contact form submits via AJAX and shows inline success without navigating away; a Privacy page renders and is linked from the footer; the Facebook link is in the footer.

Prior art: none yet (greenfield repo). Establish these two seams as the conventions future content/pages are tested against. Prefer the build/schema seam over the rendered seam wherever a check can live at build time.

## Out of Scope

- Any member login, accounts, or authentication.
- Comments, reactions, RSVPs, notifications, or any interactive/social feed features (Facebook's interactivity is intentionally not replicated — those needs are served by Bookwhen and the tee sheet, or kept on FB). The Blog / News section is **read-only** content and does not reintroduce these — no post comments, reactions, or on-site subscription.
- A CMS or visual content editor (Decap/Tina etc.) — content is maintainer-edited Markdown in the repo.
- A live store / e-commerce / Stripe checkout / shipping — launch ships only a visible "Coming Soon" merch section; the full shop is a later project.
- Membership dues, pricing tiers, or any pricing/checkout section — there are none; costs ($45/round, $35/lesson) appear only as copy.
- Per-photo names or captions in the launch gallery — the gallery is anonymous; named member content lives in Stories only.
- Replacing or migrating Bookwhen, MailerLite, the Google Sheet, or Stripe — the site wraps them, it does not absorb them.
- A native Astro registration form — the restyled MailerLite HTML embed is confirmed (branding strip resolved).
- Real-time/automatic tee-sheet sync into the site — the tee sheet remains an external Google Sheet linked out.
- Gating the tee sheet behind real access control — exposure is matched to today's "anyone with the link" model via noindex + no-embed, not auth.
- High-volume blog/story content at launch — the blog pipeline exists and member stories live there, but only a handful of posts ship initially; no backfill/migration of historical Facebook content.

## Further Notes

- **Pro credentials:** Christian Grace is referred to as "our pro Christian Grace" (PGA Associate, not Class A) — never "our PGA pro". This is a hard copy constraint.
- **Brand voice:** warm, personal, a little playful ("sip & swing," "no judgment, just joy"). Light emoji, bold key phrases, **no em dashes** (use commas/periods). Not performatively enthusiastic. Recurring lines: "For the love of golf," "Come sip & swing with us."
- **Brand palette + type:** deep forest green `#1A4A33`, cream `#F6EFDF`, dusty rose `#DE809F`, blush `#EBA9BE`, ink `#1C1C22`. Headlines **Newsreader** (serif), body **Geist** (sans) — both Google Fonts.
- **Design reference is INSPIRATION, not literal.** `design-reference/` (`index.html` + `DESIGN.md`, committed) sets the *aesthetic* — "Garden-Industrial," warm off-white, serif/sans pairing, glassy nav, pill buttons — **not** the exact sections or content. Build the real page list (below) in that visual language; do **not** reproduce the Aura demo's pricing cards, stock photos, or lorem.
- **Brand asset map:** wordmark `logo-images/HiLogo.jpg` (nav + footer; JPG on cream — a transparent PNG/SVG would be cleaner later); banner/OG `logo-images/golf-ball-logo.png` (rename to drop spaces); hero `images/nh-gallery-1.jpg`; gallery seeds `nh-gallery-1.jpg` + `nh-gallery-6.jpg`; MailerLite embed `design-reference/mailerlite-embed.html`. **Favicon:** none provided — derive a simple mark from the logo, flag a proper one later. (Photo assets stage in the parent `LOTL/` folder; optimized copies enter the repo per-slice.)
- **North star:** self-sustaining for the team — Stacey runs operations, Josh owns the tech, Melissa is the trainable second hand for content/admin. Every decision favored the lowest ongoing maintenance.
- **Manual dashboard work (launch-time, needs Stacey's 2FA):** create/connect the Cloudflare Pages project, attach the custom domain, swap the root `A` record, enable Cloudflare Web Analytics. Formspree + MailerLite are already wired.
- **Prior contingencies now RESOLVED:** MailerLite branding strip (custom HTML embed, no badge) and the two Bookwhen iframe URLs (both confirmed above). No open integration blockers.
- **Still pending (swap-later, none block the build):** Christian's headshot (tasteful placeholder), curated gallery/community photos (placeholder, Josh adds later), and the weather-policy FAQ answer (provisional — confirm with Stacey).
- Next step after this PRD: break into implementation issues (e.g. via `/to-issues`).

