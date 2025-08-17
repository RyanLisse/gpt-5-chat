// AGENT 3: Database Persistence Implementation for London School TDD
import { eq, lt, sql } from 'drizzle-orm';
import { db } from '../../db/client';
import { conversationState as conversationStateTable } from '../../db/schema';
import type { ConversationState, IPersistenceProvider } from './types';

export class DatabasePersistenceProvider implements IPersistenceProvider {
  async saveConversation(
    _conversationId: string,
    state: ConversationState,
  ): Promise<void> {
    if (!state.userId) {
      throw new Error('User ID is required for saving conversation state');
    }

    const dbState = {
      conversationId: state.conversationId,
      userId: state.userId,
      previousResponseId: state.previousResponseId || null,
      contextMetadata: state.contextMetadata || null,
      createdAt: state.createdAt ? new Date(state.createdAt) : new Date(),
      updatedAt: new Date(),
      version: state.version || 1,
    };

    await db
      .insert(conversationStateTable)
      .values(dbState)
      .onConflictDoUpdate({
        target: conversationStateTable.conversationId,
        set: {
          previousResponseId: dbState.previousResponseId,
          contextMetadata: dbState.contextMetadata,
          updatedAt: dbState.updatedAt,
          version: sql`${conversationStateTable.version} + 1`,
        },
      });
  }

  async getConversation(
    conversationId: string,
  ): Promise<ConversationState | null> {
    const result = await db
      .select()
      .from(conversationStateTable)
      .where(eq(conversationStateTable.conversationId, conversationId))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    const dbState = result[0];
    return {
      conversationId: dbState.conversationId,
      userId: dbState.userId,
      previousResponseId: dbState.previousResponseId,
      contextMetadata:
        dbState.contextMetadata as ConversationState['contextMetadata'],
      createdAt: dbState.createdAt.toISOString(),
      updatedAt: dbState.updatedAt.toISOString(),
      version: dbState.version,
    };
  }

  async deleteConversation(conversationId: string): Promise<void> {
    await db
      .delete(conversationStateTable)
      .where(eq(conversationStateTable.conversationId, conversationId));
  }

  async cleanupExpiredConversations(olderThanHours: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setHours(cutoffDate.getHours() - olderThanHours);

    const result = await db
      .delete(conversationStateTable)
      .where(lt(conversationStateTable.updatedAt, cutoffDate))
      .returning({ conversationId: conversationStateTable.conversationId });

    return result.length;
  }
}

// Mock implementation for testing
export class InMemoryPersistenceProvider implements IPersistenceProvider {
  private readonly store = new Map<string, ConversationState>();

  async saveConversation(
    conversationId: string,
    state: ConversationState,
  ): Promise<void> {
    this.store.set(conversationId, { ...state });
  }

  async getConversation(
    conversationId: string,
  ): Promise<ConversationState | null> {
    return this.store.get(conversationId) || null;
  }

  async deleteConversation(conversationId: string): Promise<void> {
    this.store.delete(conversationId);
  }

  async cleanupExpiredConversations(olderThanHours: number): Promise<number> {
    const cutoffTime = Date.now() - olderThanHours * 60 * 60 * 1000;
    let cleaned = 0;

    for (const [id, state] of Array.from(this.store.entries())) {
      if (state.updatedAt && new Date(state.updatedAt).getTime() < cutoffTime) {
        this.store.delete(id);
        cleaned++;
      }
    }

    return cleaned;
  }
}
