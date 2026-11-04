import { test as base } from '@playwright/test';
import { DynamicPage } from '../pages/DynamicPage';
import { FormsPage } from '../pages/FormsPage';
import { InteractionsPage } from '../pages/InteractionsPage';
import { LoginPage } from '../pages/LoginPage';
import { SecurePage } from '../pages/SecurePage';
import { ShopPage } from '../pages/ShopPage';
import { TablesPage } from '../pages/TablesPage';

type Pages = {
  dynamicPage: DynamicPage;
  formsPage: FormsPage;
  interactionsPage: InteractionsPage;
  loginPage: LoginPage;
  securePage: SecurePage;
  shopPage: ShopPage;
  tablesPage: TablesPage;
};

/**
 * Extends Playwright's `test` so page objects are injected as fixtures:
 *   test('...', async ({ loginPage }) => { ... })
 */
export const test = base.extend<Pages>({
  dynamicPage: async ({ page }, use) => use(new DynamicPage(page)),
  formsPage: async ({ page }, use) => use(new FormsPage(page)),
  interactionsPage: async ({ page }, use) => use(new InteractionsPage(page)),
  loginPage: async ({ page }, use) => use(new LoginPage(page)),
  securePage: async ({ page }, use) => use(new SecurePage(page)),
  shopPage: async ({ page }, use) => use(new ShopPage(page)),
  tablesPage: async ({ page }, use) => use(new TablesPage(page)),
});

export { expect } from '@playwright/test';
