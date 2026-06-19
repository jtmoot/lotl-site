import { test, expect } from '@playwright/test';

test('merch page shows a Coming Soon section and is indexable', async ({ page }) => {
  const res = await page.goto('/merch');
  expect(res?.status()).toBe(200);
  await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
  await expect(page.locator('main')).toContainText(/coming soon/i);
  await expect(page.locator('main')).toContainText('on the way');
});

test('merch page has no store or cart', async ({ page }) => {
  await page.goto('/merch');
  await expect(page.locator('main')).not.toContainText(/add to cart|\$\d/i);
  await expect(page.locator('form')).toHaveCount(0);
});
