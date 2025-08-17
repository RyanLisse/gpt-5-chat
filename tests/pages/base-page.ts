import { expect, type Page } from '@playwright/test';

// TDD London School: Base page object with behavior verification patterns
export abstract class BasePage {
  constructor(protected readonly page: Page) {}

  // London School: Mock network responses for fast, predictable tests
  async mockApiResponse(url: string, response: any, status = 200) {
    await this.page.route(url, async (route) => {
      await route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify(response),
      });
    });
  }

  // Mock streaming responses for chat API
  async mockStreamingResponse(url: string, chunks: string[]) {
    await this.page.route(url, async (route) => {
      const response = chunks.join('\n\n');
      await route.fulfill({
        status: 200,
        contentType: 'text/plain',
        body: response,
      });
    });
  }

  // Mock rate limit headers for behavior verification
  async mockRateLimitHeaders(
    url: string,
    response: any,
    headers: Record<string, string>,
  ) {
    await this.page.route(url, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(response),
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
      });
    });
  }

  // London School: Behavior verification over state inspection
  async waitForNetworkResponse(urlPattern: string | RegExp, timeout = 10000) {
    return this.page.waitForResponse(
      (response) => {
        const url = response.url();
        return typeof urlPattern === 'string'
          ? url.includes(urlPattern)
          : urlPattern.test(url);
      },
      { timeout },
    );
  }

  // Fast element interaction with proper error handling
  async clickElementSafely(selector: string, timeout = 5000) {
    await this.page.waitForSelector(selector, { timeout });
    await this.page.click(selector);
  }

  async typeTextSafely(selector: string, text: string, timeout = 5000) {
    await this.page.waitForSelector(selector, { timeout });
    await this.page.fill(selector, text);
  }

  // Behavior verification helpers
  async verifyElementExists(selector: string, timeout = 5000) {
    await expect(this.page.locator(selector)).toBeVisible({ timeout });
  }

  async verifyElementNotExists(selector: string) {
    await expect(this.page.locator(selector)).not.toBeVisible();
  }

  async verifyTextContent(selector: string, expectedText: string | RegExp) {
    await expect(this.page.locator(selector)).toContainText(expectedText);
  }

  // Local storage behavior verification
  async verifyLocalStorageContains(key: string, expectedValue?: any) {
    const value = await this.page.evaluate((storageKey) => {
      return localStorage.getItem(storageKey);
    }, key);

    if (expectedValue !== undefined) {
      expect(value).toBeTruthy();
      if (value) {
        const parsedValue = JSON.parse(value);
        expect(parsedValue).toMatchObject(expectedValue);
      }
    } else {
      expect(value).toBeTruthy();
    }
  }

  async clearLocalStorage() {
    try {
      await this.page.evaluate(() => {
        localStorage.clear();
      });
    } catch (_error) {
      // If localStorage access is denied, ignore it - page hasn't loaded yet
      console.warn('localStorage access denied, will clear after navigation');
    }
  }

  // Network behavior verification
  async interceptAndVerifyRequest(
    urlPattern: string | RegExp,
    expectedPayload?: any,
  ) {
    let interceptedRequest: any = null;

    await this.page.route(urlPattern, async (route) => {
      interceptedRequest = {
        url: route.request().url(),
        method: route.request().method(),
        payload: route.request().postDataJSON(),
        headers: route.request().headers(),
      };
      await route.continue();
    });

    return {
      getRequest: () => interceptedRequest,
      verifyPayload: (_expected: any) => {
        expect(interceptedRequest).toBeTruthy();
        if (expectedPayload) {
          expect(interceptedRequest.payload).toMatchObject(expectedPayload);
        }
      },
    };
  }
}
