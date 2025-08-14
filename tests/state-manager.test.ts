import { describe, it, expect } from 'vitest';
import { ConversationStateManager } from '@/lib/ai/responses/state';

describe('ConversationStateManager', () => {
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
