import { test, expect } from '@playwright/test';

test('League Life renders both sections and is indexable', async ({ page }) => {
  const res = await page.goto('/league-life');
  expect(res?.status()).toBe(200);
  await expect(page.locator('h1')).toContainText(/league life/i);
  await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
  // Stories grid lists the seed posts.
  const items = page.locator('[data-stories-list] > li');
  expect(await items.count()).toBeGreaterThanOrEqual(2);
  // Photo grid renders at least the two seed photos with responsive variants.
  const tiles = page.locator('[data-gallery-grid] img');
  expect(await tiles.count()).toBeGreaterThanOrEqual(2);
  await expect(tiles.first()).toHaveAttribute('srcset', /.+/);
});

test('League Life is read-only: no comments, reactions, or subscribe UI', async ({ page }) => {
  await page.goto('/league-life');
  await expect(page.getByRole('textbox')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /subscribe|comment|like|react/i })).toHaveCount(0);
  await expect(page.locator('form')).toHaveCount(0);
});

test('the photo grid stays anonymous: no captions, alt on every tile', async ({ page }) => {
  await page.goto('/league-life');
  await expect(page.locator('[data-gallery-grid] figcaption')).toHaveCount(0);
  const tiles = page.locator('[data-gallery-grid] img');
  for (let i = 0; i < (await tiles.count()); i++) {
    await expect(tiles.nth(i)).toHaveAttribute('alt', /.+/);
  }
});

test('A story page still renders at its /stories/<slug> URL', async ({ page }) => {
  await page.goto('/league-life');
  await page.locator('[data-stories-list] a').first().click();
  await expect(page).toHaveURL(/\/stories\/.+/);
  await expect(page.locator('h1')).toHaveText(/.+/);
  const body = page.locator('[data-story-body]');
  await expect(body).toBeVisible();
  await expect(body.locator('p').first()).toHaveText(/.+/);
  await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
});

test('old /stories and /gallery URLs redirect to /league-life', async ({ page }) => {
  await page.goto('/stories');
  await page.waitForURL('**/league-life');
  await expect(page.locator('h1')).toContainText(/league life/i);
  await page.goto('/gallery');
  await page.waitForURL('**/league-life');
  await expect(page.locator('h1')).toContainText(/league life/i);
});
