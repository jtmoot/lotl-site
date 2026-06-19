import { test, expect } from '@playwright/test';

const PRIMARY_NAV = [
  'Home',
  'Schedule',
  'About',
  'Gallery',
  'Stories',
  'Merch',
  'FAQ',
  'Contact',
  'Register',
];

test('home renders through the shell', async ({ page }) => {
  const response = await page.goto('/');
  expect(response?.status()).toBe(200);
  await expect(page.locator('h1')).toBeVisible();
  await expect(page.locator('main')).toContainText('all skill levels', { ignoreCase: true });
});

test('primary nav has exactly the nine destinations and excludes the tee sheet', async ({ page }) => {
  await page.goto('/');
  const items = page.locator('[data-nav="primary"] a');
  await expect(items).toHaveCount(PRIMARY_NAV.length);
  await expect(items).toHaveText(PRIMARY_NAV);
  // The live tee sheet must never appear in navigation (PII / indexing posture).
  await expect(page.locator('header')).not.toContainText(/tee sheet/i);
});

test('footer carries Facebook, the North Hill address, and the Privacy link', async ({ page }) => {
  await page.goto('/');
  const footer = page.locator('footer');
  await expect(
    footer.locator('a[href="https://www.facebook.com/Ladiesonthelinksgolfleague/"]'),
  ).toBeVisible();
  await expect(footer).toContainText('29 Merry Avenue');
  await expect(footer.locator('a[href="/privacy"]')).toBeVisible();
});

test('head emits an OG image and a favicon', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute('href', '/favicon.svg');
  const og = page.locator('meta[property="og:image"]');
  await expect(og).toHaveCount(1);
  const content = await og.getAttribute('content');
  expect(content).toMatch(/^https:\/\/ladiesonthelinksgolf\.com\//);
});

test('indexed pages do not emit noindex; the build generates a sitemap', async ({ page, request }) => {
  await page.goto('/');
  await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
  const sitemap = await request.get('/sitemap-index.xml');
  expect(sitemap.ok()).toBeTruthy();
});

test('the noindex mechanism emits the directive (404 page)', async ({ page }) => {
  // The 404 page renders the Layout with `noindex` set — proving the mechanism
  // that #11 (Privacy) depends on.
  await page.goto('/this-route-does-not-exist');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
});
