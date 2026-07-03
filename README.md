# Ladies on the Links

The website for **Ladies on the Links**, a women's community golf group. Built
with [Astro](https://astro.build) and [Tailwind CSS](https://tailwindcss.com),
deployed on Cloudflare Pages.

Live site: _add URL after launch_

---

## Editing the site (non-developers)

If you just want to add a photo, publish a story, or tweak some wording, you do
**not** need any of the developer setup below. Everything can be done from your
web browser on GitHub.com. See the step-by-step guide:

**[docs/melissa-runbook.md](docs/melissa-runbook.md)**

---

## Editing with an AI coding agent (advanced)

Every push to the `main` branch **automatically rebuilds and redeploys the live
site** on Cloudflare, usually within about two minutes. There are no servers or
deploy steps to manage: the whole pipeline is `git push` to `main` -> Cloudflare
build -> live at ladiesonthelinksgolf.com.

That means you can make changes with an AI coding tool and see them go live just
by pushing. Clone this repo, open it in something like
[Claude Code](https://claude.com/claude-code), OpenAI Codex, or Cursor, and
describe the change in plain language ("add a new FAQ about parking", "swap the
hero photo for this one", "start a new member spotlight"). The agent edits the
files; you commit and push to `main`, and Cloudflare handles the rest. Run
`npm run dev` first if you want to preview locally before pushing.

---

## Developer setup

Requires [Node.js](https://nodejs.org) 20+.

```bash
npm install        # install dependencies
npm run dev        # start the local dev server (http://localhost:4321)
```

### Commands

| Command             | What it does                                              |
| ------------------- | -------------------------------------------------------- |
| `npm run dev`       | Local dev server with hot reload                          |
| `npm run build`     | Production build to `dist/`                               |
| `npm run preview`   | Serve the production build locally                        |
| `npm run check`     | Type-check Astro files (`astro check`)                    |
| `npm run test:e2e`  | Playwright end-to-end tests                               |
| `npm run test`      | Full gate: check, schema tests, build, e2e               |

> Note: run `npm run test:e2e` against a production build, not `astro dev`. The
> dev toolbar injects stray elements that break the strict test selectors. To
> screenshot the built site, use `npm run preview -- --host` and open
> `http://127.0.0.1:4321`.

## Project layout

```
src/
  assets/photos/   image originals (optimized at build time)
  components/      shared + home-page Astro components
  content/         editable content collections (gallery, stories)
  layouts/         page shell
  pages/           one file per route
  styles/          global.css: brand colors, fonts, shared utilities
docs/              runbooks and launch notes
tests/e2e/         Playwright specs (these encode content/nav guarantees)
```

## Content collections

Editable content lives in `src/content/` as Markdown with frontmatter, validated
by schemas in the content config. Two collections:

- `gallery/`: anonymized photo sets (no names or captions)
- `stories/`: blog posts and member spotlights (first names only, with consent)

## Deployment

Cloudflare Pages, configured to build on push to `main`:

- **Build command:** `npm run build`
- **Output directory:** `dist`
- **Node version:** 20+

A push to `main` triggers a rebuild. If a build fails, the live site keeps
serving the last good build.

## Secrets

Managed via [Doppler](https://www.doppler.com), never committed. `.env` is
local-only and gitignored; the committed contract is `.env.example` with
placeholders only. Run commands that need secrets with `doppler run -- <command>`.

## License

Source code is MIT licensed. Photographs, written content, and the Ladies on the
Links branding are **not** covered by that license and are all rights reserved.
See [LICENSE](LICENSE) before forking or reusing anything.
