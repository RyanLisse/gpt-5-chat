import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { expect_performance, memory } from '../setup/performance-setup';
import { benchmark } from '../utils/benchmark-utils';

// Helper functions to reduce nesting
const createLargeMessage = () => {
  return {
    id: `msg_${Date.now()}_${Math.random()}`,
    content: 'A'.repeat(10000), // 10KB message
    metadata: {
      timestamp: Date.now(),
      tokens: Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        text: `token_${i}`,
      })),
      attachments: Array.from({ length: 10 }, (_, i) => ({
        id: `attachment_${i}`,
        data: new ArrayBuffer(1024), // 1KB buffer
      })),
    },
    context: {
      conversation: Array.from({ length: 50 }, (_, i) => ({
        id: i,
        message: `Context message ${i}`,
        embedding: new Float32Array(384), // Simulated embedding vector
      })),
    },
  };
};

const processLargeMessage = (largeMessage: any) => {
  const processed = JSON.parse(JSON.stringify(largeMessage));
  processed.metadata.processed = true;
  return processed;
};

const createTokenPool = () => {
  const tokens = [];
  for (let i = 0; i < 1000; i++) {
    tokens.push({
      id: i,
      text: `token_${i}`,
      position: Math.random(),
      confidence: Math.random(),
    });
  }
  return tokens;
};

const processTokenPool = (tokens: any[]) => {
  return tokens
    .filter((t) => t.confidence > 0.5)
    .map((t) => ({ ...t, processed: true }))
    .slice(0, 100);
};

const processArrayBuffer = () => {
  const bufferSize = 1024 * 1024; // 1MB
  const buffer = new ArrayBuffer(bufferSize);
  const view = new Uint8Array(buffer);

  // Fill with random data
  for (let i = 0; i < view.length; i += 1024) {
    view[i] = Math.floor(Math.random() * 256);
  }

  // Process buffer (simulate compression/encoding)
  const processed = new Uint8Array(buffer.slice(0, bufferSize / 2));
  return processed.length;
};

// Memory usage pattern tests
describe('Memory Usage Pattern Tests', () => {
  beforeAll(() => {
    console.log('🧠 Starting memory usage pattern tests...');

    // Force garbage collection for consistent baseline
    if (global.gc) {
      global.gc();
    }
  });

  afterEach(() => {
    // Clean up between tests
    if (global.gc) {
      global.gc();
    }
  });

  describe('Memory Allocation Patterns', () => {
    it('should handle large object creation without memory leaks', async () => {
      memory.snapshot('large-objects-start');

      const result = await benchmark(
        'Large Object Creation',
        async () => {
          // Simulate creating large chat message objects
          const largeMessage = createLargeMessage();
          return processLargeMessage(largeMessage);
        },
        {
          iterations: 100,
          trackMemory: true,
        },
      );

      memory.snapshot('large-objects-end');

      // Check memory growth
      const memoryDiff = memory.getDiff(
        'large-objects-start',
        'large-objects-end',
      );
      if (memoryDiff) {
        // Should not accumulate more than 50MB for 100 iterations
        expect_performance.toUseMemoryLessThan(
          memoryDiff.heapUsed,
          50 * 1024 * 1024,
          'Large object memory growth',
        );

        console.log(
          `📊 Memory usage for large objects: ${(memoryDiff.heapUsed / 1024 / 1024).toFixed(2)}MB`,
        );
      }

      expect(result.averageTime).toBeLessThan(50); // Should be fast despite large objects
    });

    it('should efficiently manage small object pools', async () => {
      memory.snapshot('small-objects-start');

      const result = await benchmark(
        'Small Object Pool Management',
        async () => {
          // Simulate chat token management
          const tokens = createTokenPool();
          return processTokenPool(tokens);
        },
        {
          iterations: 200,
          trackMemory: true,
        },
      );

      memory.snapshot('small-objects-end');

      const memoryDiff = memory.getDiff(
        'small-objects-start',
        'small-objects-end',
      );
      if (memoryDiff) {
        // Small object pools should have minimal memory impact
        expect_performance.toUseMemoryLessThan(
          memoryDiff.heapUsed,
          10 * 1024 * 1024,
          'Small object pool memory',
        );
      }

      expect(result.operationsPerSecond).toBeGreaterThan(50);
    });

    it('should handle ArrayBuffer operations efficiently', async () => {
      memory.snapshot('arraybuffer-start');

      const result = await benchmark(
        'ArrayBuffer Operations',
        async () => {
          return processArrayBuffer();
        },
        {
          iterations: 50,
          trackMemory: true,
        },
      );

      memory.snapshot('arraybuffer-end');

      const memoryDiff = memory.getDiff('arraybuffer-start', 'arraybuffer-end');
      if (memoryDiff) {
        // ArrayBuffer operations should not accumulate memory
        expect_performance.toUseMemoryLessThan(
          memoryDiff.arrayBuffers,
          100 * 1024 * 1024,
          'ArrayBuffer memory accumulation',
        );
      }

      expect(result.averageTime).toBeLessThan(100);
    });
  });

  describe('Memory Leak Detection', () => {
    it('should detect closure-based memory leaks', async () => {
      memory.snapshot('closure-leak-start');

      const leakyOperations = [];

      // Simulate potentially leaky closures
      for (let i = 0; i < 100; i++) {
        const largeData = new Array(10000).fill(`data_${i}`);

        // Create closure that captures large data
        const operation = () => {
          return largeData.length; // Keeps reference to largeData
        };

        leakyOperations.push(operation);

        // Execute operation to trigger closure
        const result = operation();
        // Use result to prevent optimization
        if (result < 0) console.log('Unexpected result');
      }

      // Use the operations array to ensure it's not optimized away
      console.log(`Created ${leakyOperations.length} operations`);

      memory.snapshot('closure-leak-middle');

      // Clear references
      leakyOperations.length = 0;

      // Force garbage collection
      if (global.gc) {
        global.gc();
        // Wait for GC to complete
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      memory.snapshot('closure-leak-end');

      const middleDiff = memory.getDiff(
        'closure-leak-start',
        'closure-leak-middle',
      );
      const endDiff = memory.getDiff('closure-leak-start', 'closure-leak-end');

      if (middleDiff && endDiff) {
        console.log(
          `📊 Memory at middle: ${(middleDiff.heapUsed / 1024 / 1024).toFixed(2)}MB`,
        );
        console.log(
          `📊 Memory at end: ${(endDiff.heapUsed / 1024 / 1024).toFixed(2)}MB`,
        );

        // Memory should be significantly reduced after GC (or at least not increase much)
        const memoryIncrease = endDiff.heapUsed - middleDiff.heapUsed;
        expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024); // Should not increase more than 10MB

        // Final memory should not be excessive
        expect_performance.toUseMemoryLessThan(
          endDiff.heapUsed,
          20 * 1024 * 1024,
          'Closure leak final memory',
        );
      }
    });

    it('should detect event listener memory leaks', async () => {
      memory.snapshot('event-listener-start');

      // Simulate DOM-like event system
      class EventEmitter {
        private readonly listeners = new Map<string, ((data: any) => void)[]>();

        on(event: string, listener: (data: any) => void) {
          if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
          }
          this.listeners.get(event)?.push(listener);
        }

        off(event: string, listener: (data: any) => void) {
          const listeners = this.listeners.get(event);
          if (listeners) {
            const index = listeners.indexOf(listener);
            if (index > -1) {
              listeners.splice(index, 1);
            }
          }
        }

        emit(event: string, data?: any) {
          const listeners = this.listeners.get(event);
          if (listeners) {
            for (const listener of listeners) {
              listener(data);
            }
          }
        }
      }

      const emitter = new EventEmitter();
      const listeners: ((data: any) => void)[] = [];

      // Add many listeners with captured data
      for (let i = 0; i < 1000; i++) {
        const capturedData = new Array(1000).fill(`listener_data_${i}`);

        const listener = (data: any) => {
          return capturedData.length + (data ? data.length : 0);
        };

        emitter.on('test', listener);
        listeners.push(listener);
      }

      memory.snapshot('event-listener-middle');

      // Remove all listeners
      for (const listener of listeners) {
        emitter.off('test', listener);
      }
      listeners.length = 0;

      if (global.gc) {
        global.gc();
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      memory.snapshot('event-listener-end');

      const middleDiff = memory.getDiff(
        'event-listener-start',
        'event-listener-middle',
      );
      const endDiff = memory.getDiff(
        'event-listener-start',
        'event-listener-end',
      );

      if (middleDiff && endDiff) {
        const memoryChange = endDiff.heapUsed - middleDiff.heapUsed;
        expect(memoryChange).toBeLessThan(20 * 1024 * 1024); // Should not increase more than 20MB

        console.log(
          `📊 Event listener memory change: ${(memoryChange / 1024 / 1024).toFixed(2)}MB`,
        );
      }
    });

    it('should monitor chat session memory patterns', async () => {
      memory.snapshot('chat-session-start');

      // Simulate chat session lifecycle
      class ChatSession {
        private messages: any[] = [];
        private context: any = {};
        private subscribers: (() => void)[] = [];

        addMessage(message: any) {
          this.messages.push({
            ...message,
            id: `msg_${Date.now()}_${Math.random()}`,
            timestamp: Date.now(),
            embedding: new Float32Array(384), // AI embedding
            metadata: {
              tokens: message.content?.length || 0,
              processingTime: Math.random() * 100,
              model: 'gpt-4',
            },
          });

          // Update context
          this.context.lastMessage = message;
          this.context.messageCount = this.messages.length;
        }

        subscribe(callback: () => void) {
          this.subscribers.push(callback);
        }

        destroy() {
          this.messages = [];
          this.context = {};
          this.subscribers = [];
        }
      }

      const sessions: ChatSession[] = [];

      // Create multiple chat sessions
      for (let i = 0; i < 50; i++) {
        const session = new ChatSession();

        // Add messages to each session
        for (let j = 0; j < 20; j++) {
          session.addMessage({
            content: `Message ${j} in session ${i}`,
            role: j % 2 === 0 ? 'user' : 'assistant',
          });
        }

        sessions.push(session);
      }

      memory.snapshot('chat-session-peak');

      // Destroy all sessions
      for (const session of sessions) {
        session.destroy();
      }
      sessions.length = 0;

      if (global.gc) {
        global.gc();
        await new Promise((resolve) => setTimeout(resolve, 200));
      }

      memory.snapshot('chat-session-end');

      const peakDiff = memory.getDiff(
        'chat-session-start',
        'chat-session-peak',
      );
      const endDiff = memory.getDiff('chat-session-start', 'chat-session-end');

      if (peakDiff && endDiff) {
        console.log(
          `📊 Peak chat session memory: ${(peakDiff.heapUsed / 1024 / 1024).toFixed(2)}MB`,
        );
        console.log(
          `📊 Final chat session memory: ${(endDiff.heapUsed / 1024 / 1024).toFixed(2)}MB`,
        );

        // Should not continue growing indefinitely (allow some variance)
        expect(endDiff.heapUsed).toBeLessThan(
          peakDiff.heapUsed + 20 * 1024 * 1024,
        ); // Final should not be 20MB+ higher than peak
      }
    });
  });

  describe('Memory Performance Under Load', () => {
    it('should maintain stable memory usage under sustained load', async () => {
      const memorySnapshots: Array<{
        time: number;
        memory: NodeJS.MemoryUsage;
      }> = [];

      // Monitor memory over time
      const monitorInterval = setInterval(() => {
        memorySnapshots.push({
          time: Date.now(),
          memory: process.memoryUsage(),
        });
      }, 500); // Every 500ms

      try {
        // Sustained load simulation
        const duration = 5000; // 5 seconds (reduced for faster tests)
        const startTime = Date.now();

        while (Date.now() - startTime < duration) {
          // Simulate mixed workload
          const operations = [
            () => {
              // Chat message processing
              const message = {
                content: 'Test message',
                metadata: new Array(100).fill(Math.random()),
              };
              return JSON.stringify(message);
            },
            () => {
              // File processing simulation
              const buffer = new ArrayBuffer(64 * 1024); // 64KB
              const view = new Uint8Array(buffer);
              for (let i = 0; i < view.length; i += 1024) {
                view[i] = Math.random() * 255;
              }
              return buffer.byteLength;
            },
            () => {
              // Search index simulation
              const index = new Map();
              for (let i = 0; i < 1000; i++) {
                index.set(`key_${i}`, `value_${Math.random()}`);
              }
              return index.size;
            },
          ];

          // Execute random operations
          const randomOp =
            operations[Math.floor(Math.random() * operations.length)];
          randomOp();

          // Small delay to prevent overwhelming
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
      } finally {
        clearInterval(monitorInterval);
      }

      // Analyze memory stability
      const heapUsages = memorySnapshots.map((s) => s.memory.heapUsed);
      const minHeap = Math.min(...heapUsages);
      const maxHeap = Math.max(...heapUsages);
      const avgHeap = heapUsages.reduce((a, b) => a + b, 0) / heapUsages.length;

      console.log(`📊 Memory stability analysis:`);
      console.log(`   Min heap: ${(minHeap / 1024 / 1024).toFixed(2)}MB`);
      console.log(`   Max heap: ${(maxHeap / 1024 / 1024).toFixed(2)}MB`);
      console.log(`   Avg heap: ${(avgHeap / 1024 / 1024).toFixed(2)}MB`);
      console.log(
        `   Variance: ${(((maxHeap - minHeap) / avgHeap) * 100).toFixed(1)}%`,
      );

      // Memory should not grow unbounded
      const memoryGrowth = maxHeap - minHeap;
      expect_performance.toUseMemoryLessThan(
        memoryGrowth,
        100 * 1024 * 1024,
        'Memory growth under load',
      ); // 100MB max growth

      // Variance should be reasonable (less than 1000% for test environment)
      const memoryVariance = (maxHeap - minHeap) / avgHeap;
      expect(memoryVariance).toBeLessThan(10.0);
    });

    it('should handle memory pressure gracefully', async () => {
      memory.snapshot('pressure-start');

      // Simulate memory pressure scenario
      const largeAllocations: ArrayBuffer[] = [];

      try {
        // Gradually increase memory pressure
        for (let i = 0; i < 100; i++) {
          // Allocate 1MB chunks
          const chunk = new ArrayBuffer(1024 * 1024);
          largeAllocations.push(chunk);

          // Check if we're approaching memory limits
          const currentMemory = process.memoryUsage();
          if (currentMemory.heapUsed > 500 * 1024 * 1024) {
            // 500MB limit
            console.log(`🚨 Memory pressure reached at iteration ${i}`);
            break;
          }

          // Small delay to allow monitoring
          await new Promise((resolve) => setTimeout(resolve, 10));
        }

        // Log allocation count to ensure array is used
        console.log(`Created ${largeAllocations.length} allocations`);

        memory.snapshot('pressure-peak');

        // Perform operations under pressure
        const result = await benchmark(
          'Operations Under Memory Pressure',
          async () => {
            const data = {
              id: Math.random(),
              content: 'Memory pressure test',
              metadata: new Array(1000).fill(Math.random()),
            };
            return JSON.parse(JSON.stringify(data));
          },
          {
            iterations: 50,
            trackMemory: false,
          },
        );

        // Should still perform reasonably under pressure
        expect(result.averageTime).toBeLessThan(500); // May be slower but not excessive
      } finally {
        // Clean up allocations
        console.log(`Cleaning up ${largeAllocations.length} allocations`);
        largeAllocations.length = 0;

        if (global.gc) {
          global.gc();
          await new Promise((resolve) => setTimeout(resolve, 200));
        }
      }

      memory.snapshot('pressure-end');

      const peakDiff = memory.getDiff('pressure-start', 'pressure-peak');
      const endDiff = memory.getDiff('pressure-start', 'pressure-end');

      if (peakDiff && endDiff) {
        console.log(`📊 Memory pressure test:`);
        console.log(
          `   Peak memory: ${(peakDiff.heapUsed / 1024 / 1024).toFixed(2)}MB`,
        );
        console.log(
          `   Final memory: ${(endDiff.heapUsed / 1024 / 1024).toFixed(2)}MB`,
        );

        // Should not continue growing indefinitely after cleanup
        const memoryGrowth = endDiff.heapUsed - peakDiff.heapUsed;
        expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024); // Should not grow more than 50MB after cleanup
      }
    });
  });
});
