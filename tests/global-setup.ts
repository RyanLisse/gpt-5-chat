import { chromium, type FullConfig } from '@playwright/test';

async function globalSetup(_config: FullConfig) {
  console.log('🚀 Starting E2E test environment setup...');

  // TDD London School: Setup mock environment for consistent behavior
  (process.env as any).NODE_ENV = 'test';
  process.env.NEXTAUTH_SECRET = 'test-secret-key';
  process.env.NEXTAUTH_URL = 'http://localhost:3000';

  // Mock external service URLs for isolation
  process.env.OPENAI_API_KEY = 'test-key-mock';
  process.env.ANTHROPIC_API_KEY = 'test-key-mock';
  process.env.GOOGLE_AI_API_KEY = 'test-key-mock';

  // Database setup for testing
  process.env.DATABASE_URL =
    process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/test_db';

  // Disable external analytics for test isolation
  process.env.VERCEL_ANALYTICS_ID = '';
  process.env.VERCEL_SPEED_INSIGHTS_ID = '';

  // Setup browser for pre-warming (TDD London: fast execution)
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Pre-warm the application to reduce test timeouts
    console.log('🔧 Pre-warming application...');
    await page.goto('http://localhost:3000', {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    console.log('✅ Application pre-warmed successfully');
  } catch (error) {
    console.warn('⚠️ Application pre-warming failed:', error);
  } finally {
    await context.close();
    await browser.close();
  }

  console.log('✅ E2E test environment setup complete');
}

export default globalSetup;
