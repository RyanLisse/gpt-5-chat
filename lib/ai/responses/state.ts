import type { ConversationState, ResponseRequest } from './types';

export class ConversationStateManager {
  private store = new Map<string, ConversationState>();

  async createConversation(userId: string): Promise<ConversationState> {
    const id = `conv_${Math.random().toString(36).slice(2)}`;
    const state: ConversationState = { conversationId: id, previousResponseId: null };
    this.store.set(id, state);
    return state;
  }

  async continueConversation(responseId: string, input: string): Promise<ResponseRequest> {
    // For now, return a minimal request with previousResponseId set; model is required by caller
    return {
      model: 'gpt-4o-mini',
      input,
      previousResponseId: responseId,
      store: true,
    };
  }

  async getConversationState(conversationId: string): Promise<ConversationState | undefined> {
    return this.store.get(conversationId);
  }

  async saveConversationState(conversationId: string, state: ConversationState): Promise<void> {
    this.store.set(conversationId, state);
  }
}
