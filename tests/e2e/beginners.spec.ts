import { test, expect } from '@playwright/test';

test('Beginners page renders facts, photos, spotlight, and CTAs', async ({ page }) => {
  const res = await page.goto('/beginners');
  expect(res?.status()).toBe(200);
  await expect(page.locator('h1')).toContainText(/new to golf/i);
  const main = page.locator('main');
  await expect(main).toContainText('$35 to $45');
  await expect(main).toContainText('we have clubs for our beginners');
  expect(await page.locator('[data-beginner-photos] img').count()).toBe(4);
  await expect(main).toContainText('On-course lesson with Rob');
  // Spotlight pulls the newest spotlight story (Chrissy) and links to it.
  const spotlight = page.locator('[data-member-spotlight]');
  await expect(spotlight).toContainText('I actually look like a golfer');
  await expect(spotlight.locator('a[href="/stories/what-does-a-golfer-look-like"]').first()).toBeVisible();
  await expect(page.locator('main a[href="https://bookwhen.com/ladiesonthelinks"]').first()).toBeVisible();
  await expect(page.locator('main a[href="/register"]').first()).toBeVisible();
});

test('Beginners is in the nav, and the story shows the pull quote', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('header nav a[href="/beginners"]').first()).toBeAttached();
  await page.goto('/stories/what-does-a-golfer-look-like');
  await expect(page.locator('[data-pull-quote]')).toContainText('I actually look like a golfer');
  await expect(page.locator('main')).toContainText('Chrissy McGrath Richards');
});
