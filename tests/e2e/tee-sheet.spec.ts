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
  await expect(health).toContainText(/booking email/i);
  await expect(health).toContainText(/events/i);
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
  await expect(page.locator('[data-health]')).toContainText(/last booking email/i);
});

test('range toggle marks the active preset', async ({ page }) => {
  await page.goto('/tee-sheet');
  await expect(page.locator('[data-range="upcoming"]')).toHaveAttribute('aria-current', 'true');
  await page.goto('/tee-sheet?range=past');
  await expect(page.locator('[data-range="past"]')).toHaveAttribute('aria-current', 'true');
});
