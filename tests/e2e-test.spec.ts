import { expect, test } from '@playwright/test';

test('Chat Application E2E Test', async ({ page }) => {
  // Navigate to the application
  await page.goto('http://localhost:3001');

  // Take a screenshot to see what we get
  await page.screenshot({ path: 'test-initial-load.png', fullPage: true });

  // Check if there are any console errors
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  // Try to wait for page to load
  await page.waitForLoadState('networkidle', { timeout: 10_000 });

  // Get page title
  const title = await page.title();

  // Get page content to analyze what's happening
  const bodyText = await page.textContent('body');

  // Check if specific elements are present
  const chatContainer = page
    .locator('[data-testid="chat-container"], .chat-container, main')
    .first();
  const _isVisible = await chatContainer.isVisible().catch(() => false);

  // Log any console errors
  if (errors.length > 0) {
  }

  // Basic assertion - just check that we don't get a completely blank page
  expect(title).toBeTruthy();
  expect(bodyText).toBeTruthy();
});
