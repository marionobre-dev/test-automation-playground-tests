import { test as base } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { SecurePage } from '../pages/SecurePage';

type Pages = {
  loginPage: LoginPage;
  securePage: SecurePage;
};

/**
 * Extends Playwright's `test` so page objects are injected as fixtures:
 *   test('...', async ({ loginPage }) => { ... })
 */
export const test = base.extend<Pages>({
  loginPage: async ({ page }, use) => use(new LoginPage(page)),
  securePage: async ({ page }, use) => use(new SecurePage(page)),
});

export { expect } from '@playwright/test';
