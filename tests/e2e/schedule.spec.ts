import { test, expect } from '@playwright/test';

const TEE = 'bookwhen.com/ladiesonthelinks/iframe';
const LESSONS = 'bookwhen.com/ladiesonthelinks-lessons/iframe';

test('schedule page is indexable and shows two tabs with Tee Times default', async ({ page }) => {
  const res = await page.goto('/schedule');
  expect(res?.status()).toBe(200);
  await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
  const tabs = page.locator('[role="tab"]');
  await expect(tabs).toHaveCount(2);
  await expect(page.locator('[role="tab"][aria-selected="true"]')).toContainText(/tee times/i);
});

test('only the active Bookwhen iframe loads on arrival (inactive is lazy)', async ({ page }) => {
  await page.goto('/schedule');
  const iframes = page.locator('iframe');
  await expect(iframes).toHaveCount(2);
  // Active (Tee Times) iframe is loaded eagerly.
  const tee = page.locator('iframe[data-tab="tee-times"]');
  expect(await tee.getAttribute('src')).toContain(TEE);
  // Inactive (Lessons) iframe is deferred: no src yet, only data-src.
  const lessons = page.locator('iframe[data-tab="lessons"]');
  expect(await lessons.getAttribute('src')).toBeNull();
  expect(await lessons.getAttribute('data-src')).toContain(LESSONS);
});

test('activating the Lessons tab loads its iframe', async ({ page }) => {
  await page.goto('/schedule');
  await page.getByRole('tab', { name: /lessons/i }).click();
  const lessons = page.locator('iframe[data-tab="lessons"]');
  await expect(lessons).toHaveAttribute('src', new RegExp(LESSONS.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
});

test('tee sheet is a contextual link out (not embedded, not in nav)', async ({ page }) => {
  await page.goto('/schedule');
  const teeSheet = page.locator('main a[href*="docs.google.com/spreadsheets"]');
  await expect(teeSheet).toHaveCount(1);
  // It must not be in the primary nav.
  await expect(page.locator('[data-nav="primary"] a[href*="docs.google.com"]')).toHaveCount(0);
});

test('intro covers register-first, foursome, and loaner clubs', async ({ page }) => {
  await page.goto('/schedule');
  const main = page.locator('main');
  await expect(main).toContainText('register', { ignoreCase: true });
  await expect(main).toContainText('foursome', { ignoreCase: true });
  await expect(main).toContainText('loaner', { ignoreCase: true });
});
