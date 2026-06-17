# Ladies on the Links: Build Inputs for Claude Code

Real, confirmed input for the build. Drafted copy is in Stacey's voice (warm, personal,
light emoji, no em dashes) and is ready to use unless marked PENDING. Pair with the design
reference in `design-reference/` (index.html + DESIGN.md). Brand palette: deep forest green
#1A4A33, cream #F6EFDF, dusty rose #DE809F, blush #EBA9BE, ink #1C1C22.

---

## 1. Integration artifacts (the wiring)

**Bookwhen — tee times** (Schedule page, "Tee Times" tab, true iframe):
```html
<iframe src="https://bookwhen.com/ladiesonthelinks/iframe" frameborder="0" scrolling="yes" seamless="seamless" style="display:block;border:none;width:100%;height:900px;"></iframe>
```

**Bookwhen — lessons** (Schedule page, "Lessons with Christian Grace" tab, true iframe):
```html
<iframe src="https://bookwhen.com/ladiesonthelinks-lessons/iframe" frameborder="0" scrolling="yes" seamless="seamless" style="display:block;border:none;width:100%;height:900px;"></iframe>
```
Lazy-load the inactive tab's iframe (only one Bookwhen app loads on arrival).

**Google Sheet tee sheet** (link out, do NOT embed; sits beside the Bookwhen embed on the Schedule page; that page is `noindex`):
`https://docs.google.com/spreadsheets/d/1QxwULZs7nSwiVBU6x3CSJo0McFHUbhtuL_Ufa0osAGU/edit?gid=1173477351#gid=1173477351`

**Formspree contact endpoint:** `https://formspree.io/f/mvznnvdv` (points at stacey@ladiesonthelinksgolf.com).
- Astro is static, so either a plain HTML `<form action=... method="POST">` (simplest, redirects to a Formspree thank-you page) or `@formspree/ajax` for inline success/error without leaving the site. **Prefer the AJAX/vanilla version** for better UX. Collect at least name, email, message.

**Facebook (footer link):** `https://www.facebook.com/Ladiesonthelinksgolfleague/` — Facebook only, no Instagram.

**Deploy:** GitHub-connected **Cloudflare Pages** (auto-deploy on push, simplest for Astro, no API token needed). The Pages project, custom-domain attach, and the root `A`-record swap (currently placeholder `192.0.2.1`) all happen at launch.

---

## 2. Registration (MailerLite)
- The custom **HTML embed** lives in the repo (Josh places it). Keep the `<form>` action and all `name="fields[...]"` attributes; **restyle only** from the current pink (#F8D5DE / #E891A4) to brand.
- **Use the HTML embed, not the JS snippet** (you need to own the markup to restyle). Branding-strip contingency is **resolved** — the embed is fully custom CSS with no MailerLite badge.
- **Fields:** Name (req), Email (req), phone, "How did you hear about us?" (select), "Back for more or brand new?" (radio), "Describe your golf game" (radio: New to golf / Comfortable), "How are you picturing your season?" (radio), "Anything else?" (textarea), required "I Understand" terms checkbox.
- **Automation (live, do not rebuild):** on completion, golf level "New" → Beginners group; else → Advanced. Site just mounts the form.
- `/register` is the **front door** — copy tells members to register before booking.

---

## 3. Decisions (locked)
- **No membership dues / no pricing section.** Cut the template's pricing cards. $45 per round, $35 per lesson.
- **Merch gets its own visible "Coming Soon" section** (not a one-liner). Full shop + shipping is a later project.
- **Gallery = general photo grid, no per-photo names/captions at launch.**
- **Stories/Blog = separate section** (member spotlights + recaps, better individual photos over time). Same Astro content-collection pattern as the gallery; Melissa-editable markdown.
- **Stats bar = keep, playful** (see §4).
- Pro is **"our pro Christian Grace"** (confirmed correct — not "PGA pro").
- **Tee-time release cadence = the first Sunday of each month** (confirmed).

---

## 4. Page content (drafted, Stacey's voice)

### Home — Hero
- Eyebrow: **FOR THE LOVE OF GOLF**
- Headline: **The league that plays together.**
- Sub: Welcome to North Hill Country Club's women's golf league in Duxbury. Every Monday, all season long, all skill levels. Come sip, swing, and make some new friends.
- Buttons: **Register for Season 2** (primary) · **Book a Tee Time** (secondary)
- Optional persona framing: "New to the league? Start here." / "Already a member? Book your Monday."

### Home — Welcome / About
Welcome to Ladies on the Links, a women's golf league at North Hill Country Club in Duxbury, MA. We tee off every Monday from June through the end of September, with special events like Glow Golf along the way and a season-ending tournament in early October. Nine holes, scramble format, golf cart included, weekly contests, and a wonderful group of women to share the course with. The whole point of this league is meeting new women, learning the game together, and having fun. All skill levels welcome. No judgment, just joy. 💚

### Home — Three feature cards
1. **All Skill Levels** — Whether you just bought your first set of clubs or you have been playing for years, you belong here. No pressure, no judgment, just joy.
2. **Weekly Play & Lessons** — Monday tee times all season, plus small-group lessons with our pro, Christian Grace. Nine holes, scramble format, cart included.
3. **A Real Community** — Weekly contests, seasonal events like Glow Golf, a year-end tournament, and a great group of women who love a good Monday on the course.

### About / Meet the Pro
Meet our pro, Christian Grace. Christian runs small-group lessons for Ladies on the Links all season long, and he is exactly who you want if you are nervous about getting started. Patient, encouraging, and never the type to make you feel like you are slowing anyone down. Lessons are **$35 per person, 50 minutes, capped at six women**, so there is plenty of personal attention. New to golf? Start with a lesson before your first Monday. Once Christian gives you the green light, you are ready to play.
> PENDING: headshot (none online — need a photo).

### Schedule & Booking (intro, above the tabs)
Book however you like. Come solo, grab a friend, or sign up your whole foursome at checkout. Tee times and lessons are below. Before booking, please **register** so we can add you to the email list for updates, reminders, and event news. New to golf or new to the league? Start with a lesson, then come back here to book your first Monday.

### FAQ
- **Who is this league for?** Every woman who wants to swing a club, sip a drink, and have fun on a Monday. All ages, all skill levels, all stages. Brand new to golf or been playing for years, you belong here.
- **How does it work?** Nine holes in a scramble format, which means you play as a team, so there is no pressure. Golf cart included. $45 per round, weekly contests, and a great group of women.
- **Where do we go?** North Hill Country Club, 29 Merry Avenue, Duxbury, MA. Look for the Ladies on the Links table on the porch facing the 9th hole, and try to arrive about 30 minutes early.
- **Where do I book?** Tee times and lessons are booked through the Schedule page right here on the site. Register first so you are on the email list.
- **When do tee times come out?** New tee times are released on the **first Sunday of each month**, a few weeks at a time. Keep an eye on your inbox so you do not miss the dates you want.
- **Can I cancel, and how?** Yes. Cancel up to 24 hours before your tee time through your booking link, and your spot goes to the waitlist automatically. Within 24 hours, text or email Stacey. All sales are final, but life happens and we handle true emergencies case by case.
- **Can I see who is golfing?** Yes. The live tee sheet (linked on the Schedule page) shows who is signed up for each time.
- **What should I bring?** Your clubs (no rentals at the course, but we have loaner sets, just check the "Need to borrow clubs?" box when you book), golf balls, a glove, tees, water or a cooler, a layer for New England evenings, sunscreen, and a great attitude.
- **What does it cost?** $45 per round and $35 per lesson. No membership dues.
- **What if it rains?** Golf is a rain-or-shine sport, and we play through light weather. If conditions are truly unsafe (thunder, lightning, heavy storms), Stacey will email the group as early as possible to cancel or move that Monday. When in doubt, check your inbox before heading to the course. Weather cancellations called by the league are handled case by case. (PROVISIONAL — confirm with Stacey.)

### Stats bar (playful)
- **220+ ladies and counting**
- **Every Monday, June to September**
- **Countless memories made**
- **2 seasons strong**

### Merch (Coming Soon section)
**Ladies on the Links merch is on the way.** We are putting together gear so you can rep the league on and off the course. Hats, layers, and more, coming soon. Keep an eye out. 👀

### Stories / Blog (intro)
**Stories from the Links.** The women, the Mondays, the moments. Check back for member spotlights, event recaps, and the occasional tip from Christian.

### Footer
- Tagline: For the love of golf.
- Facebook link (above).
- North Hill Country Club · 29 Merry Avenue, Duxbury, MA 02332
- Legal column: link to the Privacy note below.

### Privacy note (short — own page, linked in footer)
**Privacy.** Ladies on the Links keeps things simple. When you register, your details (name, email, phone, and your answers) are stored in our email system (MailerLite) so we can send you league updates and reminders. Messages from our contact form reach us through Formspree and land in our league inbox. Our live tee sheet shows the names of women signed up for each tee time so members can see who is playing; it is shared by link, not posted to the open web. We share photos from our Mondays and events in the gallery and in member stories, with first names only and only with permission, and we will gladly take down any photo or story on request. We do not sell your information. To update or remove your information, email stacey@ladiesonthelinksgolf.com.

---

## 5. Voice guide
Warm, personal, a little playful ("sip & swing," "no judgment, just joy"). Light emoji, bold key phrases. **Avoid em dashes** (use commas/periods). Not performatively enthusiastic. Recurring phrases: "For the love of golf," "Come sip & swing with us," "no judgment, just joy."

---

## 6. Brand assets (file map)
- **Primary wordmark / logo:** `logo-images/HiLogo.jpg` — the script "Ladies on the Links / For the Love of Golf" lockup on cream. Use in nav and footer. Note: it is a JPG on a cream background (no transparency); it sits fine on the cream site, but a transparent PNG/SVG version would be cleaner for the nav if Stacey can supply one later.
- **Branded banner image:** `logo-images/golf-ball-logo.png` — the LOTL + North Hill logo on a golf ball, on the green. Wide. Use as a section banner / CTA band / social (OG) share image. (Rename from "Golf Ball Logo.png" to avoid spaces in paths.)
- **Course photos:** `images/nh-gallery-1.jpg` and `images/nh-gallery-6.jpg` — North Hill course landscapes (from the club's site). Wide, scenic.
- **Hero background:** use `images/nh-gallery-1.jpg` (clean scenic course shot, room for the headline overlay). Put the `HiLogo` wordmark in the nav above it. Keep `golf-ball-logo.png` as a secondary banner / OG image rather than the hero, since it already contains baked-in text.
- **Favicon / circular mark:** none provided. Claude Code can derive a simple favicon from the logo (e.g. the wine-glass-and-flag motif or the "L"). Flag for a proper mark later.
- **Mailerlite embed:** `design-reference/mailerlite-embed.html` (provided).

---

## 7. Still pending (swap-later, none block /to-issues)
- Christian Grace **headshot** — none exists; use a tasteful placeholder until provided.
- **Gallery + community photos** — Claude Code can placeholder; Josh adds the curated set later.
- **Weather policy** — provisional copy in §4; confirm refund/reschedule handling with Stacey.
- **Cloudflare dashboard access** — needs Stacey's 2FA; only required at deploy/launch, not for the build.
