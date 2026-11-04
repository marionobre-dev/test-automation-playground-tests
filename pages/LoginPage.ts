import { expect, type Locator, type Page } from '@playwright/test';
import { credentials } from '../fixtures/test-data';

/** Page object for login.html. Tests talk to this instead of raw selectors. */
export class LoginPage {
  readonly username: Locator;
  readonly password: Locator;
  readonly remember: Locator;
  readonly submit: Locator;
  readonly flash: Locator;

  constructor(private readonly page: Page) {
    this.username = page.getByTestId('username');
    this.password = page.getByTestId('password');
    this.remember = page.getByTestId('remember');
    this.submit = page.getByTestId('login-button');
    this.flash = page.getByTestId('flash');
  }

  async goto() {
    await this.page.goto('/login.html');
  }

  async login(username: string, password: string, { remember = false } = {}) {
    await this.username.fill(username);
    await this.password.fill(password);
    if (remember) await this.remember.check();
    await this.submit.click();
  }

  /** Logs in with the practice account and waits for the secure area. */
  async loginAsPracticeUser(options?: { remember?: boolean }) {
    await this.login(credentials.username, credentials.password, options);
    await expect(this.page).toHaveURL(/secure\.html/);
  }
}
