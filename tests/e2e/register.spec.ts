import { test, expect } from '@playwright/test';

test('register page mounts the MailerLite form with field names intact', async ({ page }) => {
  const res = await page.goto('/register');
  expect(res?.status()).toBe(200);
  const form = page.locator('form[action*="mailerlite"]');
  await expect(form).toHaveCount(1);
  // The exact MailerLite field names must survive (they drive field mapping + automation).
  for (const name of ['fields[name]', 'fields[email]', 'fields[golf_level]', 'fields[agreed_to_terms][]']) {
    await expect(form.locator(`[name="${name}"]`).first()).toHaveCount(1);
  }
});

test('the form is restyled to brand with no pink and no MailerLite badge', async ({ page }) => {
  await page.goto('/register');
  const html = await page.content();
  // Original MailerLite pink must be gone.
  expect(html).not.toContain('#F8D5DE');
  expect(html).not.toContain('#E891A4');
  // No MailerLite badge / hosted header asset.
  expect(html.toLowerCase()).not.toContain('powered by mailerlite');
  expect(html).not.toContain('storage.mlcdn.com');
});

test('register-first copy is present', async ({ page }) => {
  await page.goto('/register');
  await expect(page.locator('main')).toContainText('register', { ignoreCase: true });
  await expect(page.locator('main')).toContainText('before', { ignoreCase: true });
});
