# Launch follow-ups — Ladies on the Links

Open, non-blocking items captured during the PRD #1 closeout audit (2026-06-19).
None of these block the build or the launch; they are cleanups and content swaps to
do as time/assets allow. Grouped by who owns them.

## For Stacey (dashboard / content, no code)

- **MailerLite option wording.** The Register form's two radio groups `returning_member`
  and `season_cadence` were rephrased to drop em dashes (brand voice rule). The visible
  form now reads:
  - "Brand new, first season!" (was "Brand new — first season!")
  - "Honestly, not sure yet, and that's okay!" (was "Honestly, not sure yet — and that's okay!")

  These strings are field **values** submitted to MailerLite, so mirror the new wording
  in the MailerLite dashboard (edit the field options) so the stored value matches the
  form. ⚠️ These are **not** the `golf_level` group-automation trigger (New → Beginners),
  so list automation is unaffected either way.
- **Weather-policy FAQ answer.** Currently a provisional placeholder — confirm the real
  rainout/weather policy wording.

## For Josh (maintainer, swap-later)

- **Christian's headshot.** About / Meet-the-Pro ships a tasteful placeholder; swap in the
  real photo when provided. (Copy constraint stays: "our pro Christian Grace", PGA
  Associate, never "our PGA pro" / "Class A".)
- **Curated gallery + community photos.** Gallery seeds are placeholders (`nh-gallery-1`,
  `nh-gallery-6`). Add curated, web-optimized photos per-slice (originals stage in the
  parent `LOTL/` folder, never bulk-committed; videos excluded from git).
- **Favicon.** None provided — derive a proper mark from the logo. A transparent PNG/SVG
  wordmark would also be cleaner than the current `logo-images/HiLogo.jpg` (JPG on cream).
- **`golf-ball-logo.png`** filename has spaces — rename to drop them.

## Launch (#14) — `ready-for-human`, needs Stacey's Cloudflare 2FA (do NOT attempt unattended)

- Create / connect the Cloudflare Pages project (GitHub-connected, auto-deploy on push).
- Attach the custom domain `ladiesonthelinksgolf.com`.
- Swap the root `A` record from placeholder `192.0.2.1` to the Pages deployment.
- Enable Cloudflare Web Analytics (privacy-friendly, no cookie banner).

Formspree (`mvznnvdv`) and MailerLite are already wired; no integration blockers remain.
