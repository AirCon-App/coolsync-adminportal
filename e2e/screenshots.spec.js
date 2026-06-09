import { test } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import 'dotenv/config';

const SCREENSHOT_DIR = './screenshots';
const TEST_CREDENTIALS = {
  email: process.env.TEST_USER_EMAIL,
  password: process.env.TEST_USER_PASSWORD,
};

test.describe('Screenshot Capture for Stakeholder Documentation', () => {
  test.beforeAll(async () => {
    if (!fs.existsSync(SCREENSHOT_DIR)) {
      fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    }
  });

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  const screenshot = async (page, name, options = {}) => {
    const filepath = path.join(SCREENSHOT_DIR, `${name}.png`);
    await page.screenshot({ path: filepath, fullPage: options.fullPage ?? false });
    console.log(`Captured: ${name}.png`);
  };

  test('01 - Login Page', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await screenshot(page, '01-login-page');
  });

  test('02 - Login Page (with validation error)', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('login-button').click();
    await page.waitForTimeout(500);
    await screenshot(page, '02-login-validation-error');
  });

  test.describe('Authenticated Pages', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/');
      await page.getByTestId('email-input').fill(TEST_CREDENTIALS.email);
      await page.getByTestId('password-input').fill(TEST_CREDENTIALS.password);
      await page.getByTestId('login-button').click();
      await page.waitForURL('**/home');
      await page.waitForLoadState('networkidle');
    });

    test('03 - Dashboard/Home', async ({ page }) => {
      await screenshot(page, '03-dashboard-home');
    });

    test('04 - Building Switcher', async ({ page }) => {
      const switcher = page.locator('[data-testid="building-switcher"], .building-switcher, button:has-text("Building")').first();
      if (await switcher.isVisible()) {
        await switcher.click();
        await page.waitForTimeout(300);
        await screenshot(page, '04-building-switcher-open');
      }
    });

    test('05 - Inventory Page', async ({ page }) => {
      await page.goto('/inventory');
      await page.waitForLoadState('networkidle');
      await screenshot(page, '05-inventory-list');
    });

    test('06 - Inventory Add Modal', async ({ page }) => {
      await page.goto('/inventory');
      await page.waitForLoadState('networkidle');
      const addBtn = page.getByRole('button', { name: /add|new|create/i }).first();
      if (await addBtn.isVisible()) {
        await addBtn.click();
        await page.waitForTimeout(300);
        await screenshot(page, '06-inventory-add-modal');
        await page.keyboard.press('Escape');
      }
    });

    test('07 - Air Handlers Page', async ({ page }) => {
      await page.goto('/airhandlers');
      await page.waitForLoadState('networkidle');
      await screenshot(page, '07-airhandlers-list');
    });

    test('08 - Air Handler Add Modal', async ({ page }) => {
      await page.goto('/airhandlers');
      await page.waitForLoadState('networkidle');
      const addBtn = page.getByRole('button', { name: /add|new|create/i }).first();
      if (await addBtn.isVisible()) {
        await addBtn.click();
        await page.waitForTimeout(300);
        await screenshot(page, '08-airhandler-add-modal');
        await page.keyboard.press('Escape');
      }
    });

    test('09 - Air Handler Detail', async ({ page }) => {
      await page.goto('/airhandlers');
      await page.waitForLoadState('networkidle');
      const firstHandler = page.locator('a[href*="/airhandlers/"], [data-testid*="handler"], .handler-card').first();
      if (await firstHandler.isVisible()) {
        await firstHandler.click();
        await page.waitForLoadState('networkidle');
        await screenshot(page, '09-airhandler-detail');
      }
    });

    test('10 - Areas Page', async ({ page }) => {
      await page.goto('/areas');
      await page.waitForLoadState('networkidle');
      await screenshot(page, '10-areas-list');
    });

    test('11 - Areas Add Modal', async ({ page }) => {
      await page.goto('/areas');
      await page.waitForLoadState('networkidle');
      const addBtn = page.getByRole('button', { name: /add|new|create/i }).first();
      if (await addBtn.isVisible()) {
        await addBtn.click();
        await page.waitForTimeout(300);
        await screenshot(page, '11-area-add-modal');
        await page.keyboard.press('Escape');
      }
    });

    test('12 - Users Page', async ({ page }) => {
      await page.goto('/users');
      await page.waitForLoadState('networkidle');
      await screenshot(page, '12-users-list');
    });

    test('13 - Users Add Modal', async ({ page }) => {
      await page.goto('/users');
      await page.waitForLoadState('networkidle');
      const addBtn = page.getByRole('button', { name: /add|new|create|invite/i }).first();
      if (await addBtn.isVisible()) {
        await addBtn.click();
        await page.waitForTimeout(300);
        await screenshot(page, '13-user-add-modal');
        await page.keyboard.press('Escape');
      }
    });

    test('14 - Reports Page', async ({ page }) => {
      await page.goto('/reports');
      await page.waitForLoadState('networkidle');
      await screenshot(page, '14-reports-page');
    });

    test('15 - Email Report Modal', async ({ page }) => {
      await page.goto('/reports');
      await page.waitForLoadState('networkidle');
      const emailBtn = page.getByRole('button', { name: /email|send|schedule/i }).first();
      if (await emailBtn.isVisible()) {
        await emailBtn.click();
        await page.waitForTimeout(300);
        await screenshot(page, '15-email-report-modal');
        await page.keyboard.press('Escape');
      }
    });

    test('16 - Settings Page', async ({ page }) => {
      await page.goto('/settings');
      await page.waitForLoadState('networkidle');
      await screenshot(page, '16-settings-page');
    });

    test('17 - User Profile Page', async ({ page }) => {
      await page.goto('/usermanagement');
      await page.waitForLoadState('networkidle');
      await screenshot(page, '17-user-profile');
    });

    test('18 - Buildings Page (SuperAdmin)', async ({ page }) => {
      await page.goto('/buildings');
      await page.waitForLoadState('networkidle');
      if (page.url().includes('/buildings')) {
        await screenshot(page, '18-buildings-list');
      }
    });

    test('19 - Dark Theme', async ({ page }) => {
      const themeToggle = page.locator('[data-testid="theme-toggle"], .theme-toggle, button:has-text("Dark"), button:has-text("Theme")').first();
      if (await themeToggle.isVisible()) {
        await themeToggle.click();
        await page.waitForTimeout(300);
        await screenshot(page, '19-dark-theme-dashboard');
      }
    });
  });
});
