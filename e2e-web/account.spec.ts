import { expect, test } from '@playwright/test';

import { enterDemoWorkspace } from './helpers';

test.describe('Account', () => {
  test('sign out returns to home and blocks inbox', async ({ page }) => {
    await enterDemoWorkspace(page);
    await page.getByTestId('tab-account').click();
    await page.getByTestId('account-sign-out').scrollIntoViewIfNeeded();
    await page.getByTestId('account-sign-out').click();

    await expect(page.getByTestId('welcome-dev-skip')).toBeVisible({ timeout: 30_000 });
    await expect(page).toHaveURL(/\/home/);

    await page.goto('/inbox');
    await expect(page).toHaveURL(/\/home/, { timeout: 30_000 });
  });
});
