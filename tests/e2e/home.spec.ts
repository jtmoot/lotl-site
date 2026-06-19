import { test, expect } from '@playwright/test';

test('hero renders the drafted pitch copy', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-hero]')).toContainText('For the love of golf', { ignoreCase: true });
  await expect(page.locator('h1')).toContainText('plays together');
  await expect(page.locator('main')).toContainText('Every Monday', { ignoreCase: true });
});

test('the three feature cards link to Register, Schedule, and Gallery', async ({ page }) => {
  await page.goto('/');
  const cards = page.locator('[data-feature-cards] a[href]');
  await expect(cards).toHaveCount(3);
  await expect(page.locator('[data-feature-cards] a[href="/register"]')).toBeVisible();
  await expect(page.locator('[data-feature-cards] a[href="/schedule"]')).toBeVisible();
  await expect(page.locator('[data-feature-cards] a[href="/gallery"]')).toBeVisible();
});

test('the four-stat bar shows the four exact stats', async ({ page }) => {
  await page.goto('/');
  const bar = page.locator('[data-stats]');
  await expect(bar).toContainText('220+ ladies and counting');
  await expect(bar).toContainText('Every Monday, June to September');
  await expect(bar).toContainText('Countless memories made');
  await expect(bar).toContainText('2 seasons strong');
});

test('hero CTAs jump to Register and Schedule', async ({ page }) => {
  await page.goto('/');
  const hero = page.locator('[data-hero]');
  await expect(hero.locator('a[href="/register"]').first()).toBeVisible();
  await expect(hero.locator('a[href="/schedule"]').first()).toBeVisible();
});
