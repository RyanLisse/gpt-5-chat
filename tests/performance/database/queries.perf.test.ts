import { performance } from 'node:perf_hooks';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { MockDatabase } from '../../__mocks__/database.mock';
import { expect_performance, memory } from '../setup/performance-setup';
import { BenchmarkSuite, benchmark } from '../utils/benchmark-utils';
import type { RequestResult } from '../utils/load-test-utils';
import { loadTest } from '../utils/load-test-utils';

// Database performance benchmarks
describe('Database Query Performance Tests', () => {
  let testDb: MockDatabase;
  let seededUsers: Array<{ id: string; email: string; name: string }>;

  beforeAll(async () => {
    // Create a fresh mock database instance for this test suite
    testDb = new MockDatabase();
    console.log('🗄️  Setting up database performance test environment...');

    // Seed test data for performance testing
    const seedResult = await seedPerformanceTestData();
    seededUsers = seedResult.users;

    // TDD London School: Verify behavior contracts were fulfilled
    expect(seededUsers).toBeDefined();
    expect(seededUsers.length).toBe(100);
    console.log(`✅ Verified ${seededUsers.length} users seeded successfully`);
  });

  afterAll(async () => {
    testDb.reset();
    console.log('✅ Database performance tests completed');
  });

  async function seedPerformanceTestData() {
    console.log('📊 Seeding performance test data...');

    // TDD London School: Reset BEFORE starting seeding, not during
    testDb.reset();

    // Create multiple users for testing with predictable data
    const users: Array<{ id: string; email: string; name: string }> = [];
    for (let i = 0; i < 100; i++) {
      const user = await testDb.createUser({
        email: `user${i}@example.com`,
        name: `User ${i}`,
        credits: 100,
        reservedCredits: 0,
      });

      // Verify each user creation immediately
      expect(user).toBeDefined();
      expect(user.email).toBe(`user${i}@example.com`);

      users.push({
        id: user.id,
        email: user.email,
        name: user.name || `User ${i}`,
      });

      // TDD London School: Verify user is retrievable immediately after creation
      const verifyUser = await testDb.getUserByEmail(`user${i}@example.com`);
      if (!verifyUser) {
        throw new Error(
          `Failed to create user${i}@example.com - not retrievable`,
        );
      }
    }

    console.log(`✅ Created ${users.length} users successfully`);

    // Create chats for each user with proper timestamps
    const chats: Array<{ id: string; userId: string; title: string }> = [];
    for (const user of users) {
      for (let j = 0; j < 10; j++) {
        const chat = await testDb.createChat({
          title: `Chat ${j} for ${user.name}`,
          userId: user.id,
          visibility: 'private' as const,
          isPinned: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        // TDD London School: Verify chat creation
        expect(chat).toBeDefined();
        expect(chat.userId).toBe(user.id);

        chats.push({
          id: chat.id,
          userId: chat.userId,
          title: chat.title,
        });
      }
    }

    console.log(`✅ Created ${chats.length} chats successfully`);

    // Create messages for each chat
    let messageCount = 0;
    for (const chat of chats) {
      for (let k = 0; k < 20; k++) {
        await testDb.createMessage({
          chatId: chat.id,
          role: k % 2 === 0 ? 'user' : 'assistant',
          parts: [{ type: 'text', text: `Message ${k} in ${chat.title}` }],
        });
        messageCount++;
      }
    }

    console.log(
      `✅ Seeded ${users.length} users, ${chats.length} chats, ${messageCount} messages`,
    );

    // TDD London School: Comprehensive verification of seeded data
    console.log('🔍 Verifying seeded data integrity...');

    // Verify ALL users are retrievable, not just first 5
    for (let i = 0; i < 100; i++) {
      const verifyUser = await testDb.getUserByEmail(`user${i}@example.com`);
      if (!verifyUser) {
        // Enhanced error diagnostics
        const allUsers = Array.from(testDb.dbState.users.values());
        console.error(`❌ Missing user${i}@example.com`);
        console.error(`Total users in state: ${allUsers.length}`);
        console.error(
          `Sample emails:`,
          allUsers.slice(0, 5).map((u) => u.email),
        );
        throw new Error(
          `Seeding verification failed: user${i}@example.com not found. Total users: ${allUsers.length}`,
        );
      }

      // Verify user properties
      expect(verifyUser.email).toBe(`user${i}@example.com`);
      expect(verifyUser.name).toBe(`User ${i}`);
      expect(verifyUser.credits).toBe(100);
    }

    // Verify sample chats exist for users
    const sampleUser = await testDb.getUserByEmail('user0@example.com');
    expect(sampleUser).toBeDefined();
    const sampleChats = await testDb.getChatsByUserId(sampleUser!.id);
    expect(sampleChats.length).toBe(10);

    console.log('✅ All seeded data verified successfully');
    return { users, chats };
  }

  describe('User Query Performance', () => {
    it('should find user by ID efficiently', async () => {
      // Get a test user ID
      const testUser = await testDb.createUser({
        email: 'performance-test@example.com',
        name: 'Performance Test User',
      });

      const result = await benchmark(
        'User by ID Query',
        async () => {
          return await testDb.getUserById(testUser.id);
        },
        {
          iterations: 1000,
          trackMemory: true,
        },
      );

      expect_performance.toBeFasterThan(
        result.averageTime,
        10,
        'User by ID query',
      );
      expect(result.operationsPerSecond).toBeGreaterThan(200);

      // Memory usage should be reasonable for single record queries
      if (result.memoryUsage?.delta.heapUsed) {
        expect_performance.toUseMemoryLessThan(
          result.memoryUsage.delta.heapUsed,
          50 * 1024 * 1024,
          'User query memory',
        ); // 50MB - realistic for performance test with 1000 iterations
      }
    });

    it('should find user by email efficiently', async () => {
      // Verify test data exists before running performance benchmark
      const testUser = await testDb.getUserByEmail('user50@example.com');
      expect(testUser).toBeTruthy();
      expect(testUser?.email).toBe('user50@example.com');

      // Additional verification that seeded data is accessible
      expect(seededUsers.length).toBeGreaterThan(50);
      expect(seededUsers[50]?.email).toBe('user50@example.com');

      const result = await benchmark(
        'User by Email Query',
        async () => {
          return await testDb.getUserByEmail('user50@example.com');
        },
        {
          iterations: 500,
          trackMemory: true,
        },
      );

      expect_performance.toBeFasterThan(
        result.averageTime,
        15,
        'User by email query',
      );
      expect(result.operationsPerSecond).toBeGreaterThan(100);
    });

    it('should handle concurrent user lookups', async () => {
      // TDD London School: Use existing seeded users instead of creating new ones
      expect(seededUsers.length).toBeGreaterThan(50);

      const result = await loadTest(
        'Concurrent User Queries',
        async (): Promise<RequestResult> => {
          const start = performance.now();

          try {
            // Use existing seeded users for reliable concurrent testing
            const randomIndex = Math.floor(Math.random() * 50); // Use first 50 seeded users
            const randomEmail = `user${randomIndex}@example.com`;
            const user = await testDb.getUserByEmail(randomEmail);

            return {
              success: true,
              responseTime: performance.now() - start,
              size: user ? 1 : 0,
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
          duration: 3000, // 3 seconds
          requestsPerSecond: 20,
          maxConcurrent: 10,
        },
      );

      expect(result.errorRate).toBeLessThan(10.0);
      expect(result.averageResponseTime).toBeLessThan(100);
    }, 10000); // 10 second timeout
  });

  describe('Chat Query Performance', () => {
    it('should retrieve chats by user efficiently', async () => {
      // Verify test user exists with detailed error info
      const user = await testDb.getUserByEmail('user0@example.com');
      expect(user).toBeTruthy();
      expect(user?.email).toBe('user0@example.com');

      if (!user) {
        // Debug info if user is missing
        console.error('❌ Test user not found. Available users:');
        for (let i = 0; i < 5; i++) {
          const debugUser = await testDb.getUserByEmail(`user${i}@example.com`);
          console.error(
            `  user${i}@example.com: ${debugUser ? 'EXISTS' : 'MISSING'}`,
          );
        }
        console.error(
          'Seeded users:',
          seededUsers.slice(0, 5).map((u) => u.email),
        );
        throw new Error(
          'Test setup failed: user0@example.com not found in mock database',
        );
      }

      // Verify user has chats
      const userChats = await testDb.getChatsByUserId(user.id);
      expect(userChats.length).toBeGreaterThan(0);

      const result = await benchmark(
        'Chats by User Query',
        async () => {
          return await testDb.getChatsByUserId(user.id);
        },
        {
          iterations: 200,
          trackMemory: true,
        },
      );

      expect_performance.toBeFasterThan(
        result.averageTime,
        25,
        'Chats by user query',
      );
      expect(result.operationsPerSecond).toBeGreaterThan(60);
    });

    it('should handle chat creation efficiently', async () => {
      const user = await testDb.getUserByEmail('user1@example.com');
      if (!user) {
        console.error(
          'Available users:',
          seededUsers.slice(0, 5).map((u) => u.email),
        );
        throw new Error('Test user not found: user1@example.com');
      }

      const result = await benchmark(
        'Chat Creation',
        async () => {
          return await testDb.createChat({
            title: `Performance Test Chat ${Date.now()}`,
            userId: user.id,
            visibility: 'private' as const,
            isPinned: false,
          });
        },
        {
          iterations: 100,
          trackMemory: true,
        },
      );

      expect_performance.toBeFasterThan(
        result.averageTime,
        20,
        'Chat creation',
      );
      expect(result.operationsPerSecond).toBeGreaterThan(80);
    });

    it('should update chat metadata efficiently', async () => {
      // Use a seeded user instead of hardcoded ID
      const testUser = seededUsers[0];
      const chat = await testDb.createChat({
        title: 'Test Chat for Updates',
        userId: testUser.id,
        visibility: 'private' as const,
        isPinned: false,
      });

      const result = await benchmark(
        'Chat Update',
        async () => {
          return await testDb.updateChat(chat.id, {
            title: `Updated Chat ${Date.now()}`,
            updatedAt: new Date(),
          });
        },
        {
          iterations: 200,
          trackMemory: true,
        },
      );

      expect_performance.toBeFasterThan(result.averageTime, 15, 'Chat update');
      expect(result.operationsPerSecond).toBeGreaterThan(100);
    });
  });

  describe('Message Query Performance', () => {
    it('should retrieve messages by chat efficiently', async () => {
      const user = await testDb.getUserByEmail('user2@example.com');
      expect(user).toBeTruthy();

      const chats = await testDb.getChatsByUserId(user!.id);
      expect(chats.length).toBeGreaterThan(0);

      const testChat = chats[0];
      expect(testChat).toBeTruthy();
      expect(testChat.id).toBeDefined();

      const result = await benchmark(
        'Messages by Chat Query',
        async () => {
          return await testDb.getMessagesByChatId(testChat.id);
        },
        {
          iterations: 100,
          trackMemory: true,
        },
      );

      expect_performance.toBeFasterThan(
        result.averageTime,
        40,
        'Messages by chat query',
      );
      expect(result.operationsPerSecond).toBeGreaterThan(50);
    });

    it('should handle message creation efficiently', async () => {
      const user = await testDb.getUserByEmail('user3@example.com');
      expect(user).toBeTruthy();

      const chats = await testDb.getChatsByUserId(user!.id);
      expect(chats.length).toBeGreaterThan(0);

      const testChat = chats[0];
      expect(testChat).toBeTruthy();
      expect(testChat.id).toBeDefined();

      const result = await benchmark(
        'Message Creation',
        async () => {
          return await testDb.createMessage({
            chatId: testChat.id,
            role: 'user',
            parts: [
              { type: 'text', text: `Performance test message ${Date.now()}` },
            ],
          });
        },
        {
          iterations: 200,
          trackMemory: true,
        },
      );

      expect_performance.toBeFasterThan(
        result.averageTime,
        25,
        'Message creation',
      );
      expect(result.operationsPerSecond).toBeGreaterThan(70);
    });

    it('should handle bulk message operations', async () => {
      const user = await testDb.getUserByEmail('user4@example.com');
      expect(user).toBeTruthy();

      const chats = await testDb.getChatsByUserId(user!.id);
      expect(chats.length).toBeGreaterThan(0);

      const testChat = chats[0];
      expect(testChat).toBeTruthy();
      expect(testChat.id).toBeDefined();

      const result = await benchmark(
        'Bulk Message Creation',
        async () => {
          const promises = [];
          for (let i = 0; i < 10; i++) {
            promises.push(
              testDb.createMessage({
                chatId: testChat.id,
                role: i % 2 === 0 ? 'user' : 'assistant',
                parts: [
                  { type: 'text', text: `Bulk message ${i} ${Date.now()}` },
                ],
              }),
            );
          }
          return Promise.all(promises);
        },
        {
          iterations: 20,
          trackMemory: true,
        },
      );

      expect_performance.toBeFasterThan(
        result.averageTime,
        200,
        'Bulk message creation',
      );
      expect(result.operationsPerSecond).toBeGreaterThan(8);
    });
  });

  describe('Vote Query Performance', () => {
    it('should handle vote operations efficiently', async () => {
      const user = await testDb.getUserByEmail('user5@example.com');
      expect(user).toBeTruthy();

      const chats = await testDb.getChatsByUserId(user!.id);
      expect(chats.length).toBeGreaterThan(0);

      const testChat = chats[0];
      expect(testChat).toBeTruthy();
      expect(testChat.id).toBeDefined();

      const messages = await testDb.getMessagesByChatId(testChat.id);
      expect(messages.length).toBeGreaterThan(0);

      const testMessage = messages[0];
      expect(testMessage).toBeTruthy();
      expect(testMessage.id).toBeDefined();

      const suite = new BenchmarkSuite()
        .add(
          'Vote Creation',
          async () => {
            return await testDb.createVote({
              chatId: testChat.id,
              messageId: testMessage.id,
              isUpvoted: Math.random() > 0.5,
            });
          },
          { iterations: 100 },
        )
        .add(
          'Vote Lookup',
          async () => {
            return await testDb.getVoteByChatAndMessage(
              testChat.id,
              testMessage.id,
            );
          },
          { iterations: 200 },
        );

      const { results } = await suite.runComparison();

      results.forEach((result) => {
        expect_performance.toBeFasterThan(result.averageTime, 15, result.name);
        expect(result.operationsPerSecond).toBeGreaterThan(100);
      });
    });
  });

  describe('Query Performance Under Load', () => {
    it('should maintain performance under concurrent database operations', async () => {
      const result = await loadTest(
        'Mixed Database Operations',
        async (): Promise<RequestResult> => {
          const start = performance.now();

          try {
            const operationType = Math.floor(Math.random() * 3);

            if (operationType === 0) {
              // TDD London School: Use seeded users for realistic load testing
              await testDb.getUserByEmail(
                `user${Math.floor(Math.random() * 50)}@example.com`,
              );
            } else if (operationType === 1) {
              // Use existing seeded user ID
              const userIndex = Math.floor(
                Math.random() * Math.min(50, seededUsers.length),
              );
              const userId = seededUsers[userIndex]?.id || 'fallback-user-id';
              await testDb.getChatsByUserId(userId);
            } else {
              // Create message using existing chat from seeded data
              const userIndex = Math.floor(
                Math.random() * Math.min(10, seededUsers.length),
              );
              const user = seededUsers[userIndex];
              if (user) {
                const userChats = await testDb.getChatsByUserId(user.id);
                const chatId =
                  userChats.length > 0
                    ? userChats[0].id
                    : `fallback_chat_${Date.now()}`;
                await testDb.createMessage({
                  chatId,
                  role: 'user',
                  parts: [{ type: 'text', text: 'Load test message' }],
                });
              }
            }

            return {
              success: true,
              responseTime: performance.now() - start,
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
          duration: 3000, // 3 seconds
          requestsPerSecond: 30,
          maxConcurrent: 15,
        },
      );

      expect(result.errorRate).toBeLessThan(10.0);
      expect(result.averageResponseTime).toBeLessThan(100);
      expect(result.requestsPerSecond).toBeGreaterThan(10);
    }, 10000); // 10 second timeout

    it('should handle database connection pooling efficiently', async () => {
      memory.snapshot('db-pool-start');

      // TDD London School: Use verified seeded users for connection pooling test
      const concurrentQueries = Array.from({ length: 50 }, async (_, i) => {
        const userIndex = i % Math.min(50, seededUsers.length);
        return await testDb.getUserByEmail(`user${userIndex}@example.com`);
      });

      const start = performance.now();
      await Promise.all(concurrentQueries);
      const duration = performance.now() - start;

      memory.snapshot('db-pool-end');

      expect_performance.toBeFasterThan(
        duration,
        2000,
        'Concurrent database connections',
      );

      const memoryDiff = memory.getDiff('db-pool-start', 'db-pool-end');
      if (memoryDiff) {
        expect_performance.toUseMemoryLessThan(
          memoryDiff.heapUsed,
          5 * 1024 * 1024,
          'Database connection pooling memory',
        ); // 5MB
      }
    });
  });

  describe('Database Performance Regression Tests', () => {
    it('should not regress in query performance over time', async () => {
      const baselineResults = new Map<string, number>();

      // Establish baselines
      const queryTests = [
        {
          name: 'user-by-id',
          operation: () => testDb.getUserById('test-user-id'),
          baseline: 15, // 15ms baseline
        },
        {
          name: 'chats-by-user',
          operation: () => testDb.getChatsByUserId('test-user-id'),
          baseline: 30, // 30ms baseline
        },
        {
          name: 'messages-by-chat',
          operation: () => testDb.getMessagesByChatId('test-chat-id'),
          baseline: 50, // 50ms baseline
        },
      ];

      for (const test of queryTests) {
        const result = await benchmark(
          `Regression Test: ${test.name}`,
          test.operation,
          {
            iterations: 50,
            trackMemory: false,
          },
        );

        baselineResults.set(test.name, result.averageTime);

        // Check against baseline (allow 20% tolerance)
        const tolerance = test.baseline * 1.2;
        expect_performance.toBeFasterThan(
          result.averageTime,
          tolerance,
          `${test.name} regression check`,
        );
      }

      console.log('📊 Performance regression test baselines:');
      baselineResults.forEach((time, name) => {
        console.log(`   ${name}: ${time.toFixed(2)}ms`);
      });
    });
  });
});
