import type {
  ContextOptimizationInput,
  ConversationResponse,
  ConversationState,
  IContextManager,
  IPersistenceProvider,
  ResponseRequest,
} from './types';

export class ConversationStateManager {
  private readonly store = new Map<string, ConversationState>();
  private readonly persistenceProvider?: IPersistenceProvider;
  private readonly contextManager?: IContextManager;

  constructor(
    persistenceProvider?: IPersistenceProvider,
    contextManager?: IContextManager,
  ) {
    this.persistenceProvider = persistenceProvider;
    this.contextManager = contextManager;
  }

  async createConversation(userId: string): Promise<ConversationState> {
    const id = `conv_${Math.random().toString(36).slice(2)}`;
    const now = new Date().toISOString();

    const state: ConversationState = {
      conversationId: id,
      previousResponseId: null,
      userId,
      contextMetadata: {
        turnCount: 0,
        lastActivity: now,
        totalTokens: 0,
      },
      createdAt: now,
      updatedAt: now,
      version: 1,
    };

    // Use persistence provider if available, otherwise fallback to in-memory
    if (this.persistenceProvider) {
      await this.persistenceProvider.saveConversation(id, state);
    } else {
      this.store.set(id, state);
    }

    return state;
  }

  async continueConversation(
    responseId: string | null,
    input: string,
  ): Promise<ResponseRequest> {
    // For now, return a minimal request with previousResponseId set; model is required by caller
    return {
      model: 'gpt-4o-mini',
      input,
      previousResponseId: responseId || undefined,
      store: true,
    };
  }

  async getConversationState(
    conversationId: string,
  ): Promise<ConversationState | undefined> {
    // Try persistence provider first, then fallback to in-memory
    if (this.persistenceProvider) {
      const state =
        await this.persistenceProvider.getConversation(conversationId);
      return state || undefined;
    }
    return this.store.get(conversationId);
  }

  async saveConversationState(
    conversationId: string,
    state: ConversationState,
  ): Promise<void> {
    const updatedState = {
      ...state,
      updatedAt: new Date().toISOString(),
      version: (state.version || 0) + 1,
    };

    if (this.persistenceProvider) {
      await this.persistenceProvider.saveConversation(
        conversationId,
        updatedState,
      );
    } else {
      this.store.set(conversationId, updatedState);
    }
  }

  // AGENT 1: New methods expected by acceptance tests (will initially fail)
  async updateConversationWithResponse(
    conversationId: string,
    response: ConversationResponse,
  ): Promise<void> {
    const currentState = await this.getConversationState(conversationId);
    if (!currentState) {
      throw new Error(`Conversation ${conversationId} not found`);
    }

    const updatedState: ConversationState = {
      ...currentState,
      previousResponseId: response.id,
      contextMetadata: {
        ...currentState.contextMetadata!,
        turnCount: (currentState.contextMetadata?.turnCount || 0) + 1,
        lastActivity: new Date().toISOString(),
        totalTokens:
          (currentState.contextMetadata?.totalTokens || 0) +
          (response.content?.length || 0),
      },
    };

    await this.saveConversationState(conversationId, updatedState);
  }

  async optimizeConversationContext(
    conversationId: string,
    optimization: ContextOptimizationInput,
  ): Promise<void> {
    if (!this.contextManager) {
      throw new Error('ContextManager not provided - cannot optimize context');
    }

    const result = await this.contextManager.optimizeContext({
      ...optimization,
      conversationId,
    });

    if (result.shouldTruncate) {
      // Update conversation state with optimization results
      const currentState = await this.getConversationState(conversationId);
      if (currentState?.contextMetadata) {
        currentState.contextMetadata.relevanceScore = result.relevanceScore;
        await this.saveConversationState(conversationId, currentState);
      }
    }
  }
}
