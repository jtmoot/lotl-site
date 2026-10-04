import { test, expect } from '@playwright/test';

test('Events page renders and is indexable', async ({ page }) => {
  const res = await page.goto('/events');
  expect(res?.status()).toBe(200);
  await expect(page.locator('h1')).toContainText(/events/i);
  await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
});

test('Boos & Birdies leads the upcoming events and the tournament is gone', async ({ page }) => {
  await page.goto('/events');
  const upcoming = page.locator('[data-events="upcoming"]');
  await expect(upcoming.locator('h3').first()).toHaveText(/Boos & Birdies/);
  await expect(upcoming).toContainText('October 27, 2026');
  await expect(upcoming).not.toContainText('Season-End Tournament');
  await expect(upcoming).not.toContainText('Evening Glo Golf');
  await expect(upcoming.locator('a[href="https://bookwhen.com/ladiesonthelinks/e/ev-s43uj-20261027120000"]')).toHaveCount(1);
});

test('Glo Golf sits under Past events', async ({ page }) => {
  await page.goto('/events');
  const past = page.locator('[data-events="past"]');
  await expect(past.locator('h2')).toHaveText('Past events');
  await expect(past).toContainText('Evening Glo Golf');
  await expect(past).toContainText('September 18, 2026');
  await expect(past.locator('img[alt="Evening Glo Golf event poster"]')).toHaveCount(1);
});

test('the winter pop-ups and 2027 trip appear as teasers without booking CTAs', async ({ page }) => {
  await page.goto('/events');
  const teaser = page.locator('[data-events="teaser"]');
  // Winter (sooner) sorts above the 2027 trip.
  await expect(teaser).toContainText('Winter Pop-Ups');
  await expect(teaser).toContainText('This winter');
  await expect(teaser).toContainText("A Women's Golf Trip Abroad");
  await expect(teaser).toContainText('Summer 2027');
  await expect(teaser.locator('a[href="/schedule"]')).toHaveCount(0);
});

test('Events is linked from the nav and footer', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-nav="primary"] a[href="/events"]')).toBeVisible();
  await expect(page.locator('footer a[href="/events"]')).toBeVisible();
});
