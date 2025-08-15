import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConversationStateManager } from '@/lib/ai/responses/state';

// Mock interfaces for London School TDD approach
const mockPersistenceProvider = {
  saveConversation: vi.fn(),
  getConversation: vi.fn(),
  deleteConversation: vi.fn(),
  cleanupExpiredConversations: vi.fn(),
};

const mockContextManager = {
  optimizeContext: vi.fn(),
  truncateContext: vi.fn(),
  calculateRelevanceScore: vi.fn(),
  summarizeContext: vi.fn(),
};

const _mockResponsesAPI = {
  continueConversation: vi.fn(),
  getResponse: vi.fn(),
};

describe('ConversationStateManager - London School TDD', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic State Management (Legacy)', () => {
    it('creates a new conversation and persists state', async () => {
      const mgr = new ConversationStateManager();
      const state = await mgr.createConversation('user_1');
      expect(state.conversationId).toMatch(/^conv_/);
      expect(state.previousResponseId).toBeNull();

      const fetched = await mgr.getConversationState(state.conversationId);
      expect(fetched).toEqual(state);
    });

    it('continues a conversation producing a request with previousResponseId', async () => {
      const mgr = new ConversationStateManager();
      const state = await mgr.createConversation('user_1');

      // Simulate we got a response id back from API
      const newState = { ...state, previousResponseId: 'resp_123' };
      await mgr.saveConversationState(state.conversationId, newState);

      const req = await mgr.continueConversation('resp_123', 'hello again');
      expect(req.previousResponseId).toBe('resp_123');
      expect(req.model).toBe('gpt-4o-mini');
      expect(req.store).toBe(true);
    });
  });

  describe('AGENT 1: Acceptance Tests - Stateful Conversation Management', () => {
    it('should maintain conversation state across system restarts', async () => {
      // London School TDD: Verify behavior through mocks and interaction testing
      mockPersistenceProvider.saveConversation.mockResolvedValue(void 0);

      const mgr = new ConversationStateManager(
        mockPersistenceProvider,
        mockContextManager,
      );

      // User starts conversation
      const initialState = await mgr.createConversation('user_1');

      // Verify persistence was called during creation
      expect(mockPersistenceProvider.saveConversation).toHaveBeenCalledWith(
        initialState.conversationId,
        expect.objectContaining({
          conversationId: initialState.conversationId,
          userId: 'user_1',
          previousResponseId: null,
        }),
      );

      // Setup mock to return the created state
      mockPersistenceProvider.getConversation.mockResolvedValue(initialState);

      // Simulate system restart by creating new manager instance
      const newMgr = new ConversationStateManager(
        mockPersistenceProvider,
        mockContextManager,
      );

      // Should retrieve persisted state
      const recoveredState = await newMgr.getConversationState(
        initialState.conversationId,
      );

      expect(mockPersistenceProvider.getConversation).toHaveBeenCalledWith(
        initialState.conversationId,
      );
      expect(recoveredState).toBeDefined();
      expect(recoveredState?.conversationId).toBe(initialState.conversationId);
      expect(recoveredState?.userId).toBe('user_1');
    });

    it('should chain response_id references across multiple turns', async () => {
      const mgr = new ConversationStateManager(
        mockPersistenceProvider,
        mockContextManager,
      );

      mockPersistenceProvider.saveConversation.mockResolvedValue(void 0);

      // First turn
      const state = await mgr.createConversation('user_1');
      const _turn1Request = await mgr.continueConversation(null, 'Hello');

      // Mock getConversation to return current state for updates
      mockPersistenceProvider.getConversation.mockResolvedValue(state);

      // Mock API response
      const turn1Response = { id: 'resp_turn1', content: 'Hi there!' };
      await mgr.updateConversationWithResponse(
        state.conversationId,
        turn1Response,
      );

      // Update mock to return state with first response
      const stateAfterTurn1 = { ...state, previousResponseId: 'resp_turn1' };
      mockPersistenceProvider.getConversation.mockResolvedValue(
        stateAfterTurn1,
      );

      // Second turn - should reference first response
      const turn2Request = await mgr.continueConversation(
        'resp_turn1',
        'How are you?',
      );
      expect(turn2Request.previousResponseId).toBe('resp_turn1');

      // Third turn - should reference second response
      const turn2Response = { id: 'resp_turn2', content: 'I am doing well!' };
      await mgr.updateConversationWithResponse(
        state.conversationId,
        turn2Response,
      );

      const turn3Request = await mgr.continueConversation(
        'resp_turn2',
        'Great!',
      );
      expect(turn3Request.previousResponseId).toBe('resp_turn2');

      // Verify persistence was called: 1 for creation + 2 for updates = 3 total
      expect(mockPersistenceProvider.saveConversation).toHaveBeenCalledTimes(3);

      // Verify the chain of response IDs through the updateConversationWithResponse calls
      expect(mockPersistenceProvider.saveConversation).toHaveBeenCalledWith(
        state.conversationId,
        expect.objectContaining({ previousResponseId: 'resp_turn1' }),
      );
      expect(mockPersistenceProvider.saveConversation).toHaveBeenCalledWith(
        state.conversationId,
        expect.objectContaining({ previousResponseId: 'resp_turn2' }),
      );
    });

    it('should optimize context for long conversations', async () => {
      const mgr = new ConversationStateManager(
        mockPersistenceProvider,
        mockContextManager,
      );

      mockPersistenceProvider.saveConversation.mockResolvedValue(void 0);
      mockContextManager.optimizeContext.mockResolvedValue({
        shouldTruncate: true,
        relevanceScore: 0.85,
        recommendedSummary:
          'User discussed project requirements and technical implementation.',
        tokensToRemove: 4000,
      });

      const state = await mgr.createConversation('user_1');

      // Mock getConversation to return state for context optimization
      mockPersistenceProvider.getConversation.mockResolvedValue({
        ...state,
        contextMetadata: {
          turnCount: 25,
          totalTokens: 12_000,
          lastActivity: new Date().toISOString(),
        },
      });

      // Simulate long conversation requiring context optimization
      await mgr.optimizeConversationContext(state.conversationId, {
        turnCount: 25,
        totalTokens: 12_000,
        maxTokens: 8000,
      });

      // Verify context manager was called with correct parameters
      expect(mockContextManager.optimizeContext).toHaveBeenCalledWith(
        expect.objectContaining({
          conversationId: state.conversationId,
          turnCount: 25,
          totalTokens: 12_000,
          maxTokens: 8000,
        }),
      );

      // Verify state was updated with optimization results
      expect(mockPersistenceProvider.saveConversation).toHaveBeenCalledWith(
        state.conversationId,
        expect.objectContaining({
          contextMetadata: expect.objectContaining({
            relevanceScore: 0.85,
          }),
        }),
      );
    });

    it('should handle concurrent conversation access safely', async () => {
      const mgr = new ConversationStateManager(
        mockPersistenceProvider,
        mockContextManager,
      );

      mockPersistenceProvider.saveConversation.mockResolvedValue(void 0);

      const initialState = {
        conversationId: 'conv_concurrent_123',
        userId: 'user_1',
        previousResponseId: 'resp_initial',
        version: 1,
        contextMetadata: {
          turnCount: 1,
          lastActivity: new Date().toISOString(),
          totalTokens: 100,
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockPersistenceProvider.getConversation.mockResolvedValue(initialState);

      // Simulate concurrent conversation updates (more realistic than just continueConversation calls)
      const concurrentResponses = [
        { id: 'resp_concurrent_1', content: 'Response 1' },
        { id: 'resp_concurrent_2', content: 'Response 2' },
        { id: 'resp_concurrent_3', content: 'Response 3' },
      ];

      const promises = concurrentResponses.map((response) =>
        mgr.updateConversationWithResponse('conv_concurrent_123', response),
      );

      // All concurrent updates should complete successfully
      await Promise.all(promises);

      // Verify persistence was called for each concurrent update
      expect(mockPersistenceProvider.saveConversation).toHaveBeenCalledTimes(3);
      expect(mockPersistenceProvider.getConversation).toHaveBeenCalledTimes(3);

      // Verify each call updated the conversation with the respective response
      concurrentResponses.forEach((response) => {
        expect(mockPersistenceProvider.saveConversation).toHaveBeenCalledWith(
          'conv_concurrent_123',
          expect.objectContaining({
            previousResponseId: response.id,
            version: expect.any(Number),
          }),
        );
      });
    });
  });
});
