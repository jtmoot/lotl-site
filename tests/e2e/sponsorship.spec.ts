import { test, expect } from '@playwright/test';

test('the Glow Golf sponsorship page renders the packet content', async ({ page }) => {
  const res = await page.goto('/glow-golf-sponsorship');
  expect(res?.status()).toBe(200);
  await expect(page.locator('h1')).toContainText('Where Women, Golf & Business');
  await expect(page.locator('#main')).toContainText('Title Sponsor');
  await expect(page.locator('#main')).toContainText('$1,500');
  await expect(page.locator('#main')).toContainText('$250 Sponsorships');
  await expect(page.locator('#main')).toContainText('Longest Drive Sponsor');
});

test('sponsorship contact and packet download are wired up', async ({ page }) => {
  await page.goto('/glow-golf-sponsorship');
  await expect(page.locator('a[href^="mailto:stacey@ladiesonthelinksgolf.com"]')).toBeVisible();
  await expect(page.locator('a[href="/glow-golf-sponsorship.pdf"]')).toBeVisible();
});
