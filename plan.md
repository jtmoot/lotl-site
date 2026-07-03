# Plan — design-elevation pass ("less vibecoded")

**Goal:** make the site feel intentionally designed (warm editorial / country-club
magazine), not templated. Same brand palette (forest/cream/rose) + fonts (Newsreader /
Geist). No new scope, no business re-architecture — that's a separate future phase.

## Approach: sample Home first, then roll out
Do the Home page first as a proof of direction, screenshot for Josh, and only propagate to
the other pages on approval. Keeps the change reviewable.

## Home page moves (sample)
- **Hero:** break the dead-center layout. Asymmetric composition, oversized Newsreader
  display headline, a refined image treatment (not a flat wash), staggered load-in reveal.
- **Welcome:** editorial two-column rhythm; drop the centered-everything block. Optional
  drop cap; the member photo integrated as part of the composition, not tacked on.
- **Feature cards:** replace generic equal cards with a more editorial set (numbered,
  hairline rules, asymmetric sizing, hover detail).
- **Stats bar:** number-led, letter-spaced labels; make it feel like a designed band.
- **Detailing:** consistent eyebrow style (letter-spaced caps), hairline dividers,
  intentional vertical rhythm, one memorable accent motif.

## Rollout (after Home is approved)
About (founder/Stacey story spread with photo), Gallery (varied mosaic vs uniform grid),
Stories, Schedule, and the shared Nav/Footer detailing.

## Guardrails
- Keep all copy verbatim (Stacey's voice, no em dashes) and all integrations intact
  (Bookwhen, MailerLite, Formspree, tee sheet). Design only.
- Keep the verify gate green (check / schema / build / e2e 38/38) and re-screenshot.
- Conventional commits; feature branch; plan.md ephemeral.

## Open question
Confirm the direction (warm editorial) and that Home-first sampling is the right scope.
