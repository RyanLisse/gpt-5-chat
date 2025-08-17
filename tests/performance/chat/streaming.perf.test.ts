import { performance } from 'node:perf_hooks';
import { beforeAll, describe, expect, it } from 'vitest';
import { expect_performance, memory } from '../setup/performance-setup';
import { BenchmarkSuite, benchmark } from '../utils/benchmark-utils';
import type { RequestResult } from '../utils/load-test-utils';
import { LoadTester, loadTest } from '../utils/load-test-utils';

// Mock streaming response for chat functionality
class MockStreamingResponse {
  private readonly chunks: string[];

  constructor(content: string, chunkSize = 20) {
    this.chunks = [];
    for (let i = 0; i < content.length; i += chunkSize) {
      this.chunks.push(content.slice(i, i + chunkSize));
    }
  }

  async *stream(): AsyncIterableIterator<string> {
    for (const chunk of this.chunks) {
      // Simulate realistic streaming delay
      await new Promise((resolve) =>
        setTimeout(resolve, Math.random() * 50 + 10),
      ); // 10-60ms per chunk
      yield chunk;
    }
  }

  get totalChunks(): number {
    return this.chunks.length;
  }
}

// Mock AI streaming service
class MockAIStreamingService {
  async generateStream(_prompt: string): Promise<MockStreamingResponse> {
    // Simulate AI processing delay
    await new Promise((resolve) =>
      setTimeout(resolve, Math.random() * 200 + 100),
    ); // 100-300ms

    const responses = [
      "I understand you're asking about performance testing. Let me explain the key concepts and best practices for implementing comprehensive performance tests in modern web applications.",
      'Performance testing is crucial for ensuring your application can handle real-world usage patterns. There are several types of performance tests you should consider implementing.',
      "Here's a detailed breakdown of the different performance testing approaches: load testing, stress testing, spike testing, volume testing, and endurance testing.",
      'When implementing chat functionality performance tests, you need to consider message throughput, concurrent users, streaming response times, and memory usage patterns.',
    ];

    const response = responses[Math.floor(Math.random() * responses.length)];
    return new MockStreamingResponse(response);
  }
}

describe('Chat Streaming Performance Tests', () => {
  let aiService: MockAIStreamingService;

  beforeAll(() => {
    aiService = new MockAIStreamingService();
    console.log('💬 Starting chat streaming performance tests...');
  });

  describe('Single Stream Performance', () => {
    it('should stream responses within acceptable latency', async () => {
      const result = await benchmark(
        'Single Chat Stream',
        async () => {
          const startTime = performance.now();
          const stream = await aiService.generateStream(
            'Test prompt for performance',
          );

          let firstChunkTime = 0;
          let lastChunkTime = 0;
          let chunkCount = 0;
          let totalContent = '';

          for await (const chunk of stream.stream()) {
            const currentTime = performance.now();

            if (chunkCount === 0) {
              firstChunkTime = currentTime - startTime; // Time to first chunk
            }

            lastChunkTime = currentTime - startTime; // Time to last chunk
            chunkCount++;
            totalContent += chunk;
          }

          return {
            firstChunkTime,
            lastChunkTime,
            chunkCount,
            contentLength: totalContent.length,
          };
        },
        {
          iterations: 30,
          trackMemory: true,
          timeout: 30000,
        },
      );

      // Validate streaming performance
      const avgResult = result.averageTime;
      expect_performance.toBeFasterThan(
        avgResult,
        3000,
        'Complete stream time',
      ); // 3 seconds max

      console.log(
        `📊 Streaming metrics: ${result.averageTime.toFixed(2)}ms average`,
      );
    });

    it('should handle stream interruption gracefully', async () => {
      const result = await benchmark(
        'Stream Interruption Handling',
        async () => {
          const stream = await aiService.generateStream(
            'Test prompt for interruption',
          );

          let chunkCount = 0;
          let interrupted = false;

          try {
            for await (const _chunk of stream.stream()) {
              chunkCount++;

              // Simulate interruption after a few chunks
              if (chunkCount >= 3 && Math.random() < 0.3) {
                interrupted = true;
                break;
              }
            }
          } catch (_error) {
            // Handle stream errors
          }

          return { chunkCount, interrupted };
        },
        {
          iterations: 20,
          trackMemory: true,
          timeout: 20000,
        },
      );

      expect(result.averageTime).toBeLessThan(3000); // Should handle interruption quickly
    });

    it('should maintain consistent chunk timing', async () => {
      const chunkTimings: number[] = [];

      const stream = await aiService.generateStream(
        'Performance test for chunk timing',
      );
      let previousTime = performance.now();

      for await (const _chunk of stream.stream()) {
        const currentTime = performance.now();
        const chunkLatency = currentTime - previousTime;
        chunkTimings.push(chunkLatency);
        previousTime = currentTime;
      }

      // Analyze timing consistency
      const avgTiming =
        chunkTimings.reduce((a, b) => a + b, 0) / chunkTimings.length;
      const maxTiming = Math.max(...chunkTimings);
      const minTiming = Math.min(...chunkTimings);

      console.log(`📊 Chunk timing analysis:`);
      console.log(`   Average: ${avgTiming.toFixed(2)}ms`);
      console.log(`   Min: ${minTiming.toFixed(2)}ms`);
      console.log(`   Max: ${maxTiming.toFixed(2)}ms`);
      console.log(
        `   Variance: ${(((maxTiming - minTiming) / avgTiming) * 100).toFixed(1)}%`,
      );

      // Timing should be reasonably consistent
      expect(maxTiming).toBeLessThan(avgTiming * 5); // No chunk should take 5x average
      expect(avgTiming).toBeLessThan(150); // Average chunk time under 150ms
    });
  });

  describe('Concurrent Streaming Performance', () => {
    it('should handle multiple concurrent streams efficiently', async () => {
      const concurrencyLevels = [1, 5, 10, 20];
      const tester = new LoadTester();

      const results = await tester.runConcurrencyTest(
        async (): Promise<RequestResult> => {
          const start = performance.now();

          try {
            const stream = await aiService.generateStream(
              'Concurrent test prompt',
            );

            let _chunkCount = 0;
            let totalContent = '';

            for await (const chunk of stream.stream()) {
              _chunkCount++;
              totalContent += chunk;
            }

            const responseTime = performance.now() - start;

            return {
              success: true,
              responseTime,
              size: totalContent.length,
            };
          } catch (error) {
            return {
              success: false,
              responseTime: performance.now() - start,
              error: error instanceof Error ? error.message : 'Unknown error',
            };
          }
        },
        concurrencyLevels,
        20, // 20 streams per concurrency level
      );

      // Validate concurrent performance
      for (let i = 1; i < results.length; i++) {
        const current = results[i];
        const previous = results[i - 1];

        // Response time degradation should be reasonable
        const degradation =
          current.result.averageResponseTime /
          previous.result.averageResponseTime;
        expect(degradation).toBeLessThan(4.0); // Less than 4x slower

        // Error rate should stay low
        expect(current.result.errorRate).toBeLessThan(5.0);

        console.log(
          `📊 Concurrency ${current.concurrency}: ${current.result.averageResponseTime.toFixed(2)}ms avg, ${current.result.errorRate.toFixed(1)}% error rate`,
        );
      }
    });

    it('should maintain memory efficiency with many concurrent streams', async () => {
      memory.snapshot('concurrent-streams-start');

      // Start many concurrent streams
      const streamPromises = Array.from({ length: 25 }, async (_, index) => {
        const stream = await aiService.generateStream(
          `Concurrent stream ${index}`,
        );
        const chunks: string[] = [];

        for await (const chunk of stream.stream()) {
          chunks.push(chunk);
        }

        return chunks.join('');
      });

      memory.snapshot('concurrent-streams-peak');

      // Wait for all streams to complete
      const results = await Promise.allSettled(streamPromises);
      const successful = results.filter((r) => r.status === 'fulfilled').length;

      memory.snapshot('concurrent-streams-end');

      console.log(
        `📊 Concurrent streams completed: ${successful}/${results.length}`,
      );

      const memoryDiff = memory.getDiff(
        'concurrent-streams-start',
        'concurrent-streams-peak',
      );
      if (memoryDiff) {
        expect_performance.toUseMemoryLessThan(
          memoryDiff.heapUsed,
          200 * 1024 * 1024,
          'Concurrent streaming memory',
        ); // 200MB
        console.log(
          `📊 Peak memory usage: ${(memoryDiff.heapUsed / 1024 / 1024).toFixed(2)}MB`,
        );
      }

      expect(successful).toBeGreaterThan(20); // At least 80% success rate
    });
  });

  describe('Sustained Streaming Load Tests', () => {
    it('should handle sustained streaming load', async () => {
      const result = await loadTest(
        'Sustained Chat Streaming',
        async (): Promise<RequestResult> => {
          const start = performance.now();

          try {
            const prompts = [
              'Explain machine learning concepts',
              'Describe web performance optimization',
              'What are design patterns in software?',
              'How does database indexing work?',
              'Explain API rate limiting strategies',
            ];

            const randomPrompt =
              prompts[Math.floor(Math.random() * prompts.length)];
            const stream = await aiService.generateStream(randomPrompt);

            let _chunkCount = 0;
            let contentLength = 0;

            for await (const chunk of stream.stream()) {
              _chunkCount++;
              contentLength += chunk.length;
            }

            return {
              success: true,
              responseTime: performance.now() - start,
              size: contentLength,
            };
          } catch (error) {
            return {
              success: false,
              responseTime: performance.now() - start,
              error: error instanceof Error ? error.message : 'Unknown error',
            };
          }
        },
        {
          duration: 30000, // 30 seconds
          requestsPerSecond: 5, // 5 concurrent chats
          maxConcurrent: 10,
          rampUpTime: 5000, // 5 second ramp-up
        },
      );

      // Validate sustained performance
      expect(result.errorRate).toBeLessThan(10.0); // < 10% error rate
      expect(result.averageResponseTime).toBeLessThan(6000); // < 6 seconds average
      expect(result.p95ResponseTime).toBeLessThan(10000); // < 10 seconds 95th percentile
      expect(result.requestsPerSecond).toBeGreaterThan(1); // At least 1 RPS

      console.log(`📊 Sustained load results:`);
      console.log(`   Requests: ${result.totalRequests}`);
      console.log(
        `   Success rate: ${((result.successfulRequests / result.totalRequests) * 100).toFixed(1)}%`,
      );
      console.log(
        `   Average response time: ${result.averageResponseTime.toFixed(2)}ms`,
      );
      console.log(`   95th percentile: ${result.p95ResponseTime.toFixed(2)}ms`);
    });

    it('should handle chat burst scenarios', async () => {
      memory.snapshot('burst-start');

      // Simulate chat burst (many users starting chats simultaneously)
      const burstSize = 30;
      const burstPromises: Promise<any>[] = [];

      console.log(
        `💥 Simulating chat burst with ${burstSize} simultaneous streams...`,
      );

      const burstStart = performance.now();

      for (let i = 0; i < burstSize; i++) {
        const promise = (async () => {
          const stream = await aiService.generateStream(
            `Burst test message ${i}`,
          );
          const chunks: string[] = [];

          for await (const chunk of stream.stream()) {
            chunks.push(chunk);
          }

          return {
            index: i,
            contentLength: chunks.join('').length,
            chunkCount: chunks.length,
          };
        })();

        burstPromises.push(promise);
      }

      const burstResults = await Promise.allSettled(burstPromises);
      const burstDuration = performance.now() - burstStart;

      memory.snapshot('burst-end');

      const successful = burstResults.filter(
        (r) => r.status === 'fulfilled',
      ).length;
      const successRate = (successful / burstSize) * 100;

      console.log(`📊 Burst test results:`);
      console.log(`   Duration: ${burstDuration.toFixed(2)}ms`);
      console.log(`   Success rate: ${successRate.toFixed(1)}%`);
      console.log(`   Successful streams: ${successful}/${burstSize}`);

      expect(successRate).toBeGreaterThan(60); // At least 60% success
      expect(burstDuration).toBeLessThan(25000); // Complete within 25 seconds

      const memoryDiff = memory.getDiff('burst-start', 'burst-end');
      if (memoryDiff) {
        expect_performance.toUseMemoryLessThan(
          memoryDiff.heapUsed,
          300 * 1024 * 1024,
          'Burst test memory',
        ); // 300MB
      }
    });
  });

  // Helper functions for stream performance tests
  const processRapidStream = async (
    aiService: MockAIStreamingService,
    i: number,
  ): Promise<number> => {
    const stream = await aiService.generateStream(`Rapid stream ${i}`);
    const chunks: string[] = [];

    for await (const chunk of stream.stream()) {
      chunks.push(chunk);
    }

    return chunks.length;
  };

  const runRapidStreamsTest = async (
    aiService: MockAIStreamingService,
  ): Promise<number> => {
    const promises = Array.from({ length: 10 }, (_, i) =>
      processRapidStream(aiService, i),
    );
    const results = await Promise.all(promises);
    return results.reduce((a, b) => a + b, 0);
  };

  const processStreamSize = async (size: number): Promise<number> => {
    const content = 'X'.repeat(size);
    const stream = new MockStreamingResponse(content, 20);

    let processedLength = 0;
    for await (const chunk of stream.stream()) {
      processedLength += chunk.length;
    }

    return processedLength;
  };

  describe('Stream Performance Edge Cases', () => {
    it('should handle very long streams efficiently', async () => {
      const longContent = 'A'.repeat(10000); // 10KB response
      const longStream = new MockStreamingResponse(longContent, 50); // 50 char chunks

      memory.snapshot('long-stream-start');

      const result = await benchmark(
        'Long Stream Processing',
        async () => {
          let totalLength = 0;
          let chunkCount = 0;

          for await (const chunk of longStream.stream()) {
            totalLength += chunk.length;
            chunkCount++;
          }

          return { totalLength, chunkCount };
        },
        {
          iterations: 8,
          trackMemory: true,
          timeout: 30000,
        },
      );

      memory.snapshot('long-stream-end');

      expect(result.averageTime).toBeLessThan(15000); // 15 seconds max for long streams

      const memoryDiff = memory.getDiff('long-stream-start', 'long-stream-end');
      if (memoryDiff) {
        expect_performance.toUseMemoryLessThan(
          memoryDiff.heapUsed,
          100 * 1024 * 1024,
          'Long stream memory',
        ); // 100MB
      }
    });

    it('should handle rapid successive streams', async () => {
      const result = await benchmark(
        'Rapid Successive Streams',
        () => runRapidStreamsTest(aiService),
        {
          iterations: 15,
          trackMemory: true,
          timeout: 25000,
        },
      );

      expect(result.averageTime).toBeLessThan(20000); // 20 seconds for 10 rapid streams
      expect(result.operationsPerSecond).toBeGreaterThan(0.5); // At least 0.5 batch ops per second
    });

    it('should maintain performance with mixed stream sizes', async () => {
      const streamSizes = [100, 500, 1000, 5000, 10000]; // Different content lengths

      const suite = new BenchmarkSuite();

      for (const size of streamSizes) {
        suite.add(`Stream ${size} chars`, () => processStreamSize(size), {
          iterations: 20,
        });
      }

      const { results, comparison } = await suite.runComparison();

      // Validate that performance scales reasonably with content size
      for (let i = 1; i < results.length; i++) {
        const current = results[i];
        const previous = results[i - 1];

        // Time should not increase linearly with content size (streaming benefit)
        const timeRatio = current.averageTime / previous.averageTime;
        const sizeRatio = streamSizes[i] / streamSizes[i - 1];

        expect(timeRatio).toBeLessThan(sizeRatio); // Streaming should be more efficient than linear
      }

      console.log('📊 Stream size performance comparison:');
      comparison.forEach((comp) => {
        console.log(
          `   ${comp.name}: ${comp.factor.toFixed(2)}x relative to baseline`,
        );
      });
    });
  });
});
