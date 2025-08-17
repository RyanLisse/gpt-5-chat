import type { FullConfig } from '@playwright/test';

async function globalTeardown(_config: FullConfig) {
  console.log('🧹 Starting E2E test environment cleanup...');

  // TDD London School: Clean state for subsequent test runs
  try {
    // Clear any test data or temporary files
    // Note: In a real implementation, you might want to clean up test database records

    // Reset environment variables to avoid pollution
    delete process.env.NEXTAUTH_SECRET;
    delete process.env.OPENAI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.GOOGLE_AI_API_KEY;

    console.log('✅ E2E test environment cleanup complete');
  } catch (error) {
    console.error('❌ Error during test cleanup:', error);
  }
}

export default globalTeardown;
