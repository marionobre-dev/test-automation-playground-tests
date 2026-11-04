import { test, expect } from '../../fixtures';
import { credentials } from '../../fixtures/test-data';

test.describe('Login', () => {
  test.beforeEach(async ({ loginPage }) => {
    await loginPage.goto();
  });

  test('logs in with valid credentials', async ({ page, loginPage, securePage }) => {
    await loginPage.loginAsPracticeUser();

    await expect(page).toHaveURL(/secure\.html/);
    await expect(securePage.flash).toHaveText('You logged into a secure area!');
    await expect(securePage.welcomeUser).toHaveText(credentials.username);
  });

  const invalidCases = [
    { name: 'unknown username', user: 'nobody', pass: credentials.password, error: 'Your username is invalid!' },
    { name: 'wrong password', user: credentials.username, pass: 'wrong', error: 'Your password is invalid! 2 attempt(s) left.' },
    { name: 'empty fields', user: '', pass: '', error: 'Username and password are required.' },
  ];

  for (const c of invalidCases) {
    test(`shows an error for ${c.name}`, async ({ page, loginPage }) => {
      await loginPage.login(c.user, c.pass);

      await expect(loginPage.flash).toHaveText(c.error);
      await expect(page).toHaveURL(/login\.html/);
    });
  }

  test('locks the account after three wrong passwords, then recovers', async ({ page, loginPage }) => {
    // Fake the clock so we can skip the 30 s lockout instead of waiting for it.
    await page.clock.install();
    await loginPage.goto();

    for (const message of ['2 attempt(s) left.', '1 attempt(s) left.', 'Account locked for 30 seconds.']) {
      await loginPage.login(credentials.username, 'wrong');
      await expect(loginPage.flash).toContainText(message);
    }

    await loginPage.login(credentials.username, credentials.password);
    await expect(loginPage.flash).toContainText('Account locked. Try again in');

    await page.clock.fastForward('00:31');
    await loginPage.submit.click();
    await expect(page).toHaveURL(/secure\.html/);
  });

  test('remembers the username when "Remember me" is ticked', async ({ loginPage }) => {
    await loginPage.loginAsPracticeUser({ remember: true });

    await loginPage.goto();
    await expect(loginPage.username).toHaveValue(credentials.username);
    await expect(loginPage.remember).toBeChecked();
  });
});

test.describe('Secure area', () => {
  test('redirects to login when not authenticated', async ({ page, securePage, loginPage }) => {
    await securePage.goto();

    await expect(page).toHaveURL(/login\.html\?reason=auth/);
    await expect(loginPage.flash).toHaveText('You must log in to view the secure area.');
  });

  test('logs out and blocks access again', async ({ page, loginPage, securePage }) => {
    await loginPage.goto();
    await loginPage.loginAsPracticeUser();

    await securePage.logout();
    await expect(loginPage.flash).toHaveText('You logged out of the secure area.');

    await securePage.goto();
    await expect(page).toHaveURL(/reason=auth/);
  });
});
