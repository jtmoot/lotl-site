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

test('the weather answer is present (provisional placeholder)', async ({ page }) => {
  await page.goto('/faq');
  await expect(page.locator('main')).toContainText('rain', { ignoreCase: true });
});
