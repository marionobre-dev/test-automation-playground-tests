import type { Locator, Page } from '@playwright/test';

/** Page object for secure.html. */
export class SecurePage {
  readonly flash: Locator;
  readonly welcomeUser: Locator;
  readonly logoutButton: Locator;

  constructor(private readonly page: Page) {
    this.flash = page.getByTestId('flash');
    this.welcomeUser = page.getByTestId('welcome-user');
    this.logoutButton = page.getByTestId('logout');
  }

  async goto() {
    await this.page.goto('/secure.html');
  }

  async logout() {
    await this.logoutButton.click();
  }
}
