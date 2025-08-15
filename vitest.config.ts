import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const rootDir = dirname(fileURLToPath(new URL(import.meta.url)));

export default defineConfig({
  test: {
    // Exclude Playwright E2E tests and other frameworks from Vitest run
    exclude: [
      'node_modules/**',
      'dist/**',
      '.next/**',
      'tests/**', // Playwright tests live here
      'e2e/**',
      'lib/ai/text-splitter.test.ts',
    ],
  },
  resolve: {
    alias: {
      '@': resolve(rootDir, '.'),
    },
  },
});
