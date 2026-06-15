# PRD: Ladies on the Links website — Facebook-replacement static site

## Problem Statement

Ladies on the Links is a 220-member women's golf league in Duxbury, MA, run by Stacey (owner/operator). Today the league's online presence is scattered across four disconnected places: a Facebook page (announcements + photos), a standalone MailerLite registration form, Bookwhen (tee-time and lesson bookings), and a public Google Sheet tee sheet. Members have no single, warm, branded home — they have to know which silo to visit for which thing, and Stacey has no front door that both serves existing members and attracts new ones. Facebook in particular is doing two jobs poorly: it broadcasts announcements and hosts photos, but it locks the league inside a platform Stacey doesn't control and can't brand.

## Solution

Build one custom, statically-generated website that becomes the league's home and **replaces Facebook** as the primary presence (Facebook demoted to a footer link). The site is a warm, branded shell — green/cream palette, existing logo, voice "For the love of golf" — that **wraps the existing tools rather than replacing them**: Bookwhen stays the booking engine, MailerLite stays comms + registration, the Google Sheet stays the live tee sheet, Stripe is deferred until merch exists. The site is **hybrid-purpose**: evergreen pages (Home, About, FAQ, Register) and the **Blog / News** archive are public and indexed to recruit new women, while anything exposing member PII (the tee sheet, member-identifying gallery detail) stays unindexed.

The site is fully static (no member login/auth layer) because the community does not actually interact on Facebook today — it only consumes broadcasts and photos. Real-time coordination is already served by Bookwhen (a booking *is* an RSVP) and the tee sheet. Timely announcements move to MailerLite email (the subscriber list is the member list). Content is maintainer-edited in the repo (no CMS); a non-developer helper (Melissa) is given a narrow, browser-only path to perform the ~monthly gallery and blog updates. A read-only **Blog / News** section provides a browsable, indexed archive that **complements (does not replace)** the MailerLite email blasts — email remains the push channel for timely announcements; the blog is the permanent, searchable home for recaps, news, and member stories.

Stack: **Astro**, deployed to **Cloudflare Pages**. Domain `ladiesonthelinksgolf.com` is on Cloudflare for both registrar and DNS; the root `A` record (currently placeholder `192.0.2.1`) is swapped to the Pages deployment at launch.

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
13. As a member featured in the gallery or a blog post, I want to be attributed by first name only and only with my permission, so that my privacy is respected.
14. As a member featured in the gallery or a blog post, I want an easy way to have my photo or story taken down, so that I retain control over my image.
15. As a prospective member, I want to read an About page with the league's story and our pro's background, so that I trust the league before joining.
16. As a prospective member, I want an FAQ that answers common questions, so that I don't have to email to learn the basics.
17. As any visitor, I want to send a message through a contact form, so that I can reach the league without needing to find an email address.
18. As Stacey (and Melissa), I want contact-form submissions to land in our shared admin inbox, so that whoever is available can respond.
19. As a visitor interested in merch, I want to see a "future merch coming soon" teaser, so that I know a shop is planned even though nothing is for sale yet.
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
40. As a member, I want my story published as a blog post only with my permission and first-name attribution, so that my privacy is respected (consistent with the gallery).

## Implementation Decisions

**Architecture**
- Static site built with **Astro**, deployed to **Cloudflare Pages**. No server runtime, no member-identity/auth layer — the community does not interact on FB today (broadcast + photos only), so no interactive primitives are needed.
- Domain `ladiesonthelinksgolf.com` already on Cloudflare (registrar + DNS). Launch cutover = swap the root `A` record from placeholder `192.0.2.1` to the Pages deployment. (Maintainer/Stacey can perform DNS changes in the Cloudflare dashboard.)

**Indexing / privacy posture (hybrid)**
- Evergreen pages (Home, About/The Pro, FAQ, Register) **and the Blog / News index + posts** are public and indexed; included in a sitemap.
- PII-bearing surfaces (tee sheet link page, and member-identifying gallery detail) emit `noindex` and are excluded from the sitemap / disallowed in robots.
- Cloudflare Web Analytics enabled (privacy-friendly, no cookie banner).

**Navigation / IA**
- Nav: Home · Schedule/Book · Register · About/The Pro · Gallery · Blog · Shop · FAQ · Contact. Facebook link in footer. ("Blog" may be labeled "News" / "News & Recaps" in the UI.)
- The **tee sheet is NOT a nav item** — it is a contextual link beside the Bookwhen embed on the Schedule/Book page.

**Booking (Bookwhen)**
- Bookwhen remains the booking engine for both tee times and lessons. Embedded via its **true iframe** (not the button/link widget). Wix Bookings was rejected (no per-attendee detail, app-only waitlist, breaks tee-sheet sync).
- Two distinct Bookwhen products = two embeds. **One Schedule/Book page with two tabs**: "Tee Times" (default) and "Lessons with Christian Grace". The inactive tab's iframe is **lazy-loaded** so only one Bookwhen app loads on arrival (mobile perf).

**Tee sheet (Google Sheet, full names + bookings)**
- **Link out, do not embed.** Matches today's "anyone with the link" exposure without increasing it (embedding would pull the roster into the indexed DOM). The link sits on the Schedule/Book page next to the Bookwhen embed; that page is `noindex`.

**Registration (MailerLite)**
- Restyled **custom-HTML MailerLite embed** wrapped in the site shell (green/cream, site fonts), so MailerLite retains bot protection, double opt-in, and field mapping. Native Astro form was rejected as unnecessary maintenance burden.
- **Gating contingency:** before committing, produce a side-by-side default-vs-branded prototype AND confirm the current MailerLite plan permits removing the "Powered by MailerLite" mark and full CSS override. If the plan blocks it, escalate the native-form fallback decision. (Stacey/maintainer can confirm plan tier in the MailerLite dashboard.)

**Contact form**
- **Formspree** (no backend code, free tier, built-in spam filtering). Submissions land in the shared admin inbox **stacey@ladiesonthelinksgolf.com** (Stacey + Melissa + Josh all have access; no new Workspace seat). Melissa is primary responder. mailto, Pages Functions, and routing into MailerLite were rejected.

**Gallery + content pipeline**
- Static **photo showcase grid (not a feed)**. The gallery is **photos only** — narrative member stories move to the **Blog / News** section (see below), leaving the gallery a clean visual archive.
- **Astro content collection**, one Markdown file per gallery entry, validated by a schema. Fields: title, date, photo filename(s), caption, **optional** attribution.
- **Consent model (applies to gallery AND blog):** member photos and stories published opt-in only; attribution defaults to **first name / initials**; standing photo-release understanding at registration; easy takedown path.
- **Authoring:** Melissa edits via the **GitHub web UI** from a copy-paste template; photos drag-dropped into a repo folder in the browser. **Photos stored in the repo** (Astro optimizes at build). No local toolchain.
- **Safety:** Cloudflare Pages keeps the last good deploy on a failed build, so a malformed entry can't take the live site down — it just doesn't publish until fixed. Curated, not publicly submitted (no live moderation needed).

**Blog / News (NEW)**
- A read-only, dated **Blog / News** section: the league's browsable, indexed archive of event recaps, news, and member spotlights/stories. **Read-only** — no comments, reactions, or on-site subscriptions (subscribe = MailerLite). This does not reintroduce the interactive-feed features rejected in §Out of Scope.
- **Complements email, does not replace it.** MailerLite email stays the *push* channel for timely announcements; the blog is the *pull/archive* home. An email blast can be repurposed into a post with near-zero extra effort. The "announcements via email" decision is unchanged.
- **Indexed for recruiting** — posts and the blog index are public and in the sitemap; a fresh recap signals an active league to prospective members.
- **Ownership / cadence:** Stacey writes / provides the voice; **Melissa publishes**. Cadence is **as-events-happen, roughly monthly, no fixed schedule** — the UI is designed so sparse posting still reads as intentional (e.g. "News & Recaps", not a date-stamped ladder that highlights gaps).
- **Same pattern as the gallery:** an Astro content collection, one schema-validated Markdown file per post (fields: title, date, author, cover image, body; optional member attribution), edited via the **GitHub web UI from a template**, images in the repo. Melissa uses the identical workflow she learns for the gallery — no second toolchain. Same build-safety net (a malformed post fails the build, last good deploy stays live).
- **Member stories live here** (moved out of the gallery), under the shared consent model (opt-in, first-name attribution, takedown path).

**Announcements / comms**
- Timely announcements (rainouts, schedule changes) go out via **MailerLite email** (subscriber list = member list); email is the **push** channel. The site's **core pages stay evergreen**, while the **Blog / News** section carries the dated content as a complementary, indexed archive of those blasts. No Home "latest update" banner at launch.

**Shop**
- Launch with a **"future merch coming soon"** teaser only. No live store. Stripe Payment Links (pickup-only, no shipping) deferred until merch exists.

**Content authoring / handoff**
- **Josh drafts all initial page copy** from Stacey's notes; **Stacey reviews/edits**. Stacey must supply raw material (league story, Christian Grace's bio facts, FAQ answers) — a content-gathering dependency for the timeline.
- Melissa receives a **narrow click-by-click runbook** (`docs/melissa-runbook.md`, GitHub-web-UI steps + screenshots) scoped to only her recurring tasks: add gallery photo, publish a blog post (incl. member stories), edit shop teaser / FAQ.

## Testing Decisions

A good test here asserts **external, observable behavior** — what a visitor or the build produces — not implementation details. Because the dynamic functionality is entirely third-party (Bookwhen, MailerLite, Formspree) living behind iframes/hosted services, we do **not** test those services; we test that our site mounts and configures them correctly. There is almost no in-repo business logic, so there are no deep unit tests by design.

Two seams, highest first:

1. **Content-schema / build seam (preferred, highest).** The Astro content-collection schema is the primary test: a malformed or incomplete gallery **or blog** entry must fail the build with a clear error. This is the safety net protecting Melissa's monthly edits. Tests assert that valid entries parse and invalid entries (missing required field, bad image reference) are rejected, for **both** the gallery and blog collections.

2. **Rendered-page smoke seam (Playwright against the built site).** For each route: the page renders and core content is present; the nav contains the expected items and **excludes** the tee sheet; `noindex` pages actually emit the `noindex` directive and indexed pages do not; each integration's **embed container/iframe is present** on its page (we assert our markup mounts the embed — not that Bookwhen/MailerLite render their own content); the Schedule page's inactive tab does not eagerly load its iframe (lazy-load behavior); the blog index lists posts and a post page renders and is indexable (does **not** emit `noindex`); the Facebook link is in the footer.

Prior art: none yet (greenfield repo). Establish these two seams as the conventions future content/pages are tested against. Prefer the build/schema seam over the rendered seam wherever a check can live at build time.

## Out of Scope

- Any member login, accounts, or authentication.
- Comments, reactions, RSVPs, notifications, or any interactive/social feed features (Facebook's interactivity is intentionally not replicated — those needs are served by Bookwhen and the tee sheet, or kept on FB). The Blog / News section is **read-only** content and does not reintroduce these — no post comments, reactions, or on-site subscription.
- A CMS or visual content editor (Decap/Tina etc.) — content is maintainer-edited Markdown in the repo.
- A live store / e-commerce / Stripe checkout — launch ships only a "coming soon" teaser; Stripe Payment Links are a later addition.
- Replacing or migrating Bookwhen, MailerLite, the Google Sheet, or Stripe — the site wraps them, it does not absorb them.
- A native Astro registration form (unless the MailerLite branding-strip gating check fails).
- Real-time/automatic tee-sheet sync into the site — the tee sheet remains an external Google Sheet linked out.
- Gating the tee sheet behind real access control — exposure is matched to today's "anyone with the link" model via noindex + no-embed, not auth.
- High-volume blog/story content at launch — the blog pipeline exists and member stories live there, but only a handful of posts ship initially; no backfill/migration of historical Facebook content.

## Further Notes

- **Pro credentials:** Christian Grace is referred to as "our pro Christian Grace" (PGA Associate, not Class A) — never "our PGA pro". This is a hard copy constraint.
- **Brand voice:** warm and personal, not performatively enthusiastic.
- **Brand palette:** deep forest green `#1A4A33`, warm cream `#F6EFDF`, dusty rose accent `#DE809F` (from the logo). The existing logo is the source mark.
- **Design source of truth:** `design-reference/` holds `index.html` (the Aura-exported home page) and `DESIGN.md` (the design system — the source of truth for the look at build time); real assets live in `images/` (course + members) and `logo-images/`. **These directories are not yet committed to the repo** — they must be added before `/to-issues`.
- **North star:** self-sustaining for the team — Stacey runs operations, Josh owns the tech, Melissa is the trainable second hand for content/admin. Every decision favored the lowest ongoing maintenance.
- **Manual dashboard work Stacey/Josh can do:** confirm MailerLite plan tier (branding strip), swap the Cloudflare `A` record at launch, enable Cloudflare Web Analytics, point Formspree at the shared inbox, set up the standing photo-release at registration.
- **Two latent contingencies to resolve early in the build:** (1) the MailerLite branding-strip plan check (blocks the registration approach if it fails); (2) confirming the two Bookwhen products expose separate embeddable URLs for the tabbed layout (expected yes — they are two separate schedule pages today).
- Next step after this PRD: break into implementation issues (e.g. via `/to-issues`).

