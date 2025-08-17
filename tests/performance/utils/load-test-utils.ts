import { performance } from 'node:perf_hooks';

export interface LoadTestOptions {
  duration?: number; // in milliseconds
  requestsPerSecond?: number;
  maxConcurrent?: number;
  rampUpTime?: number; // in milliseconds
  warmupRequests?: number;
}

export interface LoadTestResult {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  requestsPerSecond: number;
  errorRate: number;
  errors: Array<{ error: string; count: number }>;
  duration: number;
  memoryUsage: {
    peak: NodeJS.MemoryUsage;
    final: NodeJS.MemoryUsage;
  };
}

export interface RequestResult {
  success: boolean;
  responseTime: number;
  error?: string;
  statusCode?: number;
  size?: number;
}

export class LoadTester {
  private results: RequestResult[] = [];
  private errors: Map<string, number> = new Map();
  private peakMemory: NodeJS.MemoryUsage;
  private finalMemory!: NodeJS.MemoryUsage;
  private activeRequests = 0;
  private maxConcurrentReached = 0;

  constructor() {
    this.peakMemory = process.memoryUsage();
  }

  async runLoadTest(
    operation: () => Promise<RequestResult>,
    options: LoadTestOptions = {},
  ): Promise<LoadTestResult> {
    const {
      duration = 10000, // 10 seconds
      requestsPerSecond = 10,
      maxConcurrent = 50,
      rampUpTime = 2000, // 2 seconds
      warmupRequests = 5,
    } = options;

    console.log(`🚀 Starting load test:`);
    console.log(`   Duration: ${duration}ms`);
    console.log(`   Target RPS: ${requestsPerSecond}`);
    console.log(`   Max Concurrent: ${maxConcurrent}`);
    console.log(`   Ramp-up Time: ${rampUpTime}ms`);

    // Warmup phase
    if (warmupRequests > 0) {
      console.log(`🔥 Warming up with ${warmupRequests} requests...`);
      for (let i = 0; i < warmupRequests; i++) {
        await operation();
      }
    }

    // Reset for actual test
    this.results = [];
    this.errors.clear();
    this.activeRequests = 0;
    this.maxConcurrentReached = 0;
    this.peakMemory = process.memoryUsage();

    const startTime = performance.now();
    const endTime = startTime + duration;
    const intervalMs = 1000 / requestsPerSecond; // Time between requests

    const promises: Promise<void>[] = [];
    let requestCount = 0;

    // Memory monitoring
    const memoryMonitor = setInterval(() => {
      const current = process.memoryUsage();
      if (current.heapUsed > this.peakMemory.heapUsed) {
        this.peakMemory = current;
      }
    }, 100);

    // Ramp-up phase
    if (rampUpTime > 0) {
      await this.rampUp(
        operation,
        rampUpTime,
        requestsPerSecond,
        maxConcurrent,
      );
    }

    // Main load test phase
    while (performance.now() < endTime) {
      const currentTime = performance.now();

      // Respect concurrent limit
      if (this.activeRequests >= maxConcurrent) {
        await new Promise((resolve) => setTimeout(resolve, 10));
        continue;
      }

      // Calculate delay to maintain target RPS
      const expectedTime = startTime + requestCount * intervalMs;
      const delay = Math.max(0, expectedTime - currentTime);

      if (delay > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      // Execute request
      const promise = this.executeRequest(operation, requestCount++);
      promises.push(promise);
    }

    // Wait for all requests to complete
    console.log(
      `⏳ Waiting for ${this.activeRequests} active requests to complete...`,
    );
    await Promise.allSettled(promises);

    clearInterval(memoryMonitor);
    this.finalMemory = process.memoryUsage();

    const actualDuration = performance.now() - startTime;
    return this.calculateResults(actualDuration);
  }

  private async rampUp(
    operation: () => Promise<RequestResult>,
    rampUpTime: number,
    targetRPS: number,
    maxConcurrent: number,
  ): Promise<void> {
    console.log(`📈 Ramping up over ${rampUpTime}ms...`);

    const startTime = performance.now();
    const endTime = startTime + rampUpTime;
    let requestCount = 0;

    while (performance.now() < endTime) {
      const elapsed = performance.now() - startTime;
      const progress = elapsed / rampUpTime; // 0 to 1
      const currentRPS = targetRPS * progress;

      if (currentRPS < 1) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        continue;
      }

      const intervalMs = 1000 / currentRPS;
      const expectedTime = startTime + requestCount * intervalMs;
      const delay = Math.max(0, expectedTime - performance.now());

      if (delay > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      if (this.activeRequests < maxConcurrent) {
        this.executeRequest(operation, requestCount++);
      }
    }
  }

  private async executeRequest(
    operation: () => Promise<RequestResult>,
    _requestId: number,
  ): Promise<void> {
    this.activeRequests++;
    this.maxConcurrentReached = Math.max(
      this.maxConcurrentReached,
      this.activeRequests,
    );

    try {
      const result = await operation();
      this.results.push(result);

      if (!result.success && result.error) {
        const errorKey = result.error;
        this.errors.set(errorKey, (this.errors.get(errorKey) || 0) + 1);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.results.push({
        success: false,
        responseTime: 0,
        error: errorMessage,
      });
      this.errors.set(errorMessage, (this.errors.get(errorMessage) || 0) + 1);
    } finally {
      this.activeRequests--;
    }
  }

  private calculateResults(duration: number): LoadTestResult {
    const totalRequests = this.results.length;
    const successfulRequests = this.results.filter((r) => r.success).length;
    const failedRequests = totalRequests - successfulRequests;

    const responseTimes = this.results
      .filter((r) => r.success)
      .map((r) => r.responseTime)
      .sort((a, b) => a - b);

    const averageResponseTime =
      responseTimes.length > 0
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
        : 0;

    const minResponseTime = responseTimes.length > 0 ? responseTimes[0] : 0;
    const maxResponseTime =
      responseTimes.length > 0 ? responseTimes[responseTimes.length - 1] : 0;

    // Calculate percentiles
    const p95Index = Math.floor(responseTimes.length * 0.95);
    const p99Index = Math.floor(responseTimes.length * 0.99);
    const p95ResponseTime =
      responseTimes.length > 0 ? responseTimes[p95Index] || 0 : 0;
    const p99ResponseTime =
      responseTimes.length > 0 ? responseTimes[p99Index] || 0 : 0;

    const requestsPerSecond = (totalRequests / duration) * 1000;
    const errorRate =
      totalRequests > 0 ? (failedRequests / totalRequests) * 100 : 0;

    const errors = Array.from(this.errors.entries()).map(([error, count]) => ({
      error,
      count,
    }));

    return {
      totalRequests,
      successfulRequests,
      failedRequests,
      averageResponseTime,
      minResponseTime,
      maxResponseTime,
      p95ResponseTime,
      p99ResponseTime,
      requestsPerSecond,
      errorRate,
      errors,
      duration,
      memoryUsage: {
        peak: this.peakMemory,
        final: this.finalMemory,
      },
    };
  }

  async runConcurrencyTest(
    operation: () => Promise<RequestResult>,
    concurrencyLevels: number[],
    requestsPerLevel = 50,
  ): Promise<Array<{ concurrency: number; result: LoadTestResult }>> {
    const results: Array<{ concurrency: number; result: LoadTestResult }> = [];

    for (const concurrency of concurrencyLevels) {
      console.log(`🔄 Testing concurrency level: ${concurrency}`);

      // Reset state
      this.results = [];
      this.errors.clear();
      this.activeRequests = 0;
      this.peakMemory = process.memoryUsage();

      const startTime = performance.now();
      const promises: Promise<void>[] = [];

      // Launch concurrent requests
      for (let i = 0; i < requestsPerLevel; i++) {
        const batchPromises: Promise<void>[] = [];

        for (let j = 0; j < concurrency; j++) {
          batchPromises.push(
            this.executeRequest(operation, i * concurrency + j),
          );
        }

        promises.push(...batchPromises);

        // Small delay between batches to avoid overwhelming
        if (i < requestsPerLevel - 1) {
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
      }

      await Promise.allSettled(promises);

      const duration = performance.now() - startTime;
      this.finalMemory = process.memoryUsage();

      const result = this.calculateResults(duration);
      results.push({ concurrency, result });

      console.log(
        `   Completed: ${result.successfulRequests}/${result.totalRequests} requests`,
      );
      console.log(
        `   Avg Response Time: ${result.averageResponseTime.toFixed(2)}ms`,
      );
      console.log(`   Error Rate: ${result.errorRate.toFixed(2)}%`);
    }

    return results;
  }
}

export function formatLoadTestResult(result: LoadTestResult): string {
  const lines = [
    `📊 Load Test Results:`,
    `   Total Requests: ${result.totalRequests}`,
    `   Successful: ${result.successfulRequests} (${((result.successfulRequests / result.totalRequests) * 100).toFixed(1)}%)`,
    `   Failed: ${result.failedRequests} (${result.errorRate.toFixed(1)}%)`,
    `   Requests/sec: ${result.requestsPerSecond.toFixed(2)}`,
    `   Response Times:`,
    `     Average: ${result.averageResponseTime.toFixed(2)}ms`,
    `     Min: ${result.minResponseTime.toFixed(2)}ms`,
    `     Max: ${result.maxResponseTime.toFixed(2)}ms`,
    `     95th percentile: ${result.p95ResponseTime.toFixed(2)}ms`,
    `     99th percentile: ${result.p99ResponseTime.toFixed(2)}ms`,
    `   Memory Usage:`,
    `     Peak Heap: ${(result.memoryUsage.peak.heapUsed / 1024 / 1024).toFixed(2)}MB`,
    `     Final Heap: ${(result.memoryUsage.final.heapUsed / 1024 / 1024).toFixed(2)}MB`,
  ];

  if (result.errors.length > 0) {
    lines.push(`   Errors:`);
    result.errors.forEach(({ error, count }) => {
      lines.push(`     ${error}: ${count} times`);
    });
  }

  return lines.join('\n');
}

export async function loadTest(
  name: string,
  operation: () => Promise<RequestResult>,
  options?: LoadTestOptions,
): Promise<LoadTestResult> {
  console.log(`🎯 Load Testing: ${name}`);
  const tester = new LoadTester();
  const result = await tester.runLoadTest(operation, options);
  console.log(formatLoadTestResult(result));
  return result;
}
