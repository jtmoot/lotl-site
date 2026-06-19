import { test, expect } from '@playwright/test';

test('Gallery page renders and is indexable', async ({ page }) => {
  const res = await page.goto('/gallery');
  expect(res?.status()).toBe(200);
  await expect(page.locator('h1')).toContainText(/gallery|photos/i);
  await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
});

test('Gallery renders a responsive grid of at least the two seed photos', async ({ page }) => {
  await page.goto('/gallery');
  const tiles = page.locator('[data-gallery-grid] img');
  expect(await tiles.count()).toBeGreaterThanOrEqual(2);
  // Build-generated responsive variants: Astro emits srcset on optimized images.
  await expect(tiles.first()).toHaveAttribute('srcset', /.+/);
});

test('the grid is anonymous: no captions or member names', async ({ page }) => {
  await page.goto('/gallery');
  // No per-photo caption elements at launch.
  await expect(page.locator('[data-gallery-grid] figcaption')).toHaveCount(0);
  // Every tile image still carries alt text for accessibility.
  const tiles = page.locator('[data-gallery-grid] img');
  for (let i = 0; i < (await tiles.count()); i++) {
    await expect(tiles.nth(i)).toHaveAttribute('alt', /.+/);
  }
});
