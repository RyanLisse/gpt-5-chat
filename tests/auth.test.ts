if (process.env.PLAYWRIGHT === '1') {
  const { generateId } = require('ai');
  const { getUnixTime } = require('date-fns');
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  const { test, expect } =
    require('@playwright/test') as typeof import('@playwright/test');

  // TDD London School: Proper interface contracts for page objects
  type AuthPageInterface = {
    page: import('@playwright/test').Page;
    gotoLogin(): Promise<void>;
    gotoRegister(): Promise<void>;
    register(email: string, password: string): Promise<void>;
    login(email: string, password: string): Promise<void>;
    expectToastToContain(text: string): Promise<void>;
  };

  const testEmail = `test-${getUnixTime(new Date())}@playwright.com`;
  const testPassword = generateId();

  class AuthPage implements AuthPageInterface {
    public readonly page: import('@playwright/test').Page;

    constructor(page: import('@playwright/test').Page) {
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

    async register(email: string, password: string): Promise<void> {
      await this.gotoRegister();
      await this.page.getByPlaceholder('user@acme.com').click();
      await this.page.getByPlaceholder('user@acme.com').fill(email);
      await this.page.getByLabel('Password').click();
      await this.page.getByLabel('Password').fill(password);
      await this.page.getByRole('button', { name: 'Sign Up' }).click();
    }

    async login(email: string, password: string): Promise<void> {
      await this.gotoLogin();
      await this.page.getByPlaceholder('user@acme.com').click();
      await this.page.getByPlaceholder('user@acme.com').fill(email);
      await this.page.getByLabel('Password').click();
      await this.page.getByLabel('Password').fill(password);
      await this.page.getByRole('button', { name: 'Sign In' }).click();
    }

    async expectToastToContain(text: string): Promise<void> {
      await expect(this.page.getByTestId('toast')).toContainText(text);
    }
  }

  test.describe
    .serial('authentication', () => {
      let authPage: AuthPage;

      test.beforeEach(
        async ({ page }: { page: import('@playwright/test').Page }) => {
          authPage = new AuthPage(page);
        },
      );

      test('redirect to login page when unauthenticated', async ({
        page,
      }: {
        page: import('@playwright/test').Page;
      }) => {
        await page.goto('/');
        await expect(page.getByRole('heading')).toContainText('Sign In');
      });

      test('register a test account', async ({
        page,
      }: {
        page: import('@playwright/test').Page;
      }) => {
        await authPage.register(testEmail, testPassword);
        await expect(page).toHaveURL('/');
        await authPage.expectToastToContain('Account created successfully!');
      });

      test('register test account with existing email', async () => {
        await authPage.register(testEmail, testPassword);
        await authPage.expectToastToContain('Account already exists!');
      });

      test('log into account', async ({
        page,
      }: {
        page: import('@playwright/test').Page;
      }) => {
        await authPage.login(testEmail, testPassword);

        await page.waitForURL('/');
        await expect(page).toHaveURL('/');
        await expect(page.getByPlaceholder('Send a message...')).toBeVisible();
      });

      test('can register new user', async ({
        page,
      }: {
        page: import('@playwright/test').Page;
      }) => {
        const newEmail = `test-${generateId()}@test.com`;
        await authPage.gotoLogin();
        await authPage.register(newEmail, testPassword);
        await expect(page).toHaveURL('/');
        await authPage.expectToastToContain('Account created successfully!');
      });
    });
}
