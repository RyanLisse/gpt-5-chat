import { performance } from 'node:perf_hooks';
import { beforeAll, describe, expect, it } from 'vitest';
import { expect_performance, memory } from '../setup/performance-setup';
import {
  BenchmarkSuite,
  benchmark,
  benchmarkUntilStable,
} from '../utils/benchmark-utils';

// Mock critical application components
class MockMessageProcessor {
  async processMessage(content: string): Promise<any> {
    // Simulate message processing: tokenization, validation, formatting
    await new Promise((resolve) => setTimeout(resolve, Math.random() * 10 + 5)); // 5-15ms

    const tokens = content.split(' ');
    const processed = {
      id: `msg_${Date.now()}_${Math.random()}`,
      content,
      tokens: tokens.length,
      wordCount: tokens.filter((t) => t.length > 0).length,
      processedAt: Date.now(),
      metadata: {
        language: 'en',
        sentiment: Math.random() > 0.5 ? 'positive' : 'negative',
        confidence: Math.random(),
      },
    };

    return processed;
  }

  async validateMessage(message: any): Promise<boolean> {
    // Simulate validation logic
    await new Promise((resolve) => setTimeout(resolve, Math.random() * 5 + 2)); // 2-7ms

    return (
      message.content &&
      message.content.length > 0 &&
      message.content.length < 10000 &&
      message.tokens > 0
    );
  }
}

class MockEmbeddingService {
  private readonly cache = new Map<string, Float32Array>();

  async generateEmbedding(text: string): Promise<Float32Array> {
    // Check cache first
    if (this.cache.has(text)) {
      const cached = this.cache.get(text);
      if (cached) {
        return cached;
      }
    }

    // Simulate embedding generation
    await new Promise((resolve) =>
      setTimeout(resolve, Math.random() * 50 + 20),
    ); // 20-70ms

    const embedding = new Float32Array(384); // Standard embedding size
    for (let i = 0; i < embedding.length; i++) {
      embedding[i] = Math.random() * 2 - 1; // Random values between -1 and 1
    }

    // Cache the result
    if (this.cache.size < 1000) {
      // Limit cache size
      this.cache.set(text, embedding);
    }

    return embedding;
  }

  async computeSimilarity(
    embedding1: Float32Array,
    embedding2: Float32Array,
  ): Promise<number> {
    // Simulate cosine similarity computation
    await new Promise((resolve) => setTimeout(resolve, Math.random() * 3 + 1)); // 1-4ms

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i];
      norm1 += embedding1[i] * embedding1[i];
      norm2 += embedding2[i] * embedding2[i];
    }

    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }
}

class MockSearchIndex {
  private readonly documents = new Map<string, any>();
  private readonly embeddings = new Map<string, Float32Array>();

  async addDocument(
    id: string,
    content: string,
    embedding: Float32Array,
  ): Promise<void> {
    // Simulate indexing delay
    await new Promise((resolve) => setTimeout(resolve, Math.random() * 20 + 5)); // 5-25ms

    this.documents.set(id, {
      id,
      content,
      addedAt: Date.now(),
      wordCount: content.split(' ').length,
    });

    this.embeddings.set(id, embedding);
  }

  async search(
    _query: string,
    queryEmbedding: Float32Array,
    limit = 10,
  ): Promise<any[]> {
    // Simulate search operation
    await new Promise((resolve) =>
      setTimeout(resolve, Math.random() * 30 + 10),
    ); // 10-40ms

    const results: Array<{ document: any; similarity: number }> = [];

    for (const [id, embedding] of this.embeddings.entries()) {
      const document = this.documents.get(id);
      if (!document) continue;

      // Compute similarity (simplified)
      let similarity = 0;
      for (
        let i = 0;
        i < Math.min(embedding.length, queryEmbedding.length);
        i++
      ) {
        similarity += embedding[i] * queryEmbedding[i];
      }

      results.push({ document, similarity });
    }

    const sortedResults = results.toSorted(
      (a, b) => b.similarity - a.similarity,
    );
    return sortedResults.slice(0, limit).map((r) => r.document);
  }
}

class MockAuthService {
  private readonly sessions = new Map<string, any>();
  private readonly userCache = new Map<string, any>();

  async validateSession(token: string): Promise<any> {
    // Simulate session validation
    await new Promise((resolve) => setTimeout(resolve, Math.random() * 15 + 5)); // 5-20ms

    if (this.sessions.has(token)) {
      return this.sessions.get(token);
    }

    // Simulate database lookup
    await new Promise((resolve) => setTimeout(resolve, Math.random() * 10 + 5)); // 5-15ms

    const session = {
      token,
      userId: `user_${Math.random()}`,
      createdAt: Date.now(),
      expiresAt: Date.now() + 3600000, // 1 hour
      permissions: ['read', 'write'],
    };

    this.sessions.set(token, session);
    return session;
  }

  async getUserById(userId: string): Promise<any> {
    if (this.userCache.has(userId)) {
      return this.userCache.get(userId);
    }

    // Simulate user lookup
    await new Promise((resolve) =>
      setTimeout(resolve, Math.random() * 20 + 10),
    ); // 10-30ms

    const user = {
      id: userId,
      email: `user${Math.random()}@example.com`,
      name: `User ${Math.random()}`,
      createdAt: Date.now(),
      settings: {
        theme: 'dark',
        notifications: true,
      },
    };

    this.userCache.set(userId, user);
    return user;
  }
}

describe('Critical Code Path Benchmarks', () => {
  let messageProcessor: MockMessageProcessor;
  let embeddingService: MockEmbeddingService;
  let searchIndex: MockSearchIndex;
  let authService: MockAuthService;

  beforeAll(async () => {
    messageProcessor = new MockMessageProcessor();
    embeddingService = new MockEmbeddingService();
    searchIndex = new MockSearchIndex();
    authService = new MockAuthService();

    console.log('🔥 Starting critical code path benchmarks...');

    // Seed search index with test data
    for (let i = 0; i < 100; i++) {
      const content = `Test document ${i} with some content about various topics`;
      const embedding = await embeddingService.generateEmbedding(content);
      await searchIndex.addDocument(`doc_${i}`, content, embedding);
    }
  });

  describe('Message Processing Pipeline', () => {
    it('should process messages efficiently', async () => {
      const testMessages = [
        'Hello, how are you today?',
        'Can you explain quantum computing in simple terms?',
        'What are the best practices for React performance optimization?',
        'I need help with database query optimization',
        'How does machine learning work in natural language processing?',
      ];

      const result = await benchmark(
        'Message Processing',
        async () => {
          const randomMessage =
            testMessages[Math.floor(Math.random() * testMessages.length)];

          // Full message processing pipeline
          const processed =
            await messageProcessor.processMessage(randomMessage);
          const isValid = await messageProcessor.validateMessage(processed);
          const embedding = await embeddingService.generateEmbedding(
            processed.content,
          );

          return { processed, isValid, embeddingSize: embedding.length };
        },
        {
          iterations: 200,
          trackMemory: true,
        },
      );

      expect_performance.toBeFasterThan(
        result.averageTime,
        150,
        'Message processing pipeline',
      );
      expect(result.operationsPerSecond).toBeGreaterThan(10);

      console.log(
        `📊 Message processing: ${result.averageTime.toFixed(2)}ms avg, ${result.operationsPerSecond.toFixed(0)} ops/sec`,
      );
    });

    it('should handle concurrent message processing', async () => {
      const concurrentMessages = Array.from(
        { length: 20 },
        (_, i) =>
          `Concurrent test message ${i} with varying content length and complexity`,
      );

      const processMessageConcurrently = async (message: string) => {
        const processed = await messageProcessor.processMessage(message);
        const isValid = await messageProcessor.validateMessage(processed);
        return { processed, isValid };
      };

      const processConcurrentMessages = async () => {
        const promises = concurrentMessages.map(processMessageConcurrently);
        const results = await Promise.all(promises);
        return results.filter((r) => r.isValid).length;
      };

      const result = await benchmark(
        'Concurrent Message Processing',
        processConcurrentMessages,
        {
          iterations: 50,
          trackMemory: true,
        },
      );

      expect_performance.toBeFasterThan(
        result.averageTime,
        800,
        'Concurrent message processing',
      );
      expect(result.operationsPerSecond).toBeGreaterThan(2);
    });

    it('should optimize message processing under load', async () => {
      const processMessagesUnderLoad = async () => {
        const messages = Array.from(
          { length: 5 },
          (_, i) => `Load test message ${i} ${Math.random()}`,
        );

        const start = performance.now();

        for (const message of messages) {
          await messageProcessor.processMessage(message);
        }

        return performance.now() - start;
      };

      const result = await benchmarkUntilStable(
        'Message Processing Under Load',
        processMessagesUnderLoad,
        0.05,
        { timeout: 20000 },
      ); // 5% stability threshold

      expect_performance.toBeFasterThan(
        result.averageTime,
        400,
        'Stable message processing',
      );

      console.log(
        `📊 Stable processing achieved after ${result.iterations} iterations`,
      );
    });
  });

  describe('Embedding and Search Performance', () => {
    it('should generate embeddings efficiently', async () => {
      const suite = new BenchmarkSuite()
        .add(
          'Short Text Embedding',
          async () => {
            return await embeddingService.generateEmbedding('Hello world');
          },
          { iterations: 100 },
        )
        .add(
          'Medium Text Embedding',
          async () => {
            return await embeddingService.generateEmbedding(
              'This is a medium length text with multiple sentences and various concepts that need to be embedded.',
            );
          },
          { iterations: 100 },
        )
        .add(
          'Long Text Embedding',
          async () => {
            const longText = 'This is a very long text. '.repeat(50);
            return await embeddingService.generateEmbedding(longText);
          },
          { iterations: 50 },
        );

      const { results, comparison } = await suite.runComparison();

      // All embedding operations should be reasonably fast
      results.forEach((result) => {
        expect_performance.toBeFasterThan(result.averageTime, 150, result.name);
        expect(result.operationsPerSecond).toBeGreaterThan(8);
      });

      console.log('📊 Embedding performance comparison:');
      comparison.forEach((comp) => {
        console.log(
          `   ${comp.name}: ${comp.factor.toFixed(2)}x slower than baseline`,
        );
      });
    });

    it('should perform similarity computations efficiently', async () => {
      // Pre-generate embeddings for testing
      const embedding1 =
        await embeddingService.generateEmbedding('First test text');
      const embedding2 =
        await embeddingService.generateEmbedding('Second test text');
      const embedding3 = await embeddingService.generateEmbedding(
        'Completely different content',
      );

      const result = await benchmark(
        'Similarity Computation',
        async () => {
          const similarities = await Promise.all([
            embeddingService.computeSimilarity(embedding1, embedding2),
            embeddingService.computeSimilarity(embedding1, embedding3),
            embeddingService.computeSimilarity(embedding2, embedding3),
          ]);

          return similarities.reduce((a, b) => a + b, 0) / similarities.length;
        },
        {
          iterations: 500,
          trackMemory: true,
        },
      );

      expect_performance.toBeFasterThan(
        result.averageTime,
        30,
        'Similarity computation',
      );
      expect(result.operationsPerSecond).toBeGreaterThan(80);
    });

    it('should handle search operations efficiently', async () => {
      const queries = [
        'test document',
        'various topics',
        'content about',
        'some content',
        'document with',
      ];

      const result = await benchmark(
        'Search Operations',
        async () => {
          const randomQuery =
            queries[Math.floor(Math.random() * queries.length)];
          const queryEmbedding =
            await embeddingService.generateEmbedding(randomQuery);
          const results = await searchIndex.search(
            randomQuery,
            queryEmbedding,
            5,
          );

          return results.length;
        },
        {
          iterations: 100,
          trackMemory: true,
        },
      );

      expect_performance.toBeFasterThan(
        result.averageTime,
        200,
        'Search operations',
      );
      expect(result.operationsPerSecond).toBeGreaterThan(10);
    });
  });

  describe('Authentication and Session Management', () => {
    it('should validate sessions efficiently', async () => {
      const testTokens = Array.from(
        { length: 50 },
        (_, i) => `token_${i}_${Date.now()}`,
      );

      const result = await benchmark(
        'Session Validation',
        async () => {
          const randomToken =
            testTokens[Math.floor(Math.random() * testTokens.length)];
          const session = await authService.validateSession(randomToken);
          const user = await authService.getUserById(session.userId);

          return { sessionValid: !!session, userLoaded: !!user };
        },
        {
          iterations: 200,
          trackMemory: true,
        },
      );

      expect_performance.toBeFasterThan(
        result.averageTime,
        80,
        'Session validation',
      );
      expect(result.operationsPerSecond).toBeGreaterThan(20);
    });

    it('should handle concurrent auth requests', async () => {
      const concurrentTokens = Array.from(
        { length: 25 },
        (_, i) => `concurrent_token_${i}`,
      );

      const result = await benchmark(
        'Concurrent Auth Requests',
        async () => {
          const promises = concurrentTokens.map(async (token) => {
            const session = await authService.validateSession(token);
            const user = await authService.getUserById(session.userId);
            return { session, user };
          });

          const results = await Promise.all(promises);
          return results.filter((r) => r.session && r.user).length;
        },
        {
          iterations: 20,
          trackMemory: true,
        },
      );

      expect_performance.toBeFasterThan(
        result.averageTime,
        1500,
        'Concurrent auth requests',
      );
      expect(result.operationsPerSecond).toBeGreaterThan(1);
    });
  });

  describe('End-to-End Critical Path Performance', () => {
    it(
      'should handle complete chat flow efficiently',
      async () => {
        memory.snapshot('chat-flow-start');

        const result = await benchmark(
          'Complete Chat Flow',
          async () => {
            // 1. Authenticate user
            const token = `flow_token_${Math.random()}`;
            const session = await authService.validateSession(token);
            const user = await authService.getUserById(session.userId);

            // 2. Process incoming message
            const message = `User message: How can I optimize my application performance? ${Math.random()}`;
            const processed = await messageProcessor.processMessage(message);
            const isValid = await messageProcessor.validateMessage(processed);

            if (!isValid) {
              throw new Error('Invalid message');
            }

            // 3. Generate embedding for context search
            const embedding = await embeddingService.generateEmbedding(
              processed.content,
            );

            // 4. Search for relevant context
            const contextResults = await searchIndex.search(
              processed.content,
              embedding,
              3,
            );

            // 5. Generate response (simulated)
            const _response = {
              id: `response_${Date.now()}`,
              content: 'Here are some performance optimization strategies...',
              context: contextResults,
              user: user.id,
              timestamp: Date.now(),
            };

            return {
              authenticated: true,
              messageProcessed: true,
              contextFound: contextResults.length > 0,
              responseGenerated: true,
            };
          },
          {
            iterations: 50,
            trackMemory: true,
            timeout: 20000,
          },
        );

        memory.snapshot('chat-flow-end');

        expect_performance.toBeFasterThan(
          result.averageTime,
          500,
          'Complete chat flow',
        );
        expect(result.operationsPerSecond).toBeGreaterThan(3);

        const memoryDiff = memory.getDiff('chat-flow-start', 'chat-flow-end');
        if (memoryDiff) {
          expect_performance.toUseMemoryLessThan(
            memoryDiff.heapUsed,
            20 * 1024 * 1024,
            'Chat flow memory',
          );
          console.log(
            `📊 Chat flow memory usage: ${(memoryDiff.heapUsed / 1024 / 1024).toFixed(2)}MB`,
          );
        }

        console.log(
          `📊 Complete chat flow: ${result.averageTime.toFixed(2)}ms avg`,
        );
      },
      { timeout: 15000 },
    );

    it('should maintain performance under realistic load', async () => {
      const userTokens = Array.from({ length: 10 }, (_, i) => `load_user_${i}`);
      const messageTemplates = [
        'How do I optimize database queries?',
        'What are React best practices?',
        'Explain microservices architecture',
        'How to implement caching strategies?',
        'What is the difference between SQL and NoSQL?',
      ];

      const result = await benchmark(
        'Realistic Load Simulation',
        async () => {
          // Simulate 5 concurrent chat interactions
          const promises = Array.from({ length: 5 }, async () => {
            const token =
              userTokens[Math.floor(Math.random() * userTokens.length)];
            const message =
              messageTemplates[
                Math.floor(Math.random() * messageTemplates.length)
              ];

            // Full chat pipeline
            const session = await authService.validateSession(token);
            const user = await authService.getUserById(session.userId);
            const processed = await messageProcessor.processMessage(message);
            const embedding = await embeddingService.generateEmbedding(
              processed.content,
            );
            const context = await searchIndex.search(
              processed.content,
              embedding,
              2,
            );

            return {
              userId: user.id,
              messageLength: processed.content.length,
              contextResults: context.length,
            };
          });

          const results = await Promise.all(promises);
          return results.length;
        },
        {
          iterations: 30,
          trackMemory: true,
          timeout: 20000,
        },
      );

      expect_performance.toBeFasterThan(
        result.averageTime,
        1500,
        'Realistic load performance',
      );
      expect(result.operationsPerSecond).toBeGreaterThan(1);

      console.log(
        `📊 Realistic load: ${result.averageTime.toFixed(2)}ms for 5 concurrent operations`,
      );
    });
  });

  describe('Performance Regression Detection', () => {
    it('should establish performance baselines', async () => {
      const baselines = new Map<string, number>();

      const criticalPaths = [
        {
          name: 'message-processing',
          operation: () =>
            messageProcessor.processMessage('Test message for baseline'),
          sla: 50, // 50ms SLA
        },
        {
          name: 'embedding-generation',
          operation: () =>
            embeddingService.generateEmbedding('Baseline embedding test'),
          sla: 80, // 80ms SLA
        },
        {
          name: 'session-validation',
          operation: () => authService.validateSession('baseline_token'),
          sla: 30, // 30ms SLA
        },
        {
          name: 'search-operation',
          operation: async () => {
            const embedding =
              await embeddingService.generateEmbedding('search baseline');
            return searchIndex.search('baseline', embedding, 5);
          },
          sla: 120, // 120ms SLA
        },
      ];

      for (const path of criticalPaths) {
        const result = await benchmark(
          `Baseline: ${path.name}`,
          path.operation,
          {
            iterations: 30,
            trackMemory: false,
          },
        );

        baselines.set(path.name, result.averageTime);

        // Check against SLA
        expect_performance.toBeFasterThan(
          result.averageTime,
          path.sla,
          `${path.name} SLA`,
        );

        console.log(
          `📊 ${path.name} baseline: ${result.averageTime.toFixed(2)}ms (SLA: ${path.sla}ms)`,
        );
      }

      // Store baselines for future regression testing
      console.log('\n📊 Performance Baselines Established:');
      baselines.forEach((time, name) => {
        console.log(`   ${name}: ${time.toFixed(2)}ms`);
      });
    });
  });
});
