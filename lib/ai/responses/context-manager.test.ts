import { beforeEach, describe, expect, it } from 'vitest';
import {
  ConversationContextManager,
  MockContextManager,
} from './context-manager';
import type {
  ContextOptimizationInput,
  ContextOptimizationResult,
  ContextTruncationResult,
  IContextManager,
} from './types';

describe('ConversationContextManager', () => {
  let contextManager: ConversationContextManager;

  beforeEach(() => {
    contextManager = new ConversationContextManager();
  });

  describe('optimizeContext', () => {
    it('should optimize context without truncation when within limits', async () => {
      const input: ContextOptimizationInput = {
        conversationId: 'test-conv',
        turnCount: 10,
        totalTokens: 4000,
        maxTokens: 8000,
      };

      const result = await contextManager.optimizeContext(input);

      expect(result.shouldTruncate).toBe(false);
      expect(result.relevanceScore).toBeGreaterThan(0);
      expect(result.relevanceScore).toBeLessThanOrEqual(1);
      expect(result.tokensToRemove).toBeUndefined();
      expect(result.recommendedSummary).toBeUndefined();
    });

    it('should optimize context with truncation when exceeding limits', async () => {
      const input: ContextOptimizationInput = {
        conversationId: 'test-conv',
        turnCount: 20,
        totalTokens: 10_000,
        maxTokens: 8000,
      };

      const result = await contextManager.optimizeContext(input);

      expect(result.shouldTruncate).toBe(true);
      expect(result.relevanceScore).toBeGreaterThan(0);
      expect(result.tokensToRemove).toBe(2000);
      expect(result.recommendedSummary).toContain('conversation turns');
      expect(result.recommendedSummary).toContain('technical implementation');
    });

    it('should use default maxTokens when not provided', async () => {
      const input: ContextOptimizationInput = {
        turnCount: 5,
        totalTokens: 4000,
        maxTokens: 0, // Will use default 8000
      };

      const result = await contextManager.optimizeContext(input);

      expect(result.shouldTruncate).toBe(false);
    });

    it('should handle maxTokens of 0 by using default', async () => {
      const input: ContextOptimizationInput = {
        turnCount: 5,
        totalTokens: 9000,
        maxTokens: 0,
      };

      const result = await contextManager.optimizeContext(input);

      expect(result.shouldTruncate).toBe(true);
      expect(result.tokensToRemove).toBe(1000); // 9000 - 8000 (default)
    });

    it('should calculate relevance score correctly for various inputs', async () => {
      const testCases = [
        { turnCount: 0, totalTokens: 0, expectedMin: 0, expectedMax: 1 },
        { turnCount: 20, totalTokens: 4000, expectedMin: 0.5, expectedMax: 1 },
        { turnCount: 1, totalTokens: 200, expectedMin: 0, expectedMax: 1 },
      ];

      for (const testCase of testCases) {
        const input: ContextOptimizationInput = {
          turnCount: testCase.turnCount,
          totalTokens: testCase.totalTokens,
          maxTokens: 8000,
        };

        const result = await contextManager.optimizeContext(input);

        expect(result.relevanceScore).toBeGreaterThanOrEqual(
          testCase.expectedMin,
        );
        expect(result.relevanceScore).toBeLessThanOrEqual(testCase.expectedMax);
      }
    });

    it('should generate appropriate summary for large truncations', async () => {
      const input: ContextOptimizationInput = {
        turnCount: 50,
        totalTokens: 15_000,
        maxTokens: 8000,
      };

      const result = await contextManager.optimizeContext(input);

      expect(result.shouldTruncate).toBe(true);
      expect(result.tokensToRemove).toBe(7000);
      expect(result.recommendedSummary).toContain('47 conversation turns');
      expect(result.recommendedSummary).toContain('94%');
    });
  });

  describe('truncateContext', () => {
    it('should truncate context and return removal statistics', async () => {
      const conversationId = 'test-conversation';
      const maxTokens = 5000;

      const result = await contextManager.truncateContext(
        conversationId,
        maxTokens,
      );

      expect(result.tokensRemoved).toBeGreaterThan(0);
      expect(result.turnsRemoved).toBeGreaterThan(0);
      expect(result.summaryCreated).toContain('conversation turns');
      expect(result.summaryCreated).toContain('technical implementation');
    });

    it('should handle different maxTokens values', async () => {
      const conversationId = 'test-conversation';
      const testCases = [1000, 3000, 5000, 10_000];

      for (const maxTokens of testCases) {
        const result = await contextManager.truncateContext(
          conversationId,
          maxTokens,
        );

        expect(result.tokensRemoved).toBeGreaterThanOrEqual(0);
        expect(result.turnsRemoved).toBeGreaterThanOrEqual(0);
        expect(result.summaryCreated).toBeDefined();
      }
    });

    it('should calculate turns to remove based on tokens per turn', async () => {
      const conversationId = 'test-conversation';
      const maxTokens = 6000; // This should result in 2000 tokens to remove

      const result = await contextManager.truncateContext(
        conversationId,
        maxTokens,
      );

      // Expected: 2000 tokens to remove / 150 tokens per turn = ~14 turns
      expect(result.turnsRemoved).toBe(14);
      expect(result.tokensRemoved).toBe(2000);
    });
  });

  describe('calculateRelevanceScore', () => {
    it('should return baseline relevance score', async () => {
      const conversationId = 'test-conversation';

      const score =
        await contextManager.calculateRelevanceScore(conversationId);

      expect(score).toBe(0.8);
      expect(typeof score).toBe('number');
    });

    it('should handle different conversation IDs consistently', async () => {
      const conversationIds = ['conv-1', 'conv-2', 'conv-3'];

      for (const conversationId of conversationIds) {
        const score =
          await contextManager.calculateRelevanceScore(conversationId);
        expect(score).toBe(0.8);
      }
    });
  });

  describe('summarizeContext', () => {
    it('should return template summary', async () => {
      const conversationId = 'test-conversation';

      const summary = await contextManager.summarizeContext(conversationId);

      expect(summary).toBe(
        'User engaged in technical discussion about implementation details and system design.',
      );
      expect(typeof summary).toBe('string');
    });

    it('should handle different conversation IDs consistently', async () => {
      const conversationIds = ['conv-1', 'conv-2', 'conv-3'];

      for (const conversationId of conversationIds) {
        const summary = await contextManager.summarizeContext(conversationId);
        expect(summary).toContain('technical discussion');
      }
    });
  });

  describe('private method behavior through public interface', () => {
    it('should use calculateContextRelevance correctly in optimizeContext', async () => {
      // Test edge cases for relevance calculation
      const testCases: Array<{
        input: ContextOptimizationInput;
        expectedRelevanceRange: [number, number];
      }> = [
        {
          input: { turnCount: 0, totalTokens: 0, maxTokens: 8000 },
          expectedRelevanceRange: [0, 0.4],
        },
        {
          input: { turnCount: 20, totalTokens: 4000, maxTokens: 8000 },
          expectedRelevanceRange: [0.6, 1],
        },
        {
          input: { turnCount: 10, totalTokens: 1000, maxTokens: 8000 },
          expectedRelevanceRange: [0.2, 0.8],
        },
      ];

      for (const testCase of testCases) {
        const result = await contextManager.optimizeContext(testCase.input);
        expect(result.relevanceScore).toBeGreaterThanOrEqual(
          testCase.expectedRelevanceRange[0],
        );
        expect(result.relevanceScore).toBeLessThanOrEqual(
          testCase.expectedRelevanceRange[1],
        );
      }
    });

    it('should use generateContextSummary correctly in optimizeContext', async () => {
      const input: ContextOptimizationInput = {
        turnCount: 100,
        totalTokens: 20_000,
        maxTokens: 8000,
      };

      const result = await contextManager.optimizeContext(input);

      expect(result.recommendedSummary).toBeDefined();
      expect(result.recommendedSummary).toMatch(/\d+ conversation turns/);
      expect(result.recommendedSummary).toMatch(/\d+% of context/);
    });
  });
});

describe('MockContextManager', () => {
  let mockContextManager: MockContextManager;

  beforeEach(() => {
    mockContextManager = new MockContextManager();
  });

  describe('interface compliance', () => {
    it('should implement IContextManager interface', () => {
      // Type check - this will fail at compile time if interface is not implemented
      const contextManager: IContextManager = mockContextManager;
      expect(contextManager).toBeDefined();
    });
  });

  describe('setMockResult and retrieval', () => {
    it('should set and retrieve mock results for optimizeContext', async () => {
      const conversationId = 'test-conv';
      const mockResult: ContextOptimizationResult = {
        shouldTruncate: true,
        relevanceScore: 0.9,
        tokensToRemove: 1000,
        recommendedSummary: 'Custom mock summary',
      };

      mockContextManager.setMockResult(
        'optimizeContext',
        conversationId,
        mockResult,
      );

      const input: ContextOptimizationInput = {
        conversationId,
        turnCount: 10,
        totalTokens: 5000,
        maxTokens: 4000,
      };

      const result = await mockContextManager.optimizeContext(input);

      expect(result).toEqual(mockResult);
    });

    it('should set and retrieve mock results for truncateContext', async () => {
      const conversationId = 'test-conv';
      const mockResult: ContextTruncationResult = {
        tokensRemoved: 2000,
        turnsRemoved: 15,
        summaryCreated: 'Custom truncation summary',
      };

      mockContextManager.setMockResult(
        'truncateContext',
        conversationId,
        mockResult,
      );

      const result = await mockContextManager.truncateContext(
        conversationId,
        5000,
      );

      expect(result).toEqual(mockResult);
    });

    it('should set and retrieve mock results for calculateRelevanceScore', async () => {
      const conversationId = 'test-conv';
      const mockScore = 0.95;

      mockContextManager.setMockResult(
        'calculateRelevanceScore',
        conversationId,
        mockScore,
      );

      const result =
        await mockContextManager.calculateRelevanceScore(conversationId);

      expect(result).toBe(mockScore);
    });

    it('should set and retrieve mock results for summarizeContext', async () => {
      const conversationId = 'test-conv';
      const mockSummary = 'Custom conversation summary with specific details';

      mockContextManager.setMockResult(
        'summarizeContext',
        conversationId,
        mockSummary,
      );

      const result = await mockContextManager.summarizeContext(conversationId);

      expect(result).toBe(mockSummary);
    });
  });

  describe('default behavior without mocks', () => {
    it('should return default result for optimizeContext', async () => {
      const input: ContextOptimizationInput = {
        turnCount: 10,
        totalTokens: 5000,
        maxTokens: 4000,
      };

      const result = await mockContextManager.optimizeContext(input);

      expect(result.shouldTruncate).toBe(true); // 5000 > 4000
      expect(result.relevanceScore).toBe(0.75);
      expect(result.recommendedSummary).toBe('Mock context summary');
    });

    it('should return default result for truncateContext', async () => {
      const result = await mockContextManager.truncateContext('conv-id', 5000);

      expect(result.tokensRemoved).toBe(500);
      expect(result.turnsRemoved).toBe(3);
      expect(result.summaryCreated).toBe('Mock truncation summary');
    });

    it('should return default result for calculateRelevanceScore', async () => {
      const result =
        await mockContextManager.calculateRelevanceScore('conv-id');

      expect(result).toBe(0.8);
    });

    it('should return default result for summarizeContext', async () => {
      const result = await mockContextManager.summarizeContext('conv-id');

      expect(result).toBe('Mock conversation summary');
    });
  });

  describe('key generation and isolation', () => {
    it('should isolate results by conversation ID', async () => {
      const conv1 = 'conversation-1';
      const conv2 = 'conversation-2';

      mockContextManager.setMockResult('calculateRelevanceScore', conv1, 0.9);
      mockContextManager.setMockResult('calculateRelevanceScore', conv2, 0.3);

      const result1 = await mockContextManager.calculateRelevanceScore(conv1);
      const result2 = await mockContextManager.calculateRelevanceScore(conv2);

      expect(result1).toBe(0.9);
      expect(result2).toBe(0.3);
    });

    it('should isolate results by method name', async () => {
      const conversationId = 'same-conv';

      mockContextManager.setMockResult(
        'calculateRelevanceScore',
        conversationId,
        0.9,
      );
      mockContextManager.setMockResult(
        'summarizeContext',
        conversationId,
        'Custom summary',
      );

      const relevanceScore =
        await mockContextManager.calculateRelevanceScore(conversationId);
      const summary = await mockContextManager.summarizeContext(conversationId);

      expect(relevanceScore).toBe(0.9);
      expect(summary).toBe('Custom summary');
    });
  });

  describe('integration with optimizeContext logic', () => {
    it('should properly evaluate shouldTruncate in default behavior', async () => {
      const testCases = [
        { totalTokens: 3000, maxTokens: 5000, expectedTruncate: false },
        { totalTokens: 7000, maxTokens: 5000, expectedTruncate: true },
        { totalTokens: 5000, maxTokens: 5000, expectedTruncate: false },
      ];

      for (const testCase of testCases) {
        const input: ContextOptimizationInput = {
          turnCount: 10,
          totalTokens: testCase.totalTokens,
          maxTokens: testCase.maxTokens,
        };

        const result = await mockContextManager.optimizeContext(input);

        expect(result.shouldTruncate).toBe(testCase.expectedTruncate);
      }
    });
  });
});

describe('Context Manager Interface Compliance', () => {
  let realManager: IContextManager;
  let mockManager: IContextManager;

  beforeEach(() => {
    realManager = new ConversationContextManager();
    mockManager = new MockContextManager();
  });

  it('should have both managers implement the same interface', async () => {
    const input: ContextOptimizationInput = {
      turnCount: 10,
      totalTokens: 5000,
      maxTokens: 8000,
    };

    // Both should be callable with the same interface
    const realResult = await realManager.optimizeContext(input);
    const mockResult = await mockManager.optimizeContext(input);

    // Verify structure compliance
    expect(realResult).toHaveProperty('shouldTruncate');
    expect(realResult).toHaveProperty('relevanceScore');
    expect(mockResult).toHaveProperty('shouldTruncate');
    expect(mockResult).toHaveProperty('relevanceScore');

    expect(typeof realResult.shouldTruncate).toBe('boolean');
    expect(typeof realResult.relevanceScore).toBe('number');
    expect(typeof mockResult.shouldTruncate).toBe('boolean');
    expect(typeof mockResult.relevanceScore).toBe('number');
  });

  it('should support contract substitution for testing', async () => {
    const managers: IContextManager[] = [realManager, mockManager];

    for (const manager of managers) {
      const relevanceScore = await manager.calculateRelevanceScore('test-conv');
      const summary = await manager.summarizeContext('test-conv');
      const truncationResult = await manager.truncateContext('test-conv', 5000);

      expect(typeof relevanceScore).toBe('number');
      expect(typeof summary).toBe('string');
      expect(truncationResult).toHaveProperty('tokensRemoved');
      expect(truncationResult).toHaveProperty('turnsRemoved');
    }
  });
});
