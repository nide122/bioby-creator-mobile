import { expect, test } from '@playwright/test';

import { enterDemoWorkspace, expectUnauthenticated, gotoProtected } from './helpers';

const STACK_ROUTES: { path: string; testId?: string; heading?: RegExp }[] = [
  { path: '/', testId: 'screen-today' },
  { path: '/inbox', testId: 'screen-inbox' },
  { path: '/deals', testId: 'screen-deals' },
  { path: '/inbox/thread-skincare', testId: 'screen-inbox-thread-detail' },
  { path: '/deal/mock-deal-beta', testId: 'screen-deal-detail' },
  { path: '/deal/mock-deal-beta/packet', heading: /packet/i },
  { path: '/deal/mock-deal-beta/delivery', heading: /delivery/i },
  { path: '/deal/mock-deal-beta/verification', heading: /verification/i },
  { path: '/payments', heading: /payments/i },
  { path: '/disputes', testId: 'screen-disputes' },
  { path: '/pricing', heading: /rate card|pricing/i },
  { path: '/pricing-edit', heading: /rate card|pricing|报价/i },
  { path: '/drafts', heading: /drafts/i },
  { path: '/drafts/draft-reply-01', heading: /draft|草稿/i },
  { path: '/proposal/sample', heading: /proposal/i },
  { path: '/settings/team', heading: /team/i },
  { path: '/settings/subscription', heading: /subscription/i },
  { path: '/battle-reports', testId: 'screen-battle-reports' },
  { path: '/media-kit', heading: /media kit/i },
  { path: '/trust-passport', heading: /fulfillment|履约/i },
];

test.describe('Protected routes (demo session)', () => {
  test.beforeEach(async ({ page }) => {
    await enterDemoWorkspace(page);
  });

  for (const route of STACK_ROUTES) {
    test(`loads ${route.path}`, async ({ page }) => {
      await gotoProtected(page, route.path);

      if (route.testId) {
        await expect(page.getByTestId(route.testId)).toBeVisible({ timeout: 30_000 });
      } else if (route.heading) {
        await expect(page.getByRole('heading', { name: route.heading })).toBeVisible({ timeout: 30_000 });
      }
    });
  }
});

test.describe('Auth redirects (no session)', () => {
  test('clears demo session on fresh context', async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    await expectUnauthenticated(page);
    await context.close();
  });
});

test.describe('Onboarded user routing', () => {
  test('authenticated onboarded user is not sent to onboarding from login', async ({ page }) => {
    await enterDemoWorkspace(page);
    await page.evaluate(() => {
      const raw = sessionStorage.getItem('bioby-session-dev-v1');
      if (!raw) return;
      const parsed = JSON.parse(raw) as { state: Record<string, unknown> };
      parsed.state.onboardingComplete = true;
      sessionStorage.setItem('bioby-session-dev-v1', JSON.stringify(parsed));
    });
    await page.goto('/login');
    await expect(page).toHaveURL(/\/inbox/, { timeout: 30_000 });
  });
});
