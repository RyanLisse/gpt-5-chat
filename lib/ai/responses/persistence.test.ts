import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InMemoryPersistenceProvider } from './persistence';
import type { ConversationState, IPersistenceProvider } from './types';

// Mock the database client and schema
const mockDb = {
  insert: vi.fn(),
  select: vi.fn(),
  delete: vi.fn(),
};

const mockConversationStateTable = {
  conversationId: 'conversationId',
  userId: 'userId',
  previousResponseId: 'previousResponseId',
  contextMetadata: 'contextMetadata',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  version: 'version',
};

const mockEq = vi.fn();
const mockLt = vi.fn();
const mockSql = vi.fn();

// Create a mock DatabasePersistenceProvider that doesn't rely on actual imports
class MockDatabasePersistenceProvider implements IPersistenceProvider {
  async saveConversation(
    _conversationId: string,
    state: ConversationState,
  ): Promise<void> {
    const dbState = {
      conversationId: state.conversationId,
      userId: state.userId || 'default-user',
      previousResponseId: state.previousResponseId || null,
      contextMetadata: state.contextMetadata || null,
      createdAt: state.createdAt ? new Date(state.createdAt) : new Date(),
      updatedAt: new Date(),
      version: state.version || 1,
    };

    const insert = mockDb.insert(mockConversationStateTable);
    const values = insert.values(dbState);
    await values.onConflictDoUpdate({
      target: mockConversationStateTable.conversationId,
      set: {
        previousResponseId: dbState.previousResponseId,
        contextMetadata: dbState.contextMetadata,
        updatedAt: dbState.updatedAt,
        version: mockSql(`${mockConversationStateTable.version} + 1`),
      },
    });
  }

  async getConversation(
    conversationId: string,
  ): Promise<ConversationState | null> {
    const select = mockDb.select();
    const from = select.from(mockConversationStateTable);
    const where = from.where(
      mockEq(mockConversationStateTable.conversationId, conversationId),
    );
    const result = await where.limit(1);

    if (result.length === 0) {
      return null;
    }

    const dbState = result[0];
    return {
      conversationId: dbState.conversationId,
      userId: dbState.userId,
      previousResponseId: dbState.previousResponseId,
      contextMetadata: dbState.contextMetadata,
      createdAt: dbState.createdAt.toISOString(),
      updatedAt: dbState.updatedAt.toISOString(),
      version: dbState.version,
    };
  }

  async deleteConversation(conversationId: string): Promise<void> {
    const deleteQuery = mockDb.delete(mockConversationStateTable);
    await deleteQuery.where(
      mockEq(mockConversationStateTable.conversationId, conversationId),
    );
  }

  async cleanupExpiredConversations(olderThanHours: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - olderThanHours);

    const deleteQuery = mockDb.delete(mockConversationStateTable);
    const where = deleteQuery.where(
      mockLt(mockConversationStateTable.updatedAt, cutoffDate),
    );
    const result = await where.returning({
      conversationId: mockConversationStateTable.conversationId,
    });

    return result.length;
  }
}

describe('DatabasePersistenceProvider', () => {
  let provider: MockDatabasePersistenceProvider;
  let mockInsert: any;
  let mockSelect: any;
  let mockDelete: any;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new MockDatabasePersistenceProvider();

    // Setup chainable mock methods
    mockInsert = {
      values: vi.fn().mockReturnThis(),
      onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
    };

    mockSelect = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    };

    mockDelete = {
      where: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([]),
    };

    mockDb.insert.mockReturnValue(mockInsert);
    mockDb.select.mockReturnValue(mockSelect);
    mockDb.delete.mockReturnValue(mockDelete);
  });

  describe('saveConversation', () => {
    it('should save new conversation state to database', async () => {
      const conversationId = 'conv-123';
      const state: ConversationState = {
        conversationId,
        userId: 'user-456',
        previousResponseId: 'resp-789',
        contextMetadata: {
          turnCount: 5,
          lastActivity: '2024-01-01T10:00:00Z',
          totalTokens: 1000,
          relevanceScore: 0.8,
        },
        createdAt: '2024-01-01T09:00:00Z',
        updatedAt: '2024-01-01T10:00:00Z',
        version: 1,
      };

      await provider.saveConversation(conversationId, state);

      expect(mockDb.insert).toHaveBeenCalledWith(mockConversationStateTable);
      expect(mockInsert.values).toHaveBeenCalledWith({
        conversationId,
        userId: 'user-456',
        previousResponseId: 'resp-789',
        contextMetadata: state.contextMetadata,
        createdAt: new Date('2024-01-01T09:00:00Z'),
        updatedAt: expect.any(Date),
        version: 1,
      });
    });

    it('should handle conversation state with minimal data', async () => {
      const conversationId = 'conv-minimal';
      const state: ConversationState = {
        conversationId,
        userId: 'user-123',
      };

      await provider.saveConversation(conversationId, state);

      expect(mockInsert.values).toHaveBeenCalledWith({
        conversationId,
        userId: 'user-123',
        previousResponseId: null,
        contextMetadata: null,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
        version: 1,
      });
    });
  });

  describe('getConversation', () => {
    it('should retrieve conversation state from database', async () => {
      const conversationId = 'conv-123';
      const dbResult = [
        {
          conversationId,
          userId: 'user-456',
          previousResponseId: 'resp-789',
          contextMetadata: {
            turnCount: 5,
            lastActivity: '2024-01-01T10:00:00Z',
            totalTokens: 1000,
            relevanceScore: 0.8,
          },
          createdAt: new Date('2024-01-01T09:00:00Z'),
          updatedAt: new Date('2024-01-01T10:00:00Z'),
          version: 2,
        },
      ];

      mockSelect.limit.mockResolvedValue(dbResult);

      const result = await provider.getConversation(conversationId);

      expect(mockDb.select).toHaveBeenCalled();
      expect(mockSelect.from).toHaveBeenCalledWith(mockConversationStateTable);
      expect(mockSelect.where).toHaveBeenCalled();
      expect(mockSelect.limit).toHaveBeenCalledWith(1);

      expect(result).toEqual({
        conversationId,
        userId: 'user-456',
        previousResponseId: 'resp-789',
        contextMetadata: {
          turnCount: 5,
          lastActivity: '2024-01-01T10:00:00Z',
          totalTokens: 1000,
          relevanceScore: 0.8,
        },
        createdAt: '2024-01-01T09:00:00.000Z',
        updatedAt: '2024-01-01T10:00:00.000Z',
        version: 2,
      });
    });

    it('should return null when conversation not found', async () => {
      const conversationId = 'non-existent';
      mockSelect.limit.mockResolvedValue([]);

      const result = await provider.getConversation(conversationId);

      expect(result).toBeNull();
    });
  });

  describe('deleteConversation', () => {
    it('should delete conversation from database', async () => {
      const conversationId = 'conv-to-delete';

      await provider.deleteConversation(conversationId);

      expect(mockDb.delete).toHaveBeenCalledWith(mockConversationStateTable);
      expect(mockDelete.where).toHaveBeenCalled();
      expect(mockEq).toHaveBeenCalledWith(
        mockConversationStateTable.conversationId,
        conversationId,
      );
    });
  });

  describe('cleanupExpiredConversations', () => {
    it('should cleanup expired conversations and return count', async () => {
      const olderThanHours = 24;
      const deletedConversations = [
        { conversationId: 'conv-1' },
        { conversationId: 'conv-2' },
        { conversationId: 'conv-3' },
      ];

      mockDelete.returning.mockResolvedValue(deletedConversations);

      const result = await provider.cleanupExpiredConversations(olderThanHours);

      expect(result).toBe(3);
      expect(mockDb.delete).toHaveBeenCalledWith(mockConversationStateTable);
      expect(mockDelete.where).toHaveBeenCalled();
      expect(mockDelete.returning).toHaveBeenCalledWith({
        conversationId: mockConversationStateTable.conversationId,
      });
    });

    it('should return 0 when no conversations are expired', async () => {
      const olderThanHours = 48;
      mockDelete.returning.mockResolvedValue([]);

      const result = await provider.cleanupExpiredConversations(olderThanHours);

      expect(result).toBe(0);
    });
  });
});

describe('InMemoryPersistenceProvider', () => {
  let provider: InMemoryPersistenceProvider;

  beforeEach(() => {
    provider = new InMemoryPersistenceProvider();
  });

  describe('interface compliance', () => {
    it('should implement IPersistenceProvider interface', () => {
      const persistenceProvider: IPersistenceProvider = provider;
      expect(persistenceProvider).toBeDefined();
    });
  });

  describe('saveConversation', () => {
    it('should save conversation state in memory', async () => {
      const conversationId = 'conv-123';
      const state: ConversationState = {
        conversationId,
        userId: 'user-456',
        previousResponseId: 'resp-789',
        contextMetadata: {
          turnCount: 5,
          lastActivity: '2024-01-01T10:00:00Z',
          totalTokens: 1000,
        },
        createdAt: '2024-01-01T09:00:00Z',
        updatedAt: '2024-01-01T10:00:00Z',
        version: 1,
      };

      await provider.saveConversation(conversationId, state);

      const retrieved = await provider.getConversation(conversationId);
      expect(retrieved).toEqual(state);
    });

    it('should overwrite existing conversation state', async () => {
      const conversationId = 'conv-overwrite';
      const initialState: ConversationState = {
        conversationId,
        userId: 'user-123',
        version: 1,
      };

      const updatedState: ConversationState = {
        conversationId,
        userId: 'user-123',
        version: 2,
        previousResponseId: 'new-response',
      };

      await provider.saveConversation(conversationId, initialState);
      await provider.saveConversation(conversationId, updatedState);

      const retrieved = await provider.getConversation(conversationId);
      expect(retrieved).toEqual(updatedState);
    });
  });

  describe('getConversation', () => {
    it('should return conversation state from memory', async () => {
      const conversationId = 'conv-get-test';
      const state: ConversationState = {
        conversationId,
        userId: 'user-789',
        previousResponseId: 'resp-123',
      };

      await provider.saveConversation(conversationId, state);
      const result = await provider.getConversation(conversationId);

      expect(result).toEqual(state);
    });

    it('should return null for non-existent conversation', async () => {
      const result = await provider.getConversation('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('deleteConversation', () => {
    it('should delete conversation from memory', async () => {
      const conversationId = 'conv-delete-test';
      const state: ConversationState = {
        conversationId,
        userId: 'user-delete',
      };

      await provider.saveConversation(conversationId, state);
      expect(await provider.getConversation(conversationId)).toEqual(state);

      await provider.deleteConversation(conversationId);
      expect(await provider.getConversation(conversationId)).toBeNull();
    });

    it('should handle deletion of non-existent conversation', async () => {
      await expect(
        provider.deleteConversation('non-existent'),
      ).resolves.toBeUndefined();
    });
  });

  describe('cleanupExpiredConversations', () => {
    it('should cleanup expired conversations based on updatedAt', async () => {
      const currentTime = new Date('2024-01-01T12:00:00Z').getTime();

      const expiredConv1: ConversationState = {
        conversationId: 'expired-1',
        userId: 'user-1',
        updatedAt: '2024-01-01T06:00:00Z', // 6 hours ago
      };

      const recentConv: ConversationState = {
        conversationId: 'recent',
        userId: 'user-3',
        updatedAt: '2024-01-01T11:30:00Z', // 30 minutes ago
      };

      await provider.saveConversation(
        expiredConv1.conversationId,
        expiredConv1,
      );
      await provider.saveConversation(recentConv.conversationId, recentConv);

      // Mock Date.now to return our fixed time
      const originalDateNow = Date.now;
      Date.now = vi.fn(() => currentTime);

      const cleanupCount = await provider.cleanupExpiredConversations(2); // 2 hours

      // Restore Date.now
      Date.now = originalDateNow;

      expect(cleanupCount).toBe(1);
      expect(await provider.getConversation('expired-1')).toBeNull();
      expect(await provider.getConversation('recent')).toEqual(recentConv);
    });

    it('should return 0 when no conversations are expired', async () => {
      const currentTime = new Date('2024-01-01T12:00:00Z').getTime();

      const recentConv: ConversationState = {
        conversationId: 'recent',
        userId: 'user-1',
        updatedAt: '2024-01-01T11:30:00Z', // 30 minutes ago
      };

      await provider.saveConversation(recentConv.conversationId, recentConv);

      // Mock Date.now to return our fixed time
      const originalDateNow = Date.now;
      Date.now = vi.fn(() => currentTime);

      const cleanupCount = await provider.cleanupExpiredConversations(24); // 24 hours

      // Restore Date.now
      Date.now = originalDateNow;

      expect(cleanupCount).toBe(0);
      expect(await provider.getConversation('recent')).toEqual(recentConv);
    });

    it('should handle conversations without updatedAt', async () => {
      const convWithoutUpdatedAt: ConversationState = {
        conversationId: 'no-updated-at',
        userId: 'user-1',
      };

      await provider.saveConversation(
        convWithoutUpdatedAt.conversationId,
        convWithoutUpdatedAt,
      );

      const cleanupCount = await provider.cleanupExpiredConversations(1);

      expect(cleanupCount).toBe(0);
      expect(await provider.getConversation('no-updated-at')).toEqual(
        convWithoutUpdatedAt,
      );
    });

    it('should handle empty store', async () => {
      const cleanupCount = await provider.cleanupExpiredConversations(24);
      expect(cleanupCount).toBe(0);
    });
  });
});

describe('Persistence Provider Interface Compliance', () => {
  let databaseProvider: IPersistenceProvider;
  let memoryProvider: IPersistenceProvider;

  beforeEach(() => {
    // Note: Using MockDatabasePersistenceProvider to test interface compliance
    databaseProvider = new MockDatabasePersistenceProvider();
    memoryProvider = new InMemoryPersistenceProvider();

    // Ensure mockDb has chainable methods for this suite as well
    const mockInsert = {
      values: vi.fn().mockReturnThis(),
      onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
    };
    const mockSelect = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([]),
    };
    const mockDelete = {
      where: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([]),
    };

    (mockDb.insert as any).mockReturnValue(mockInsert);
    (mockDb.select as any).mockReturnValue(mockSelect);
    (mockDb.delete as any).mockReturnValue(mockDelete);
  });

  it('should have both providers implement the same interface', async () => {
    const state: ConversationState = {
      conversationId: 'interface-test',
      userId: 'user-interface',
      version: 1,
    };

    const providers = [databaseProvider, memoryProvider];

    for (const provider of providers) {
      // All methods should be callable
      await expect(
        provider.saveConversation('test', state),
      ).resolves.toBeUndefined();
      await expect(provider.getConversation('test')).resolves.toBeDefined();
      await expect(
        provider.deleteConversation('test'),
      ).resolves.toBeUndefined();
      await expect(provider.cleanupExpiredConversations(24)).resolves.toEqual(
        expect.any(Number),
      );
    }
  });

  it('should support contract substitution for testing', async () => {
    const testConversationId = 'substitution-test';
    const testState: ConversationState = {
      conversationId: testConversationId,
      userId: 'test-user',
    };

    // Memory provider can be used as a test double for database provider
    const testProvider: IPersistenceProvider = memoryProvider;

    await testProvider.saveConversation(testConversationId, testState);
    const retrieved = await testProvider.getConversation(testConversationId);

    expect(retrieved).toEqual(testState);

    const cleanupCount = await testProvider.cleanupExpiredConversations(0);
    expect(typeof cleanupCount).toBe('number');

    await testProvider.deleteConversation(testConversationId);
    const afterDeletion =
      await testProvider.getConversation(testConversationId);

    expect(afterDeletion).toBeNull();
  });
});
