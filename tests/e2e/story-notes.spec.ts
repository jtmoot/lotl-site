import { test, expect } from '@playwright/test';

// Story-page notes + hearts. E2E runs against `wrangler dev` (real Worker,
// fresh local D1 per run) with Cloudflare's dummy always-pass Turnstile key.
const STORY = '/stories/welcome-to-stories';

test('the notes section reveals once the API responds', async ({ page }) => {
  await page.goto(STORY);
  await expect(page.locator('[data-notes-root]')).toBeVisible();
  await expect(page.getByRole('heading', { name: /notes/i })).toBeVisible();
  await expect(page.locator('[data-comments-empty]')).toBeVisible();
});

test('the heart likes once per browser and remembers it', async ({ page }) => {
  await page.goto(STORY);
  const btn = page.locator('[data-like-btn]');
  const count = page.locator('[data-like-count]');
  await expect(btn).toBeVisible();
  const before = Number(await count.textContent());
  await btn.click();
  await expect(count).toHaveText(String(before + 1));
  await expect(btn).toBeDisabled();
  // Reload: still marked liked, count persisted.
  await page.reload();
  await expect(page.locator('[data-like-count]')).toHaveText(String(before + 1));
  await expect(page.locator('[data-like-btn]')).toBeDisabled();
});

test('posting a note publishes it immediately and it survives a reload', async ({ page }) => {
  await page.goto(STORY);
  const form = page.locator('[data-comment-form]');
  await expect(form).toBeVisible();
  // Wait for the (auto-passing) Turnstile widget to produce a token.
  await page.waitForFunction(() => {
    const w = window as unknown as { turnstile?: { getResponse: () => string | undefined } };
    try { return Boolean(w.turnstile?.getResponse()); } catch { return false; }
  }, { timeout: 15_000 });

  await form.getByLabel(/name/i).fill('Playwright Pat');
  await form.getByLabel(/your note/i).fill('What a lovely story. See you Monday!');
  await form.getByRole('button', { name: /post/i }).click();

  await expect(page.locator('[data-form-status]')).toHaveText(/your note is live/i);
  const list = page.locator('[data-comments-list] > li');
  await expect(list.last()).toContainText('Playwright Pat');
  await expect(list.last()).toContainText('See you Monday!');

  // The note came from the database, not just the DOM.
  await page.reload();
  await expect(page.locator('[data-comments-list] > li').last()).toContainText('Playwright Pat');
});

test('the honeypot field is invisible to humans', async ({ page }) => {
  await page.goto(STORY);
  await expect(page.locator('[data-notes-root]')).toBeVisible();
  const hp = page.locator('input[name="website"]');
  await expect(hp).toHaveCount(1);
  await expect(hp).not.toBeInViewport();
});
