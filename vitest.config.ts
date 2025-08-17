import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const rootDir = dirname(fileURLToPath(new URL(import.meta.url)));

export default defineConfig({
  test: {
    // TDD London School: Performance optimized test configuration
    exclude: [
      'node_modules/**',
      'dist/**',
      '.next/**',
      'tests/**/*.e2e.test.ts', // Exclude Playwright e2e tests specifically
      'tests/**/*.playwright.ts',
      'tests/**/playwright/**',
      'e2e/**',
      'lib/ai/text-splitter.test.ts',
      'tests/performance/**', // Exclude performance tests for faster CI
      'tests/**/*.perf.test.ts', // Exclude .perf.test.ts files specifically
      'tests/**/*.bench.test.ts', // Exclude .bench.test.ts files specifically
      'tests/**/*.load.test.ts', // Exclude .load.test.ts files specifically
    ],
    include: [
      'lib/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      'components/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      'app/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      'hooks/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      'providers/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      'trpc/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      'tests/**/!(*.e2e|*.perf|*.performance|*.bench|*.load).test.ts', // Include unit/integration tests from tests dir
    ],

    // Performance optimizations for fast execution
    globals: true,
    environment: 'node', // Faster than jsdom for unit tests
    pool: 'threads', // Use thread pool for parallelization
    poolOptions: {
      threads: {
        minThreads: 1,
        maxThreads: 4, // Optimize for CI/local development
      },
    },

    // TDD London: Mock-friendly configuration
    clearMocks: true, // Clear mocks between tests automatically
    restoreMocks: true, // Restore original implementations
    mockReset: true, // Reset mock state

    // Fast timeouts for lightweight mocked tests
    testTimeout: 5000, // 5 seconds max per test with proper mocking
    hookTimeout: 2000, // 2 seconds for setup/teardown

    // Test result reporting
    reporters:
      process.env.CI === 'true'
        ? [
            'default',
            ['junit', { outputFile: './test-results/junit.xml' }],
            ['json', { outputFile: './test-results/results.json' }],
            'github-actions',
          ]
        : ['default'],

    // Coverage configuration (strict in CI only)
    coverage: {
      enabled: process.env.CI === 'true',
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html', 'lcov'],
      reportsDirectory: './coverage',
      include: [
        'lib/**/*.ts',
        'components/**/*.tsx',
        'app/**/*.ts',
        'app/**/*.tsx',
        'trpc/**/*.ts',
        'hooks/**/*.ts',
        'providers/**/*.ts',
      ],
      exclude: [
        'node_modules/**',
        'tests/**',
        '**/*.test.ts',
        '**/*.test.tsx',
        '**/*.d.ts',
        'lib/db/migrations/**',
        'coverage/**',
        '.next/**',
      ],
      thresholds:
        process.env.CI === 'true'
          ? {
              statements: 100,
              branches: 100,
              functions: 100,
              lines: 100,
            }
          : undefined,
      all: process.env.CI === 'true',
    },

    // Setup files for London School mocks
    setupFiles: ['./tests/setup/vitest-setup.ts'],

    // Ensure proper types for globals
    typecheck: {
      include: ['**/*.{test,spec}.ts'],
    },
  },
  resolve: {
    alias: {
      '@': resolve(rootDir, '.'),
    },
  },
});
