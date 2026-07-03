import { test, expect } from '@playwright/test';

test('About page renders and is indexable', async ({ page }) => {
  const res = await page.goto('/about');
  expect(res?.status()).toBe(200);
  await expect(page.locator('h1')).toContainText(/about/i);
  await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
});

test('Meet-the-Pro section uses the correct, constrained phrasing', async ({ page }) => {
  await page.goto('/about');
  const main = page.locator('main');
  // Required phrasing.
  await expect(main).toContainText('our pro, Christian Grace');
  await expect(main).toContainText('PGA Associate');
  await expect(main).toContainText('$35 per person, 50 minutes, capped at six women');
  // Forbidden phrasing (hard copy constraint).
  await expect(main).not.toContainText('PGA pro');
  await expect(main).not.toContainText('Class A');
});

test('the league story and a swappable placeholder headshot are present', async ({ page }) => {
  await page.goto('/about');
  const main = page.locator('main');
  await expect(main).toContainText('North Hill Country Club');
  await expect(main).toContainText('No judgment, just joy');
  await expect(main).toContainText('Photo coming soon'); // placeholder, swapped for real photo later
});

test('Meet the Team lists the four organizers with titles', async ({ page }) => {
  await page.goto('/about');
  const team = page.locator('[data-section="team"]');
  await expect(team).toContainText('Stacey');
  await expect(team).toContainText('Founder & League Director');
  await expect(team).toContainText('Melissa');
  await expect(team).toContainText('Phoebe');
  await expect(team).toContainText('Josh');
  // Phoebe has no photo yet; her card carries the placeholder treatment.
  await expect(team).toContainText('Photo coming soon');
});
