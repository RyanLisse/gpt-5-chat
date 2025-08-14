if (process.env.PLAYWRIGHT === '1') {
  const { generateId } = require('ai');
  const { getUnixTime } = require('date-fns');
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  const { test, expect } = require('@playwright/test') as typeof import('@playwright/test');

  const testEmail = `test-${getUnixTime(new Date())}@playwright.com`;
  const testPassword = generateId();

  class AuthPage {
    /** @param {import('@playwright/test').Page} page */
    constructor(page) {
      this.page = page;
    }

    async gotoLogin() {
      await this.page.goto('/login');
      await expect(this.page.getByRole('heading')).toContainText('Sign In');
    }

    async gotoRegister() {
      await this.page.goto('/login');
      await expect(this.page.getByRole('heading')).toContainText('Sign Up');
    }

    async register(email, password) {
      await this.gotoRegister();
      await this.page.getByPlaceholder('user@acme.com').click();
      await this.page.getByPlaceholder('user@acme.com').fill(email);
      await this.page.getByLabel('Password').click();
      await this.page.getByLabel('Password').fill(password);
      await this.page.getByRole('button', { name: 'Sign Up' }).click();
    }

    async login(email, password) {
      await this.gotoLogin();
      await this.page.getByPlaceholder('user@acme.com').click();
      await this.page.getByPlaceholder('user@acme.com').fill(email);
      await this.page.getByLabel('Password').click();
      await this.page.getByLabel('Password').fill(password);
      await this.page.getByRole('button', { name: 'Sign In' }).click();
    }

    async expectToastToContain(text) {
      await expect(this.page.getByTestId('toast')).toContainText(text);
    }
  }

  test.describe
    .serial('authentication', () => {
      /** @type {AuthPage} */
      let authPage;

      test.beforeEach(async ({ page }) => {
        authPage = new AuthPage(page);
      });

      test('redirect to login page when unauthenticated', async ({ page }) => {
        await page.goto('/');
        await expect(page.getByRole('heading')).toContainText('Sign In');
      });

      test('register a test account', async ({ page }) => {
        await authPage.register(testEmail, testPassword);
        await expect(page).toHaveURL('/');
        await authPage.expectToastToContain('Account created successfully!');
      });

      test('register test account with existing email', async () => {
        await authPage.register(testEmail, testPassword);
        await authPage.expectToastToContain('Account already exists!');
      });

      test('log into account', async ({ page }) => {
        await authPage.login(testEmail, testPassword);

        await page.waitForURL('/');
        await expect(page).toHaveURL('/');
        await expect(page.getByPlaceholder('Send a message...')).toBeVisible();
      });

      test('can register new user', async ({ page }) => {
        const newEmail = `test-${generateId()}@test.com`;
        await authPage.gotoLogin();
        await authPage.register(newEmail, testPassword);
        await expect(page).toHaveURL('/');
        await authPage.expectToastToContain('Account created successfully!');
      });
    });
}
