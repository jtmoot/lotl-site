# Claude instructions for lotl-site

Ladies on the Links — Astro 6 + Tailwind 4 static site + a small Cloudflare
Worker (`worker/`) for story likes/comments (D1). Push to `main` auto-deploys
to ladiesonthelinksgolf.com via Cloudflare.

## When responding to change requests (GitHub issues)

- Requests come from the league organizers (Stacey, Melissa, Josh). They are
  non-technical: interpret intent, keep changes small and tasteful, and match
  the site's existing look and copywriting voice.
- Make the change on your branch as usual. Your branch will get a PR and
  auto-merge automatically once CI passes — do not merge anything yourself.
- Verify before finishing: `npm run check` and `npm run build` at minimum.
  The full gate is `npm test` (check + schema + build + worker + e2e).
- Never touch: `.github/workflows/`, `wrangler.jsonc`, DNS/email settings,
  the cancellation/weather policy wording (client-approved legal copy), or
  anything involving secrets. If a request requires those, reply on the issue
  explaining it needs Josh instead of making the change.
- You only see the code on `main`, not the live site. If a requester says the
  site still shows something `main` has already changed, do not tell them to
  refresh and do not close the request as done: say the code is correct, the
  live site may be serving an older deploy, and that Josh needs to check it.
- Booking is Bookwhen (embedded on /schedule: tee-times + lessons tabs,
  `#lessons` deep-links to the lessons tab). Registration is /register.
  Contact email is help@ladiesonthelinksgolf.com.

## Sync alert issues

Issues titled "Tee sheet sync: ..." are opened by the Worker's cron
(`worker/teesheet/alerts.ts`) when the tee sheet's health check stays bad for
two runs. Treat them as bug reports: look for a code cause in
`worker/teesheet/`, fix it with a reproducing test if there is one, and
otherwise say what Josh needs to check or run.

You can look at production data for these issues:
`npx wrangler d1 execute lotl-comments --remote --command "<SQL>"` (tables:
`events`, `bookings`, `processed_messages`, `unparsed`, `sync_state`).

- Read first. Work out the cause from `SELECT`s before changing anything.
- Repairs are allowed when the cause is clear: a targeted `UPDATE` or `DELETE`
  on `bookings` or `events` with a `WHERE` clause you have already run as a
  `SELECT`. Post the exact SQL and the row count on the issue. Never drop or
  empty a table, never run a statement without a `WHERE`.
- Leave the `comments` table alone, and never select or print email addresses.
- If the fix is something only an organizer can decide (an event deleted in
  Bookwhen while people were booked, for example), do not "repair" it: explain
  what you found on the issue and leave it open for Josh.

Player names already appear on the public tee sheet, so they may appear in
query output. Still keep them out of issue comments, PRs and commits: refer
to slots by date, time and event title.

## Conventions

- Conventional commits (feat:, fix:, docs:, chore:).
- Tests live in `tests/` (schema, worker, e2e). Update tests that your change
  makes stale; add coverage for new user-visible behavior.
- Images: never commit a raw photo. Photos attached to a GitHub issue are
  downloaded for you to `/tmp/github-images/` (paths appear in the issue
  text). Add one to the site with
  `node scripts/add-photo.mjs /tmp/github-images/<file> <folder>/<name>.jpg`
  (auto-rotates, downsizes to 1600px, strips EXIF/GPS) — it writes to
  `src/assets/photos/<folder>/<name>.jpg`. Folders: `gallery/` (League Life
  photo wall, add the path to `src/content/gallery/*.md`), `stories/` (story
  covers), `beginners/`, `team/`, `events/`. Then reference it with an import
  or a `cover:` path exactly like the existing files do. Do not try to `cp` or
  otherwise fetch images any other way; if the script fails, say so on the
  issue.
