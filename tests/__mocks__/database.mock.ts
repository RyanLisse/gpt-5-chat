// TDD London School: Lightweight database mocks
// Focus: Fast behavior verification without real database operations

import { vi } from 'vitest';
import type { Chat, DBMessage, User, Vote } from '@/lib/db/schema';

// Mock contracts for database behavior
export type MockDatabaseState = {
  users: Map<string, User>;
  chats: Map<string, Chat>;
  messages: Map<string, DBMessage>;
  votes: Map<string, Vote>;
};

// London School: Mock Database with behavior verification
export class MockDatabase {
  private state!: MockDatabaseState;

  // Spy functions for behavior verification
  public insertSpy = vi.fn();
  public selectSpy = vi.fn();
  public updateSpy = vi.fn();
  public deleteSpy = vi.fn();

  constructor() {
    this.reset();
  }

  reset() {
    this.state = {
      users: new Map(),
      chats: new Map(),
      messages: new Map(),
      votes: new Map(),
    };

    this.insertSpy.mockClear();
    this.selectSpy.mockClear();
    this.updateSpy.mockClear();
    this.deleteSpy.mockClear();
  }

  get dbState(): MockDatabaseState {
    return this.state;
  }

  // Mock user operations - TDD London School: Strict validation
  async createUser(userData: Partial<User>): Promise<User> {
    this.insertSpy('users', userData);

    // Validate required fields
    if (!userData.email) {
      throw new Error('User creation requires email');
    }

    const user: User = {
      id: `user_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      email: userData.email,
      name: userData.name || 'Test User',
      image: userData.image || null,
      credits: userData.credits ?? 100,
      reservedCredits: userData.reservedCredits ?? 0,
      createdAt: userData.createdAt || new Date(),
      ...userData,
    } as User;

    this.state.users.set(user.id, user);

    // TDD London School: Verify state consistency immediately
    const stored = this.state.users.get(user.id);
    if (!stored || stored.email !== userData.email) {
      throw new Error(`Failed to store user ${userData.email} properly`);
    }

    return user;
  }

  async getUserById(id: string): Promise<User | null> {
    this.selectSpy('users', { id });
    return this.state.users.get(id) || null;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    this.selectSpy('users', { email });

    // TDD London School: Defensive programming with detailed diagnostics
    if (!email) {
      throw new Error('getUserByEmail requires email parameter');
    }

    for (const user of this.state.users.values()) {
      if (user.email === email) {
        return user;
      }
    }

    // Enhanced debugging for failed lookups
    const totalUsers = this.state.users.size;
    const sampleEmails = Array.from(this.state.users.values())
      .slice(0, 5)
      .map((u) => u.email);

    console.debug(
      `getUserByEmail('${email}') failed. Total users: ${totalUsers}, Sample emails:`,
      sampleEmails,
    );
    return null;
  }

  // Mock chat operations - TDD London School: Proper schema compliance
  async createChat(chatData: Partial<Chat>): Promise<Chat> {
    this.insertSpy('chats', chatData);

    // Validate required fields
    if (!chatData.userId) {
      throw new Error('Chat creation requires userId');
    }
    if (!chatData.title) {
      throw new Error('Chat creation requires title');
    }

    const chat: Chat = {
      id: `chat_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      title: chatData.title,
      userId: chatData.userId,
      visibility: chatData.visibility || 'private',
      isPinned: chatData.isPinned ?? false,
      createdAt: chatData.createdAt || new Date(),
      updatedAt: chatData.updatedAt || new Date(),
      ...chatData,
    } as Chat;

    this.state.chats.set(chat.id, chat);
    return chat;
  }

  async getChatById(id: string): Promise<Chat | null> {
    this.selectSpy('chats', { id });
    return this.state.chats.get(id) || null;
  }

  async getChatsByUserId(userId: string): Promise<Chat[]> {
    this.selectSpy('chats', { userId });
    return Array.from(this.state.chats.values())
      .filter((chat) => chat.userId === userId)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  async updateChat(id: string, updates: Partial<Chat>): Promise<Chat | null> {
    this.updateSpy('chats', id, updates);

    const chat = this.state.chats.get(id);
    if (!chat) {
      return null;
    }

    const updatedChat = { ...chat, ...updates, updatedAt: new Date() };
    this.state.chats.set(id, updatedChat);
    return updatedChat;
  }

  // Mock message operations
  async createMessage(messageData: Partial<DBMessage>): Promise<DBMessage> {
    this.insertSpy('messages', messageData);

    const message: DBMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      chatId: messageData.chatId || 'test_chat',
      role: messageData.role || 'user',
      parts: messageData.parts || [],
      attachments: messageData.attachments || [],
      createdAt: new Date(),
      annotations: messageData.annotations || null,
      isPartial: messageData.isPartial ?? false,
      parentMessageId: messageData.parentMessageId || null,
      selectedModel: messageData.selectedModel || '',
      selectedTool: messageData.selectedTool || '',
      ...messageData,
    } as DBMessage;

    this.state.messages.set(message.id, message);
    return message;
  }

  async getMessagesByChatId(chatId: string): Promise<DBMessage[]> {
    this.selectSpy('messages', { chatId });
    return Array.from(this.state.messages.values())
      .filter((msg) => msg.chatId === chatId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async getMessageById(id: string): Promise<DBMessage | null> {
    this.selectSpy('messages', { id });
    return this.state.messages.get(id) || null;
  }

  // Mock vote operations
  async createVote(voteData: Partial<Vote>): Promise<Vote> {
    this.insertSpy('votes', voteData);

    const vote: Vote = {
      chatId: voteData.chatId || 'test_chat',
      messageId: voteData.messageId || 'test_message',
      isUpvoted: voteData.isUpvoted ?? true,
      ...voteData,
    } as Vote;

    const voteKey = `${vote.chatId}_${vote.messageId}`;
    this.state.votes.set(voteKey, vote);
    return vote;
  }

  async getVoteByChatAndMessage(
    chatId: string,
    messageId: string,
  ): Promise<Vote | null> {
    this.selectSpy('votes', { chatId, messageId });
    const voteKey = `${chatId}_${messageId}`;
    return this.state.votes.get(voteKey) || null;
  }

  async updateVote(id: string, updates: Partial<Vote>): Promise<Vote | null> {
    this.updateSpy('votes', id, updates);

    const vote = this.state.votes.get(id);
    if (!vote) {
      return null;
    }

    const updatedVote = { ...vote, ...updates };
    this.state.votes.set(id, updatedVote);
    return updatedVote;
  }

  // Behavior verification helpers
  getInsertCalls() {
    return this.insertSpy.mock.calls;
  }

  getSelectCalls() {
    return this.selectSpy.mock.calls;
  }

  getUpdateCalls() {
    return this.updateSpy.mock.calls;
  }

  getDeleteCalls() {
    return this.deleteSpy.mock.calls;
  }

  // Test data setup helpers
  async seedTestData() {
    const user = await this.createUser({
      email: 'test@example.com',
      name: 'Test User',
    });

    const chat = await this.createChat({
      title: 'Test Chat',
      userId: user.id,
    });

    const userMessage = await this.createMessage({
      chatId: chat.id,
      role: 'user',
      parts: [{ type: 'text', text: 'Test user message' }],
    });

    const assistantMessage = await this.createMessage({
      chatId: chat.id,
      role: 'assistant',
      parts: [{ type: 'text', text: 'Test assistant response' }],
    });

    return { user, chat, userMessage, assistantMessage };
  }
}

// Export singleton for consistent behavior across tests
export const mockDatabase = new MockDatabase();

// London School: Mock query builders for fast execution
export const createMockQueryResult = <T>(
  data: T[],
): { rows: T[]; rowCount: number } => ({
  rows: data,
  rowCount: data.length,
});

// Mock Drizzle ORM operations
export const mockDrizzleDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  execute: vi.fn(),
  returning: vi.fn().mockReturnThis(),
};
