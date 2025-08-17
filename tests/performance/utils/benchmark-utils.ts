import { performance } from 'node:perf_hooks';

export interface BenchmarkResult {
  name: string;
  iterations: number;
  totalTime: number;
  averageTime: number;
  minTime: number;
  maxTime: number;
  standardDeviation: number;
  operationsPerSecond: number;
  memoryUsage?: {
    before: NodeJS.MemoryUsage;
    after: NodeJS.MemoryUsage;
    delta: NodeJS.MemoryUsage;
  };
}

export interface BenchmarkOptions {
  iterations?: number;
  warmupIterations?: number;
  trackMemory?: boolean;
  timeout?: number;
  minSampleSize?: number;
}

export class Benchmark {
  private results: number[] = [];
  private memoryBefore?: NodeJS.MemoryUsage;
  private memoryAfter?: NodeJS.MemoryUsage;

  constructor(
    private name: string,
    private options: BenchmarkOptions = {},
  ) {
    this.options = {
      iterations: 100,
      warmupIterations: 10,
      trackMemory: false,
      timeout: 30000,
      minSampleSize: 10,
      ...options,
    };
  }

  async run(operation: () => Promise<any> | any): Promise<BenchmarkResult> {
    const {
      iterations = 100,
      warmupIterations = 10,
      trackMemory = false,
    } = this.options;

    // Warmup phase
    console.log(
      `🔥 Warming up ${this.name} (${warmupIterations} iterations)...`,
    );
    for (let i = 0; i < warmupIterations; i++) {
      await operation();
    }

    // Force garbage collection before main benchmark
    if (global.gc) {
      global.gc();
    }

    if (trackMemory) {
      this.memoryBefore = process.memoryUsage();
    }

    console.log(`📊 Benchmarking ${this.name} (${iterations} iterations)...`);

    // Main benchmark
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await operation();
      const end = performance.now();
      this.results.push(end - start);
    }

    if (trackMemory) {
      this.memoryAfter = process.memoryUsage();
    }

    return this.calculateResults();
  }

  async runUntilStable(
    operation: () => Promise<any> | any,
    stabilityThreshold = 0.05,
  ): Promise<BenchmarkResult> {
    const { timeout = 30000, minSampleSize = 10 } = this.options;
    const startTime = Date.now();

    console.log(
      `🎯 Running ${this.name} until stable (threshold: ${stabilityThreshold})...`,
    );

    // Initial samples
    for (let i = 0; i < minSampleSize; i++) {
      const start = performance.now();
      await operation();
      const end = performance.now();
      this.results.push(end - start);
    }

    let stable = false;
    let consecutiveStableRuns = 0;
    const requiredStableRuns = 5;

    while (!stable && Date.now() - startTime < timeout) {
      // Add more samples
      const batchSize = 10;
      for (let i = 0; i < batchSize; i++) {
        const start = performance.now();
        await operation();
        const end = performance.now();
        this.results.push(end - start);
      }

      // Check stability (coefficient of variation)
      const recentResults = this.results.slice(-50); // Last 50 samples
      const mean = recentResults.reduce((a, b) => a + b) / recentResults.length;
      const variance =
        recentResults.reduce((a, b) => a + Math.pow(b - mean, 2), 0) /
        recentResults.length;
      const standardDeviation = Math.sqrt(variance);
      const coefficientOfVariation = standardDeviation / mean;

      if (coefficientOfVariation <= stabilityThreshold) {
        consecutiveStableRuns++;
        if (consecutiveStableRuns >= requiredStableRuns) {
          stable = true;
        }
      } else {
        consecutiveStableRuns = 0;
      }
    }

    if (!stable) {
      console.warn(`⚠️  ${this.name} did not reach stability within timeout`);
    } else {
      console.log(
        `✅ ${this.name} reached stability after ${this.results.length} iterations`,
      );
    }

    return this.calculateResults();
  }

  private calculateResults(): BenchmarkResult {
    const totalTime = this.results.reduce((a, b) => a + b, 0);
    const averageTime = totalTime / this.results.length;
    const minTime = Math.min(...this.results);
    const maxTime = Math.max(...this.results);

    // Calculate standard deviation
    const variance =
      this.results.reduce((a, b) => a + Math.pow(b - averageTime, 2), 0) /
      this.results.length;
    const standardDeviation = Math.sqrt(variance);

    const operationsPerSecond = 1000 / averageTime;

    let memoryUsage: BenchmarkResult['memoryUsage'];
    if (this.memoryBefore && this.memoryAfter) {
      memoryUsage = {
        before: this.memoryBefore,
        after: this.memoryAfter,
        delta: {
          rss: this.memoryAfter.rss - this.memoryBefore.rss,
          heapTotal: this.memoryAfter.heapTotal - this.memoryBefore.heapTotal,
          heapUsed: this.memoryAfter.heapUsed - this.memoryBefore.heapUsed,
          external: this.memoryAfter.external - this.memoryBefore.external,
          arrayBuffers:
            this.memoryAfter.arrayBuffers - this.memoryBefore.arrayBuffers,
        },
      };
    }

    return {
      name: this.name,
      iterations: this.results.length,
      totalTime,
      averageTime,
      minTime,
      maxTime,
      standardDeviation,
      operationsPerSecond,
      memoryUsage,
    };
  }
}

export async function benchmark(
  name: string,
  operation: () => Promise<any> | any,
  options?: BenchmarkOptions,
): Promise<BenchmarkResult> {
  const bench = new Benchmark(name, options);
  return bench.run(operation);
}

export async function benchmarkUntilStable(
  name: string,
  operation: () => Promise<any> | any,
  stabilityThreshold = 0.05,
  options?: BenchmarkOptions,
): Promise<BenchmarkResult> {
  const bench = new Benchmark(name, options);
  return bench.runUntilStable(operation, stabilityThreshold);
}

export function formatBenchmarkResult(result: BenchmarkResult): string {
  const lines = [
    `📊 ${result.name}`,
    `   Iterations: ${result.iterations}`,
    `   Average: ${result.averageTime.toFixed(2)}ms`,
    `   Min/Max: ${result.minTime.toFixed(2)}ms / ${result.maxTime.toFixed(2)}ms`,
    `   Std Dev: ${result.standardDeviation.toFixed(2)}ms`,
    `   Ops/sec: ${result.operationsPerSecond.toFixed(0)}`,
  ];

  if (result.memoryUsage) {
    const { delta } = result.memoryUsage;
    lines.push(
      `   Memory Delta:`,
      `     RSS: ${(delta.rss / 1024 / 1024).toFixed(2)}MB`,
      `     Heap Used: ${(delta.heapUsed / 1024 / 1024).toFixed(2)}MB`,
      `     Heap Total: ${(delta.heapTotal / 1024 / 1024).toFixed(2)}MB`,
    );
  }

  return lines.join('\n');
}

export class BenchmarkSuite {
  private benchmarks: Array<{
    name: string;
    operation: () => Promise<any> | any;
    options?: BenchmarkOptions;
  }> = [];

  add(
    name: string,
    operation: () => Promise<any> | any,
    options?: BenchmarkOptions,
  ) {
    this.benchmarks.push({ name, operation, options });
    return this;
  }

  async run(): Promise<BenchmarkResult[]> {
    const results: BenchmarkResult[] = [];

    console.log(
      `🏁 Running benchmark suite with ${this.benchmarks.length} benchmarks...`,
    );

    for (const { name, operation, options } of this.benchmarks) {
      const result = await benchmark(name, operation, options);
      results.push(result);
      console.log(formatBenchmarkResult(result));
    }

    return results;
  }

  async runComparison(): Promise<{
    results: BenchmarkResult[];
    comparison: Array<{ name: string; relativeTo: string; factor: number }>;
  }> {
    const results = await this.run();
    const comparison: Array<{
      name: string;
      relativeTo: string;
      factor: number;
    }> = [];

    if (results.length > 1) {
      const baseline = results[0];
      for (let i = 1; i < results.length; i++) {
        const current = results[i];
        const factor = current.averageTime / baseline.averageTime;
        comparison.push({
          name: current.name,
          relativeTo: baseline.name,
          factor,
        });
      }

      console.log('\n🔍 Performance Comparison:');
      for (const comp of comparison) {
        const percentage = ((comp.factor - 1) * 100).toFixed(1);
        const symbol = comp.factor > 1 ? '🐌' : '🚀';
        console.log(
          `   ${symbol} ${comp.name} is ${Math.abs(parseFloat(percentage))}% ${comp.factor > 1 ? 'slower' : 'faster'} than ${comp.relativeTo}`,
        );
      }
    }

    return { results, comparison };
  }
}
