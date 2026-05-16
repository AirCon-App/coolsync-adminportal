import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should display login page', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /login/i })).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('email-input').fill('invalid@test.com');
    await page.getByTestId('password-input').fill('wrongpassword');
    await page.getByTestId('login-button').click();
    await expect(page.getByTestId('login-error')).toBeVisible();
  });

  test('should redirect to home after successful login', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('email-input').fill(process.env.TEST_USER_EMAIL || 'admin@coolsync.com');
    await page.getByTestId('password-input').fill(process.env.TEST_USER_PASSWORD || 'TestPassword123!');
    await page.getByTestId('login-button').click();
    await expect(page).toHaveURL(/home|dashboard/i, { timeout: 10000 });
  });
});
