# PRD: Likes & Comments on Stories

**Status: awaiting Josh's approval.** Reverses the earlier "League Life is
read-only" decision (deliberate, with Stacey's buy-in).

## What we're building

Members can ♥ a story and leave a comment (name + optional email, no
accounts). Comments appear immediately (post-moderation); every new comment
emails `help@ladiesonthelinksgolf.com` with a one-click signed **Delete**
link. Like counts show on story pages (tappable) and on League Life story
cards (display only).

## Decisions (from the 2026-07-04 grill)

| Decision | Choice |
|---|---|
| Identity | No accounts. Name required, email optional (never displayed; used as Reply-To in the notification). |
| Moderation | Post-moderation. Live immediately; signed delete link in notification email. |
| Likes | Anonymous, one per browser (localStorage). Count on cards is display-only. |
| Notifications | Resend API → `help@ladiesonthelinksgolf.com`, from `stories@ladiesonthelinksgolf.com`. |
| Spam | Honeypot field + rate limit (3 comments/min/IP via D1) + Cloudflare Turnstile (Managed mode). Turnstile pulled into scope 2026-07-04 per Josh. |
| Threading | Flat. No replies, no author edit/delete. |
| Display | Name, date, text. Newest last (reading order). |

## Architecture

Today the site is pure static assets on Cloudflare Workers. This adds the
first server code and database:

- **Worker** (`worker/index.ts`): serves `/api/*`; everything else falls
  through to static assets (`run_worker_first: ["/api/*"]` in wrangler.jsonc,
  plus `main` + D1 binding + `ASSETS` binding).
- **D1** database `lotl-comments`:
  - `comments(id, slug, name, email, body, created_at, ip_hash)`
  - `likes(slug PRIMARY KEY, count)`
- **Endpoints**:
  - `GET  /api/stories/:slug` → `{ likes, comments: [...] }` (one call per page)
  - `POST /api/stories/:slug/like`
  - `POST /api/stories/:slug/comments` → honeypot check, Turnstile
    server-side verify (siteverify API, secret `TURNSTILE_SECRET`; official
    dummy keys in dev/e2e), rate-limit check, field validation (name ≤ 80,
    body ≤ 2000, slug must match a real story), insert, fire Resend
    notification (non-blocking; comment succeeds even if email fails)
  - `GET  /api/comments/:id/delete?sig=…` → HMAC-signed (secret
    `DELETE_LINK_SECRET`), idempotent, returns a tiny branded "comment
    removed" page. GET-with-signature so it's one click from Gmail.
- **Secrets** (Doppler → `wrangler secret put`): `RESEND_API_KEY`,
  `DELETE_LINK_SECRET`, `TURNSTILE_SECRET`. The Turnstile *site key* is
  public and lives in code. `ip_hash` = salted SHA-256, raw IPs never stored.
- **Frontend** (vanilla JS, matches site's zero-framework pattern):
  - Story page: heart button + count under the header; comments section +
    form after the body. Progressive enhancement — section hidden without JS.
  - League Life cards: "♥ n" chip, populated by one batched
    `GET /api/likes?slugs=…` (n ≤ ~20; skipped entirely if fetch fails).
  - Brand styling per global.css tokens; honeypot field visually hidden but
    autocomplete-proof.

## Copy (Stacey's voice)

- Section heading: "Leave a note"
- Placeholder: "Say hi, cheer someone on, share your Monday…"
- After post: "Thanks! Your note is live."
- Empty state: "No notes yet — be the first."

## Testing (TDD)

- **Schema/unit** (node --test, mirrors existing `tests/schema`): validation,
  HMAC sign/verify, honeypot rejection, rate-limit window math.
- **Worker integration**: endpoints against a local D1 (miniflare via
  `wrangler dev`) — happy paths, oversize fields, unknown slug, bad
  signature, double-like semantics.
- **E2E (Playwright)**: story page renders comments + heart; posting a
  comment shows it; **rewrite** `league-life.spec.ts` "read-only" test to the
  new contract (cards show like chips; no comment forms on the index page).
- Full gate stays `npm test`.

## Rollout

1. Branch `feature/story-comments`; D1 created via Cloudflare API before merge.
2. Deploy keeps single `wrangler deploy` (worker + assets together).
3. Post-deploy: seed a welcome comment from Stacey on the newest story so the
   section never launches empty; Josh sends a test comment and clicks its
   delete link end-to-end.
4. Prereqs from Josh: Resend domain verified, scoped API key in Doppler.

## Out of scope (explicitly)

Replies/threading · comment editing · admin dashboard ·
likes/comments on events or gallery · RSS/email subscription to stories.
