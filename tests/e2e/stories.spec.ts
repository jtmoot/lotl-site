import { test, expect } from '@playwright/test';

test('Stories index renders, lists posts, and is indexable', async ({ page }) => {
  const res = await page.goto('/stories');
  expect(res?.status()).toBe(200);
  await expect(page.locator('h1')).toContainText(/stories/i);
  // Public archive: must NOT emit a noindex directive (it belongs in the sitemap).
  await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
  // Lists the seed posts.
  const items = page.locator('[data-stories-list] > li');
  expect(await items.count()).toBeGreaterThanOrEqual(2);
});

test('Stories index is read-only: no comments, reactions, or subscribe UI', async ({ page }) => {
  await page.goto('/stories');
  await expect(page.getByRole('textbox')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /subscribe|comment|like|react/i })).toHaveCount(0);
  await expect(page.locator('form')).toHaveCount(0);
});

test('A story page renders its body and is indexable', async ({ page }) => {
  await page.goto('/stories');
  await page.locator('[data-stories-list] a').first().click();
  await expect(page).toHaveURL(/\/stories\/.+/);
  // The post title is the page h1.
  await expect(page.locator('h1')).toHaveText(/.+/);
  // The Markdown body rendered into the page.
  const body = page.locator('[data-story-body]');
  await expect(body).toBeVisible();
  await expect(body.locator('p').first()).toHaveText(/.+/);
  // Still indexable.
  await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
});
