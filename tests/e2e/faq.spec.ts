import { test, expect } from '@playwright/test';

test('FAQ page renders and is indexable', async ({ page }) => {
  const res = await page.goto('/faq');
  expect(res?.status()).toBe(200);
  await expect(page.locator('h1')).toContainText(/questions|FAQ/i);
  await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
});

test('FAQ covers tee-time cadence, register-first, and costs', async ({ page }) => {
  await page.goto('/faq');
  const main = page.locator('main');
  await expect(main).toContainText('first Sunday of each month');
  await expect(main).toContainText('Register first');
  await expect(main).toContainText('$45 per round');
  await expect(main).toContainText('$35 per lesson');
});

test('cancellation answer states the strict 24-hours-after-booking rule', async ({ page }) => {
  await page.goto('/faq');
  const main = page.locator('main');
  await expect(main).toContainText('24 hours after booking');
  await expect(main).toContainText('locked in');
  // The old, contradictory rule must be gone.
  await expect(main).not.toContainText('24 hours before your tee time');
});

test('weather answer matches the published policy', async ({ page }) => {
  await page.goto('/faq');
  const main = page.locator('main');
  await expect(main).toContainText('We play in the rain');
  await expect(main).toContainText('Christian Grace');
  await expect(main).not.toContainText('rain-or-shine sport');
  await expect(page.locator('main a[href^="/policies"]').first()).toBeAttached();
});
