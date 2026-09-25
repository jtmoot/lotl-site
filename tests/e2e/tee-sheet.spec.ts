import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

// The fixtures book "Thu 1 Oct" (received 24 Sep 2026); query that day explicitly.
const DAY = '2026-10-01';
// A range with nothing in it, regardless of what other tests deliver.
const EMPTY = 'from=2000-01-01&to=2000-01-02';

test('tee sheet is noindex, out of the sitemap, and not in the nav', async ({ page, request }) => {
  const res = await page.goto(`/tee-sheet?${EMPTY}`);
  expect(res?.status()).toBe(200);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  await expect(page.locator('header')).not.toContainText(/tee sheet/i);
  await expect(page.locator('[data-nav="primary"] a[href="/tee-sheet"]')).toHaveCount(0);

  const sitemap = await request.get('/sitemap-0.xml');
  if (sitemap.ok()) expect(await sitemap.text()).not.toContain('/tee-sheet');
});

test('an empty range says so and the health line is loud about a never-synced state', async ({ page }) => {
  await page.goto(`/tee-sheet?${EMPTY}`);
  await expect(page.locator('[data-empty]')).toContainText('Nothing on the sheet');
  const health = page.locator('[data-health]');
  await expect(health).toContainText(/events refresh in \d+ minutes?/i);
  // Fresh local database: the cron has never run, and the line says so loudly.
  await expect(health).toContainText(/never been refreshed/i);
});

test('a delivered booking email shows the name in a print-friendly table', async ({ page, request }) => {
  const raw = readFileSync('tests/fixtures/booking-hw4r2.eml');
  const delivered = await request.post(
    '/cdn-cgi/handler/email?from=mail@bookwhen.com&to=tee@sync.ladiesonthelinksgolf.com',
    { data: raw, headers: { 'content-type': 'message/rfc822' } }
  );
  expect(delivered.ok()).toBeTruthy();

  await page.goto(`/tee-sheet?from=${DAY}&to=${DAY}`);
  const day = page.locator(`[data-day="${DAY}"]`);
  await expect(day.locator('h2')).toContainText('Thursday, October 1');
  const row = day.locator('tr[data-slot]');
  await expect(row).toHaveCount(1);
  await expect(row).toContainText('10:00 AM');
  await expect(row.locator('[data-players] li')).toHaveText(['jimmy horn']);
  // Names only: no email address anywhere on the page.
  expect(await page.locator('main').innerText()).not.toMatch(/@/);
  await expect(page.locator('[data-health]')).toContainText(/events refresh in/i);
});

test('range toggle marks the active preset', async ({ page }) => {
  await page.goto('/tee-sheet');
  await expect(page.locator('[data-range="upcoming"]')).toHaveAttribute('aria-current', 'true');
  await page.goto('/tee-sheet?range=past');
  await expect(page.locator('[data-range="past"]')).toHaveAttribute('aria-current', 'true');
});

test('days are collapsible and filters narrow by type, day, and search', async ({ page, request }) => {
  // Its own day, so the parallel test above keeps its single-name slot intact:
  // the two-attendee fixture is re-dated to Fri 2 Oct with a fresh Message-ID.
  const DAY = '2026-10-02';
  const raw = readFileSync('tests/fixtures/booking-ckktt-two-attendees.eml')
    .toString('latin1')
    .replace('Thu 1 Oct, 10:00am - 11:00am', 'Fri 2 Oct, 10:00am - 11:00am')
    .replace('<6ab568abacd07_4ab082251f3@bgjobs-deployment-855898886d-d9t6l.mail>', '<filters-1@test.local>');
  const res = await request.post(
    '/cdn-cgi/handler/email?from=mail@bookwhen.com&to=tee@sync.ladiesonthelinksgolf.com',
    { data: Buffer.from(raw, 'latin1'), headers: { 'content-type': 'message/rfc822' } }
  );
  expect(res.ok()).toBeTruthy();

  await page.goto(`/tee-sheet?from=${DAY}&to=${DAY}`);
  const day = page.locator(`details[data-day="${DAY}"]`);
  await expect(day).toHaveAttribute('open', '');
  await expect(day.locator('[data-day-summary]')).toContainText('1 slot');
  await expect(day.locator('[data-day-summary]')).toContainText('2 players');

  // Collapse by clicking the summary; the table hides.
  await day.locator('summary').click();
  await expect(day).not.toHaveAttribute('open', '');
  await expect(day.locator('table')).toBeHidden();

  // Type filter: "Lessons" hides the other-type slot; "Other" brings it back.
  await page.locator('[data-type="lesson"]').click();
  await expect(page.locator('[data-no-match]')).toBeVisible();
  await expect(page).toHaveURL(/type=lesson/);
  await page.locator('[data-type="other"]').click();
  await expect(page.locator('tr[data-slot]')).toHaveCount(1);

  // Search matches a name and opens the day.
  await page.locator('[data-search]').fill('marsh');
  await expect(page).toHaveURL(/q=marsh/);
  await expect(page.locator('tr[data-slot]')).toHaveCount(1);
  await expect(page.locator(`details[data-day="${DAY}"]`)).toHaveAttribute('open', '');
  await page.locator('[data-search]').fill('nobody-by-this-name');
  await expect(page.locator('[data-no-match]')).toBeVisible();

  // Filters arrive from the URL too.
  await page.goto(`/tee-sheet?from=${DAY}&to=${DAY}&type=tee_time`);
  await expect(page.locator('[data-no-match]')).toBeVisible();
  await expect(page.locator('[data-type="tee_time"]')).toHaveAttribute('aria-pressed', 'true');
  await page.goto(`/tee-sheet?from=${DAY}&to=${DAY}&day=${DAY}`);
  await expect(page.locator('tr[data-slot]')).toHaveCount(1);
  await expect(page.locator('[data-day-filter]')).toHaveValue(DAY);
});
