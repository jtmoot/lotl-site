import { test, expect } from '@playwright/test';

test('Events page renders and is indexable', async ({ page }) => {
  const res = await page.goto('/events');
  expect(res?.status()).toBe(200);
  await expect(page.locator('h1')).toContainText(/events/i);
  await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
});

test('Glo Golf appears as an upcoming event with a booking CTA', async ({ page }) => {
  await page.goto('/events');
  const upcoming = page.locator('[data-events="upcoming"]');
  await expect(upcoming).toContainText('Evening Glo Golf');
  await expect(upcoming).toContainText('Date coming soon');
  await expect(upcoming.locator('a[href="/schedule"]')).toBeVisible();
});

test('the 2027 trip appears as a teaser without a booking CTA', async ({ page }) => {
  await page.goto('/events');
  const teaser = page.locator('[data-events="teaser"]');
  await expect(teaser).toContainText("A Women's Golf Trip Abroad");
  await expect(teaser).toContainText('Summer 2027');
  await expect(teaser.locator('a[href="/schedule"]')).toHaveCount(0);
});

test('Events is linked from the nav and footer', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-nav="primary"] a[href="/events"]')).toBeVisible();
  await expect(page.locator('footer a[href="/events"]')).toBeVisible();
});
