import { test, expect, type Page } from '@playwright/test';

async function fill(page: Page) {
  await page.fill('input[name="name"]', 'Jane Golfer');
  await page.fill('input[name="email"]', 'jane@example.com');
  await page.fill('textarea[name="message"]', 'How do I join?');
}

test('Contact page renders quick answers and the form, and is indexable', async ({ page }) => {
  const res = await page.goto('/contact');
  expect(res?.status()).toBe(200);
  await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
  await expect(page.locator('#faq')).toBeVisible();
  await expect(page.locator('#message')).toBeVisible();
});

test('quick answers cover tee-time cadence, register-first, and costs', async ({ page }) => {
  await page.goto('/contact');
  const main = page.locator('main');
  await expect(main).toContainText('first Sunday of each month');
  await expect(main).toContainText('Register first');
  await expect(main).toContainText('$45 per round');
  await expect(main).toContainText('$35 per lesson');
});

test('cancellation answer states the strict 24-hours-after-booking rule', async ({ page }) => {
  await page.goto('/contact');
  const main = page.locator('main');
  await expect(main).toContainText('24 hours after booking');
  await expect(main).toContainText('locked in');
  // The old, contradictory rule must be gone.
  await expect(main).not.toContainText('24 hours before your tee time');
});

test('weather answer matches the published policy', async ({ page }) => {
  await page.goto('/contact');
  const main = page.locator('main');
  await expect(main).toContainText('We play in the rain');
  await expect(main).toContainText('Christian Grace');
  await expect(main).not.toContainText('rain-or-shine sport');
  await expect(page.locator('main a[href^="/policies"]').first()).toBeAttached();
});

test('old /faq URL redirects to /contact', async ({ page }) => {
  await page.goto('/faq');
  await page.waitForURL('**/contact');
  await expect(page.locator('#faq')).toBeVisible();
});

test('contact form collects name, email, and message', async ({ page }) => {
  await page.goto('/contact');
  await expect(page.locator('form[action*="formspree.io"]')).toHaveCount(1);
  await expect(page.locator('input[name="name"]')).toBeVisible();
  await expect(page.locator('input[name="email"]')).toBeVisible();
  await expect(page.locator('textarea[name="message"]')).toBeVisible();
});

test('submits via AJAX and shows inline success without navigating away', async ({ page }) => {
  await page.route('**/formspree.io/**', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }),
  );
  await page.goto('/contact');
  await fill(page);
  await page.click('button[type="submit"]');
  await expect(page.locator('[data-form-success]')).toBeVisible();
  expect(new URL(page.url()).pathname).toBe('/contact'); // no navigation
});

test('shows an inline error when the submission fails', async ({ page }) => {
  await page.route('**/formspree.io/**', (route) =>
    route.fulfill({ status: 422, contentType: 'application/json', body: '{"errors":[{"message":"bad"}]}' }),
  );
  await page.goto('/contact');
  await fill(page);
  await page.click('button[type="submit"]');
  await expect(page.locator('[data-form-error]')).toBeVisible();
});
