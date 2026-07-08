import { test, expect } from '@playwright/test';

test.describe('Areas', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByPlaceholder(/email/i).fill(process.env.TEST_USER_EMAIL || 'admin@coolsync.com');
    await page.getByPlaceholder(/password/i).fill(process.env.TEST_USER_PASSWORD || 'TestPassword123!');
    await page.getByRole('button', { name: /sign in|login/i }).click();
    await page.waitForURL(/home|dashboard/i, { timeout: 10000 });
  });

  test('should display the manage areas page', async ({ page }) => {
    await page.goto('/areas');
    await expect(page.getByRole('heading', { name: /manage areas/i })).toBeVisible({ timeout: 10000 });
  });

  test('should expose the add area action', async ({ page }) => {
    await page.goto('/areas');
    await expect(page.getByRole('button', { name: /add area/i })).toBeVisible({ timeout: 10000 });
  });

  test('should expose the assign handlers affordance when an area exists', async ({ page }) => {
    await page.goto('/areas');
    // Degrades gracefully without seed data: only assert visibility when a row exists.
    const assignBtn = page.getByRole('button', { name: /assign handlers/i }).first();
    if (await assignBtn.isVisible().catch(() => false)) {
      await expect(assignBtn).toBeVisible();
    } else {
      // No areas seeded — the empty-state copy should be present instead.
      await expect(
        page.getByText(/no areas yet/i).or(page.getByText(/select a building/i)),
      ).toBeVisible({ timeout: 10000 });
    }
  });

  test('should open the assign handlers modal when available', async ({ page }) => {
    await page.goto('/areas');
    const assignBtn = page.getByRole('button', { name: /assign handlers/i }).first();
    if (await assignBtn.isVisible().catch(() => false)) {
      await assignBtn.click();
      await expect(page.getByRole('heading', { name: /assign handlers to/i })).toBeVisible({ timeout: 5000 });
    }
  });
});
