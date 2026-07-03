import { test, expect } from '@playwright/test';

test('Policies page renders with both anchored sections', async ({ page }) => {
  const res = await page.goto('/policies');
  expect(res?.status()).toBe(200);
  await expect(page.locator('h1')).toContainText(/policies/i);
  await expect(page.locator('#weather')).toBeVisible();
  await expect(page.locator('#cancellation')).toBeVisible();
});

test('the strict cancellation rule is stated', async ({ page }) => {
  await page.goto('/policies');
  const c = page.locator('#cancellation');
  await expect(c).toContainText('24 hours');
  await expect(c).toContainText('locked in');
  await expect(c).toContainText('ladiesonthelinks.league@gmail.com');
});

test('the weather commitment is stated', async ({ page }) => {
  await page.goto('/policies');
  const w = page.locator('#weather');
  await expect(w).toContainText('We play in the rain');
  await expect(w).toContainText('Christian Grace');
  await expect(w).toContainText('1 hour before');
});

test('policies is linked from the footer and the schedule page', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('footer a[href="/policies"]')).toBeVisible();
  await page.goto('/schedule');
  await expect(page.locator('main a[href^="/policies"]')).toBeVisible();
});
