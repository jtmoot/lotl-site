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
- Booking is Bookwhen (embedded on /schedule: tee-times + lessons tabs,
  `#lessons` deep-links to the lessons tab). Registration is /register.
  Contact email is help@ladiesonthelinksgolf.com.

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
