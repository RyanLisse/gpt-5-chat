import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const rootDir = dirname(
  dirname(dirname(fileURLToPath(new URL(import.meta.url)))),
);

export default defineConfig({
  test: {
    // Performance test specific configuration
    testTimeout: 60_000, // 60s for performance tests
    hookTimeout: 10_000, // 10s for setup/teardown
    globals: true,
    environment: 'node',

    // Performance test patterns
    include: [
      'tests/performance/**/*.perf.test.ts',
      'tests/performance/**/*.bench.test.ts',
      'tests/performance/**/*.load.test.ts',
    ],

    // Exclude regular tests
    exclude: [
      'node_modules/**',
      'dist/**',
      '.next/**',
      'tests/**/*.test.ts', // Regular unit tests
      'tests/**/*.e2e.test.ts', // E2E tests
      'lib/**/*.test.ts', // Library unit tests
    ],

    // Performance optimizations
    pool: 'threads',
    poolOptions: {
      threads: {
        minThreads: 1,
        maxThreads: 2, // Limit threads for consistent performance measurement
      },
    },

    // Disable coverage for performance tests
    coverage: {
      enabled: false,
    },

    // Setup files for performance testing
    setupFiles: ['./tests/performance/setup/performance-setup.ts'],

    // Reporter configuration for performance results
    reporters: ['default', 'json'],
    outputFile: {
      json: './tests/performance/results/performance-results.json',
    },
  },

  resolve: {
    alias: {
      '@': resolve(rootDir, '.'),
    },
  },
});
