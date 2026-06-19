import { test, expect } from '@playwright/test';

test('privacy page renders the drafted copy', async ({ page }) => {
  const res = await page.goto('/privacy');
  expect(res?.status()).toBe(200);
  await expect(page.locator('h1')).toContainText(/privacy/i);
  const main = page.locator('main');
  await expect(main).toContainText('MailerLite');
  await expect(main).toContainText('Formspree');
  await expect(main).toContainText('We do not sell your information');
});

test('privacy page emits noindex and is reachable from the footer', async ({ page }) => {
  await page.goto('/privacy');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  await expect(page.locator('footer a[href="/privacy"]')).toBeVisible();
});

test('privacy is excluded from the sitemap', async ({ request }) => {
  const res = await request.get('/sitemap-0.xml');
  if (res.ok()) {
    const body = await res.text();
    expect(body).not.toContain('/privacy');
  }
});
