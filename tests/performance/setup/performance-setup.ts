import { performance } from 'node:perf_hooks';
import { afterAll, beforeAll, beforeEach, vi } from 'vitest';

// Performance test utilities
type PerformanceGlobal = typeof globalThis & {
  __PERFORMANCE_MARKERS: Map<string, number>;
  __MEMORY_SNAPSHOTS: Array<{
    name: string;
    memory: NodeJS.MemoryUsage;
    timestamp: number;
  }>;
};

const perf_global = globalThis as PerformanceGlobal;
perf_global.__PERFORMANCE_MARKERS = new Map();
perf_global.__MEMORY_SNAPSHOTS = [];

// Performance measurement utilities
export const perf = {
  mark: (name: string) => {
    perf_global.__PERFORMANCE_MARKERS.set(name, performance.now());
    performance.mark(name);
  },

  measure: (name: string, startMark: string, endMark?: string) => {
    if (endMark) {
      performance.measure(name, startMark, endMark);
    } else {
      performance.measure(name, startMark);
    }

    const measure = performance.getEntriesByName(name, 'measure')[0];
    return measure?.duration || 0;
  },

  getDuration: (startMark: string, endMark?: string): number => {
    const start = perf_global.__PERFORMANCE_MARKERS.get(startMark);
    const end = endMark
      ? perf_global.__PERFORMANCE_MARKERS.get(endMark)
      : performance.now();

    if (!(start && end)) return 0;
    return end - start;
  },

  clear: () => {
    performance.clearMarks();
    performance.clearMeasures();
    perf_global.__PERFORMANCE_MARKERS.clear();
  },
};

// Memory monitoring utilities
export const memory = {
  snapshot: (name: string) => {
    const memUsage = process.memoryUsage();
    perf_global.__MEMORY_SNAPSHOTS.push({
      name,
      memory: memUsage,
      timestamp: Date.now(),
    });
    return memUsage;
  },

  getSnapshots: () => perf_global.__MEMORY_SNAPSHOTS,

  getDiff: (snapshot1: string, snapshot2: string) => {
    const s1 = perf_global.__MEMORY_SNAPSHOTS.find((s) => s.name === snapshot1);
    const s2 = perf_global.__MEMORY_SNAPSHOTS.find((s) => s.name === snapshot2);

    if (!(s1 && s2)) return null;

    return {
      rss: s2.memory.rss - s1.memory.rss,
      heapTotal: s2.memory.heapTotal - s1.memory.heapTotal,
      heapUsed: s2.memory.heapUsed - s1.memory.heapUsed,
      external: s2.memory.external - s1.memory.external,
      arrayBuffers: s2.memory.arrayBuffers - s1.memory.arrayBuffers,
      duration: s2.timestamp - s1.timestamp,
    };
  },

  clear: () => {
    perf_global.__MEMORY_SNAPSHOTS.length = 0;
  },
};

// Performance assertion utilities
export const expect_performance = {
  toBeFasterThan: (actualMs: number, expectedMs: number, name?: string) => {
    if (actualMs > expectedMs) {
      const namePrefix = name ? ` for ${name}` : '';
      const exceedAmount = actualMs - expectedMs;
      throw new Error(
        `Performance assertion failed${namePrefix}: ` +
          `Expected ${actualMs}ms to be faster than ${expectedMs}ms (exceeded by ${exceedAmount}ms)`,
      );
    }
  },

  toUseMemoryLessThan: (
    actualBytes: number,
    expectedBytes: number,
    name?: string,
  ) => {
    if (actualBytes > expectedBytes) {
      const namePrefix = name ? ` for ${name}` : '';
      const actualMB = (actualBytes / 1024 / 1024).toFixed(2);
      const expectedMB = (expectedBytes / 1024 / 1024).toFixed(2);
      const exceededMB = ((actualBytes - expectedBytes) / 1024 / 1024).toFixed(
        2,
      );
      throw new Error(
        `Memory assertion failed${namePrefix}: ` +
          `Expected ${actualMB}MB to be less than ${expectedMB}MB ` +
          `(exceeded by ${exceededMB}MB)`,
      );
    }
  },

  toConcurrentlyHandle: async (
    operations: Array<() => Promise<any>>,
    expectedMaxTime: number,
    name?: string,
  ) => {
    const start = performance.now();
    await Promise.all(operations.map((op) => op()));
    const duration = performance.now() - start;

    if (duration > expectedMaxTime) {
      const namePrefix = name ? ` for ${name}` : '';
      const durationFormatted = duration.toFixed(2);
      throw new Error(
        `Concurrency assertion failed${namePrefix}: ` +
          `Expected ${operations.length} operations to complete in ${expectedMaxTime}ms, ` +
          `but took ${durationFormatted}ms`,
      );
    }

    return duration;
  },
};

// Performance test environment setup
beforeAll(() => {
  // Set consistent environment for performance testing
  (process.env as any).NODE_ENV = 'test';
  process.env.DATABASE_URL =
    process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/test_db';

  // External services mocking is handled by individual test files as needed

  // Ensure garbage collection for consistent memory testing
  if (global.gc) {
    global.gc();
  }

  console.log('🏃‍♂️ Performance testing environment initialized');
});

afterAll(() => {
  // Clean up performance data
  perf.clear();
  memory.clear();

  // Final garbage collection
  if (global.gc) {
    global.gc();
  }

  console.log('✅ Performance testing cleanup completed');
});

// Auto-cleanup between tests
beforeEach(() => {
  perf.clear();
  memory.clear();
});

export { vi };
