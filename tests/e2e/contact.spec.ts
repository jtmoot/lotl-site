import { test, expect, type Page } from '@playwright/test';

async function fill(page: Page) {
  await page.fill('input[name="name"]', 'Jane Golfer');
  await page.fill('input[name="email"]', 'jane@example.com');
  await page.fill('textarea[name="message"]', 'How do I join?');
}

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
