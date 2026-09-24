# Plan: Cloudflare-native tee sheet sync

**Status: awaiting Josh's approval.** Nothing below is implemented yet.

Replaces the dead Google Apps Script (`lotl-sync.gs`) with a pipeline that lives
entirely in this repo and Josh's Cloudflare account. No Google services.

## What it does, in one paragraph

Bookwhen emails every booking and cancellation to `tee@sync.ladiesonthelinksgolf.com`.
Cloudflare Email Routing hands each message to the existing `lotl-site` Worker, which
parses out event, date, time, and attendee names, and upserts them into D1. Every
15 minutes the same Worker pulls the next 60 days of events (times and capacity) from
the Bookwhen v2 API. A public, noindex `/tee-sheet` page joins the two and shows who is
playing, plus a health line. A one-time import seeds the database from the attendances
CSV Josh exported (June 1 to today) so past attendance is there from day one.

## Decisions (deviations from the brief, all discussed)

| Brief said | Plan does | Why |
|---|---|---|
| Astro on Cloudflare Pages, maybe an API Worker in front | One Worker (`lotl-site`) already serves the site, `/api/*`, and has D1. Email and cron become `email()` and `scheduled()` handlers on it. | One deploy, one config, one binding. No Pages exists. |
| New D1 | New migration `0002_tee_sheet.sql` in the existing `lotl-comments` database | Test harness and migrations dir already exist. |
| Four tables | Five: adds `sync_state` | Health line needs last API sync time and last error stored somewhere. |
| `test/fixtures/` | `tests/fixtures/` | Matches the repo. |
| Two fixtures | Three: HW4R2 booking, HW4R2 cancel, CKKTT two-attendee booking | Multi-attendee is the likeliest breakage. |
| Ref from body | Ref from subject, body as fallback | Old regex never matched cancel bodies (`Booking HW4R2 has been cancelled`, no colon). |
| Nothing said about backfill | Slice 6 imports the attendances CSV | Josh asked for 90 days of history. |

Out of scope for v1: the old script's standing rosters and "Reserved" seat logic,
loaner-clubs column, and any writes back to Bookwhen.

## Conventions carried in

- Rolling windows computed at runtime in `America/New_York`. No hardcoded dates.
- Errors are loud: every failure lands in `sync_state` or `unparsed` and shows on the
  health line. Nothing is swallowed.
- Never extract, store, or render email addresses or phone numbers. Names only.
- Full-file rewrites over partial diffs. Conventional commits. Each slice ends green.
- Branch `feature/tee-sheet-sync` off `main`. Never commit to `main`.

## Data model (migration `0002_tee_sheet.sql`)

```
events              id TEXT PK (Bookwhen id), title, start_at, end_at, slot_key,
                    kind (tee_time|lesson|other), attendee_count, attendee_limit,
                    cancelled_at, synced_at
bookings            slot_key + name_key PK, name (display), slot_key, ref,
                    status (booked|cancelled), source (email|import),
                    message_id, updated_at
processed_messages  message_id PK, subject, received_at, action, ref
unparsed            id PK, message_id, subject, received_at, reason
sync_state          key PK, value, updated_at
```

`slot_key` is `YYYY-MM-DD HH:MM|<slot type>` in league time. Slot type is the old
script's `slotType_`: `tee_time`, `oncourse_lesson`, `lesson`, or `other:<normalized
title>`. Both the email side and the API side produce it the same way, so names attach
to events by date, time, and type, exactly as before. `name_key` is the lowercased,
whitespace-collapsed name.

`sync_state` keys: `api_last_ok_at`, `api_last_error`, `api_last_error_at`,
`email_last_error`, `email_last_error_at`. Last email received is derived from
`processed_messages`.

## Parser (`worker/teesheet/parse.ts`, pure, no I/O)

- Subject: `^\[Bookwhen\] (New booking|Booking cancelled|Ticket cancelled)\. Ref: (\S+)`.
  Anything else returns `unmatched` and the caller writes to `unparsed`.
- Body (text/plain via `postal-mime`): walk lines. A North Hill address line marks the
  line above it as the event title. A `Thu 1 Oct, 10:00am - 11:00am` line opens a slot.
  Each following `Name <email>` line is an attendee; a trailing `- Cancelled` marks that
  seat cancelled. Email is used only to find the split point, then discarded.
- Year inference uses the message's `Date` header, not wall-clock, so replays resolve
  the same date.
- Output: `{ action, ref, attendees: [{ name, slotKey, cancelled }] }`.

## Slices

Each slice: tests first, green, commit. Gates marked **STOP** need Josh.

**0. Inputs.** Copy `~/Downloads/lotl-sync.gs` to `reference/lotl-sync.gs`, the three
`.eml` files to `tests/fixtures/`. Branch, commit.

**1. Schema.** Migration `0002`. Harness applies it. Test: tables exist, PK conflicts
behave (upsert on `bookings`).

**2. Parser.** `postal-mime` dependency. Unit tests against the three fixtures plus
synthetic cases: Ticket cancelled subject, unmatched subject, multi-date booking,
December to January year rollover. Assert no `@` ever appears in output.

**3. Email handler.** `email()` on the Worker: dedupe on `Message-ID`, parse, upsert
`bookings`, record `processed_messages` or `unparsed`. Integration test posts fixtures to
`/cdn-cgi/local/email` in `wrangler dev`, replays one to prove idempotency. Open PR,
merge, confirm deploy.
**STOP:** Josh applies the remote migration (or confirms deploy does it), then flips the
Email Routing rule to the Worker in the dashboard.

**4. Events cron.** `worker/teesheet/bookwhen.ts`: URL builder and event mapper (pure,
tested). `scheduled()` every 15 min: today to today+60, paginate, upsert `events`, write
`api_last_ok_at` or the error. `BOOKWHEN_API_BASE` var so tests point at a local stub.
`triggers.crons` in `wrangler.jsonc`.
**STOP before this slice:** `wrangler login`, then `wrangler secret list`. If
`BOOKWHEN_TOKEN` is absent, Josh sets it. Never guessed, never printed.

**5. Page.** `GET /api/tee-sheet?range=upcoming|past` returns slots with names and
health. `src/pages/tee-sheet.astro`: noindex, excluded from sitemap, static shell that
fetches the API, grid grouped by day, print stylesheet, health line always visible. Not
in nav. Schedule page link points here instead of Google Sheets; update
`tests/e2e/schedule.spec.ts` accordingly. New e2e spec for the page.

**6. Backfill.** `scripts/import-attendances.mjs <csv>`: reads the Bookwhen attendances
export, emits SQL for `events` and `bookings` (name from `Full name`, else `Attendee
customer name`; `Ticket cancelled` set means cancelled; `source = import`). Unit test on
a small synthetic CSV with fake names. Run against local D1 to verify counts, then
`--remote`. The real CSV never enters the repo.

## Verification

`npm test` stays the gate (check, schema, build, worker, e2e). New worker tests use the
existing harness. Before each STOP I report exactly what was verified and how.

## Open questions for Josh

1. How did `0001_init.sql` reach production D1: manual `wrangler d1 migrations apply
   --remote`, or does the Cloudflare build do it?
2. Slice 5 default view is upcoming 60 days with a "past 90 days" link. OK?
