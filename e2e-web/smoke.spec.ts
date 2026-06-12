import { expect, test } from '@playwright/test';

import { enterDemoWorkspace, expectUnauthenticated } from './helpers';

test.describe('BioBy Creator Web smoke', () => {
  test('dev skip opens main tabs', async ({ page }) => {
    await enterDemoWorkspace(page);
    await page.getByTestId('tab-deals').click();
    await page.getByTestId('tab-account').click();
    await page.getByTestId('tab-today').click();
  });

  test('route guard sends unauthenticated deep links to welcome', async ({ page }) => {
    await expectUnauthenticated(page);
  });

  test('register screen renders account form', async ({ page }) => {
    await page.goto('/register');
    const expandEmail = page.getByTestId('auth-register-expand-email');
    if (await expandEmail.isVisible()) {
      await expandEmail.click();
    }
    await expect(page.getByTestId('auth-register-email')).toBeVisible();
    await expect(page.getByTestId('auth-register-submit')).toBeDisabled();
    await page.getByTestId('auth-register-email').fill('e2e@bioby.ai');
    await page.getByTestId('auth-register-name').fill('E2E Creator');
    await expect(page.getByTestId('auth-register-submit')).toBeEnabled();
  });

  test('stack screens load with headers', async ({ page }) => {
    await enterDemoWorkspace(page);

    await page.goto('/payments');
    await expect(page.getByRole('heading', { name: /payments/i })).toBeVisible();

    await page.goto('/drafts');
    await expect(page.getByRole('heading', { name: /drafts/i })).toBeVisible();
  });
});
