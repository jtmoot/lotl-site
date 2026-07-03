# Event poster template

`poster.html` renders the branded event posters used on /events (and shareable
to Facebook). It is a static page: event copy lives in the `EVENTS` object at
the top of the inline script; the hero art is inline SVG per event.

To add or update a poster:

1. Add/edit an entry in `EVENTS` (eyebrow, headline, subline, bottom, hero).
2. Render at 2x with Playwright (from the repo root):

```bash
node -e "
const { chromium } = require('@playwright/test');
(async () => {
  const b = await chromium.launch();
  const page = await b.newPage({ viewport: { width: 1200, height: 1450 }, deviceScaleFactor: 2 });
  await page.goto('file://' + process.cwd() + '/design-reference/event-posters/poster.html?event=YOUR-KEY', { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
  await page.locator('#poster').screenshot({ path: 'poster-YOUR-KEY.png' });
  await b.close();
})();"
```

3. Downsize to 1200x1500 JPEG (quality 92) into `src/assets/photos/events/`
   and reference it from the event's Markdown file.

Posters are 1080x1350 (4:5), rendered at 2160x2700. Fonts load from Google
Fonts (Newsreader + Geist), so rendering needs network access.
