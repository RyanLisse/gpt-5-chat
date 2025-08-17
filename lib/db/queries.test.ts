import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock functions for database operations (keep as vi.Mock to preserve helper methods)
const mockWhere = vi.fn(async () => [] as any[]);
const mockFrom = vi.fn(() => ({ where: mockWhere }));
const mockSelect = vi.fn(() => ({ from: mockFrom }));
const mockValues = vi.fn(async () => {});
const mockInsert = vi.fn(() => ({ values: mockValues }));
const mockSet = vi.fn(() => ({ where: mockWhere }));
const mockUpdate = vi.fn(() => ({ set: mockSet }));
const mockDeleteFn = vi.fn(() => ({ where: mockWhere }));
const mockDel = vi.fn();

// Mock database object
const mockDb = {
  select: mockSelect,
  insert: mockInsert,
  update: mockUpdate,
  delete: mockDeleteFn,
};

// Test wrapper class for database queries
class TestableQueries {
  constructor(
    private db: any,
    private delFn: any,
    private drizzleOps: any,
  ) {}

  async getUserByEmail(email: string) {
    try {
      return await this.db
        .select()
        .from('user')
        .where(this.drizzleOps.eq('user.email', email));
    } catch (error) {
      if (error instanceof Error && error.message.includes('unavailable')) {
        return [];
      }
      throw error;
    }
  }

  async createUser({
    email,
    name,
    image,
  }: {
    email: string;
    name: string | null;
    image: string | null;
  }) {
    return await this.db.insert('user').values({ email, name, image });
  }

  async saveChat({
    id,
    userId,
    title,
  }: {
    id: string;
    userId: string;
    title: string;
  }) {
    return await this.db.insert('chat').values({ id, userId, title });
  }

  async getChatsByUserId(userId: string) {
    return await this.db
      .select()
      .from('chat')
      .where(this.drizzleOps.eq('chat.userId', userId));
  }

  async getChatById(id: string) {
    return await this.db
      .select()
      .from('chat')
      .where(this.drizzleOps.eq('chat.id', id));
  }

  async saveMessage({
    chatId,
    role,
    parts,
    attachments,
  }: {
    chatId: string;
    role: string;
    parts: any[];
    attachments: any[];
  }) {
    return await this.db
      .insert('message')
      .values({ chatId, role, parts, attachments });
  }

  async getMessagesByChatId(chatId: string) {
    return await this.db
      .select()
      .from('message')
      .where(this.drizzleOps.eq('message.chatId', chatId));
  }

  async deleteChat(id: string) {
    return await this.db
      .delete('chat')
      .where(this.drizzleOps.eq('chat.id', id));
  }

  async deleteMessage(id: string) {
    return await this.db
      .delete('message')
      .where(this.drizzleOps.eq('message.id', id));
  }

  async saveDocument({
    id,
    title,
    content,
    kind,
    userId,
    messageId,
  }: {
    id: string;
    title: string;
    content: string;
    kind: string;
    userId: string;
    messageId: string;
  }) {
    return await this.db
      .insert('document')
      .values({ id, title, content, kind, userId, messageId });
  }

  async getDocumentsByUserId(userId: string) {
    return await this.db
      .select()
      .from('document')
      .where(this.drizzleOps.eq('document.userId', userId));
  }

  async saveVote({
    chatId,
    messageId,
    isUpvoted,
  }: {
    chatId: string;
    messageId: string;
    isUpvoted: boolean;
  }) {
    return await this.db
      .insert('vote')
      .values({ chatId, messageId, isUpvoted });
  }

  async getVoteByIds(chatId: string, messageId: string) {
    return await this.db
      .select()
      .from('vote')
      .where(
        this.drizzleOps.and(
          this.drizzleOps.eq('vote.chatId', chatId),
          this.drizzleOps.eq('vote.messageId', messageId),
        ),
      );
  }

  async saveSuggestion({
    documentId,
    originalText,
    suggestedText,
    userId,
  }: {
    documentId: string;
    originalText: string;
    suggestedText: string;
    userId: string;
  }) {
    return await this.db
      .insert('suggestion')
      .values({ documentId, originalText, suggestedText, userId });
  }

  async getSuggestionsByDocumentId(documentId: string) {
    return await this.db
      .select()
      .from('suggestion')
      .where(this.drizzleOps.eq('suggestion.documentId', documentId));
  }

  async deleteAttachmentByUrl(url: string) {
    try {
      await this.delFn(url);
      return { success: true };
    } catch (error) {
      return { success: false, error };
    }
  }
}

describe('Database Queries', () => {
  let testableQueries: TestableQueries;
  const mockDrizzleOps = {
    and: vi.fn(),
    asc: vi.fn(),
    desc: vi.fn(),
    eq: vi.fn(),
    gt: vi.fn(),
    gte: vi.fn(),
    inArray: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    testableQueries = new TestableQueries(mockDb, mockDel, mockDrizzleOps);
  });

  describe('User Operations', () => {
    it('should get user by email', async () => {
      const email = 'test@example.com';
      mockWhere.mockResolvedValueOnce([{ id: 'user-1', email }]);

      const result = await testableQueries.getUserByEmail(email);

      expect(mockSelect).toHaveBeenCalled();
      expect(mockFrom).toHaveBeenCalledWith('user');
      expect(mockDrizzleOps.eq).toHaveBeenCalledWith('user.email', email);
      expect(result).toEqual([{ id: 'user-1', email }]);
    });

    it('should handle database unavailable error gracefully', async () => {
      const email = 'test@example.com';
      const error = new Error('Database unavailable');
      mockWhere.mockRejectedValueOnce(error);

      const result = await testableQueries.getUserByEmail(email);

      expect(result).toEqual([]);
    });

    it('should propagate non-unavailable errors', async () => {
      const email = 'test@example.com';
      const error = new Error('Connection timeout');
      mockWhere.mockRejectedValueOnce(error);

      await expect(testableQueries.getUserByEmail(email)).rejects.toThrow(
        'Connection timeout',
      );
    });

    it('should create user', async () => {
      const userData = {
        email: 'new@example.com',
        name: 'New User',
        image: 'https://example.com/image.jpg',
      };

      await testableQueries.createUser(userData);

      expect(mockInsert).toHaveBeenCalledWith('user');
      expect(mockValues).toHaveBeenCalledWith(userData);
    });

    it('should create user with null values', async () => {
      const userData = {
        email: 'new@example.com',
        name: null,
        image: null,
      };

      await testableQueries.createUser(userData);

      expect(mockInsert).toHaveBeenCalledWith('user');
      expect(mockValues).toHaveBeenCalledWith(userData);
    });
  });

  describe('Chat Operations', () => {
    it('should save chat', async () => {
      const chatData = {
        id: 'chat-1',
        userId: 'user-1',
        title: 'Test Chat',
      };

      await testableQueries.saveChat(chatData);

      expect(mockInsert).toHaveBeenCalledWith('chat');
      expect(mockValues).toHaveBeenCalledWith(chatData);
    });

    it('should get chats by user ID', async () => {
      const userId = 'user-1';
      const expectedChats = [
        { id: 'chat-1', userId, title: 'Chat 1' },
        { id: 'chat-2', userId, title: 'Chat 2' },
      ];
      mockWhere.mockResolvedValueOnce(expectedChats);

      const result = await testableQueries.getChatsByUserId(userId);

      expect(mockSelect).toHaveBeenCalled();
      expect(mockFrom).toHaveBeenCalledWith('chat');
      expect(mockDrizzleOps.eq).toHaveBeenCalledWith('chat.userId', userId);
      expect(result).toEqual(expectedChats);
    });

    it('should get chat by ID', async () => {
      const chatId = 'chat-1';
      const expectedChat = { id: chatId, userId: 'user-1', title: 'Test Chat' };
      mockWhere.mockResolvedValueOnce([expectedChat]);

      const result = await testableQueries.getChatById(chatId);

      expect(mockSelect).toHaveBeenCalled();
      expect(mockFrom).toHaveBeenCalledWith('chat');
      expect(mockDrizzleOps.eq).toHaveBeenCalledWith('chat.id', chatId);
      expect(result).toEqual([expectedChat]);
    });

    it('should delete chat', async () => {
      const chatId = 'chat-1';

      await testableQueries.deleteChat(chatId);

      expect(mockDeleteFn).toHaveBeenCalledWith('chat');
      expect(mockDrizzleOps.eq).toHaveBeenCalledWith('chat.id', chatId);
    });
  });

  describe('Message Operations', () => {
    it('should save message', async () => {
      const messageData = {
        chatId: 'chat-1',
        role: 'user',
        parts: [{ type: 'text', text: 'Hello' }],
        attachments: [],
      };

      await testableQueries.saveMessage(messageData);

      expect(mockInsert).toHaveBeenCalledWith('message');
      expect(mockValues).toHaveBeenCalledWith(messageData);
    });

    it('should get messages by chat ID', async () => {
      const chatId = 'chat-1';
      const expectedMessages = [
        {
          id: 'msg-1',
          chatId,
          role: 'user',
          parts: [{ type: 'text', text: 'Hello' }],
        },
        {
          id: 'msg-2',
          chatId,
          role: 'assistant',
          parts: [{ type: 'text', text: 'Hi there!' }],
        },
      ];
      mockWhere.mockResolvedValueOnce(expectedMessages);

      const result = await testableQueries.getMessagesByChatId(chatId);

      expect(mockSelect).toHaveBeenCalled();
      expect(mockFrom).toHaveBeenCalledWith('message');
      expect(mockDrizzleOps.eq).toHaveBeenCalledWith('message.chatId', chatId);
      expect(result).toEqual(expectedMessages);
    });

    it('should delete message', async () => {
      const messageId = 'msg-1';

      await testableQueries.deleteMessage(messageId);

      expect(mockDeleteFn).toHaveBeenCalledWith('message');
      expect(mockDrizzleOps.eq).toHaveBeenCalledWith('message.id', messageId);
    });
  });

  describe('Document Operations', () => {
    it('should save document', async () => {
      const documentData = {
        id: 'doc-1',
        title: 'Test Document',
        content: 'Document content',
        kind: 'text',
        userId: 'user-1',
        messageId: 'msg-1',
      };

      await testableQueries.saveDocument(documentData);

      expect(mockInsert).toHaveBeenCalledWith('document');
      expect(mockValues).toHaveBeenCalledWith(documentData);
    });

    it('should get documents by user ID', async () => {
      const userId = 'user-1';
      const expectedDocuments = [
        { id: 'doc-1', title: 'Doc 1', userId },
        { id: 'doc-2', title: 'Doc 2', userId },
      ];
      mockWhere.mockResolvedValueOnce(expectedDocuments);

      const result = await testableQueries.getDocumentsByUserId(userId);

      expect(mockSelect).toHaveBeenCalled();
      expect(mockFrom).toHaveBeenCalledWith('document');
      expect(mockDrizzleOps.eq).toHaveBeenCalledWith('document.userId', userId);
      expect(result).toEqual(expectedDocuments);
    });
  });

  describe('Vote Operations', () => {
    it('should save vote', async () => {
      const voteData = {
        chatId: 'chat-1',
        messageId: 'msg-1',
        isUpvoted: true,
      };

      await testableQueries.saveVote(voteData);

      expect(mockInsert).toHaveBeenCalledWith('vote');
      expect(mockValues).toHaveBeenCalledWith(voteData);
    });

    it('should get vote by IDs', async () => {
      const chatId = 'chat-1';
      const messageId = 'msg-1';
      const expectedVote = { chatId, messageId, isUpvoted: true };
      mockWhere.mockResolvedValueOnce([expectedVote]);

      const result = await testableQueries.getVoteByIds(chatId, messageId);

      expect(mockSelect).toHaveBeenCalled();
      expect(mockFrom).toHaveBeenCalledWith('vote');
      expect(mockDrizzleOps.and).toHaveBeenCalled();
      expect(result).toEqual([expectedVote]);
    });
  });

  describe('Suggestion Operations', () => {
    it('should save suggestion', async () => {
      const suggestionData = {
        documentId: 'doc-1',
        originalText: 'Original text',
        suggestedText: 'Suggested text',
        userId: 'user-1',
      };

      await testableQueries.saveSuggestion(suggestionData);

      expect(mockInsert).toHaveBeenCalledWith('suggestion');
      expect(mockValues).toHaveBeenCalledWith(suggestionData);
    });

    it('should get suggestions by document ID', async () => {
      const documentId = 'doc-1';
      const expectedSuggestions = [
        {
          id: 'sug-1',
          documentId,
          originalText: 'Text 1',
          suggestedText: 'Suggested 1',
        },
        {
          id: 'sug-2',
          documentId,
          originalText: 'Text 2',
          suggestedText: 'Suggested 2',
        },
      ];
      mockWhere.mockResolvedValueOnce(expectedSuggestions);

      const result =
        await testableQueries.getSuggestionsByDocumentId(documentId);

      expect(mockSelect).toHaveBeenCalled();
      expect(mockFrom).toHaveBeenCalledWith('suggestion');
      expect(mockDrizzleOps.eq).toHaveBeenCalledWith(
        'suggestion.documentId',
        documentId,
      );
      expect(result).toEqual(expectedSuggestions);
    });
  });

  describe('Attachment Operations', () => {
    it('should delete attachment by URL successfully', async () => {
      const url = 'https://example.com/file.pdf';
      mockDel.mockResolvedValueOnce(undefined);

      const result = await testableQueries.deleteAttachmentByUrl(url);

      expect(mockDel).toHaveBeenCalledWith(url);
      expect(result).toEqual({ success: true });
    });

    it('should handle attachment deletion error', async () => {
      const url = 'https://example.com/file.pdf';
      const error = new Error('Blob deletion failed');
      mockDel.mockRejectedValueOnce(error);

      const result = await testableQueries.deleteAttachmentByUrl(url);

      expect(mockDel).toHaveBeenCalledWith(url);
      expect(result).toEqual({ success: false, error });
    });
  });

  describe('Database Query Patterns', () => {
    it('should handle complex where conditions', async () => {
      const chatId = 'chat-1';
      const messageId = 'msg-1';

      await testableQueries.getVoteByIds(chatId, messageId);

      expect(mockDrizzleOps.and).toHaveBeenCalled();
      expect(mockDrizzleOps.eq).toHaveBeenCalledWith('vote.chatId', chatId);
      expect(mockDrizzleOps.eq).toHaveBeenCalledWith(
        'vote.messageId',
        messageId,
      );
    });

    it('should support different data types in queries', async () => {
      const voteData = {
        chatId: 'chat-1',
        messageId: 'msg-1',
        isUpvoted: false, // boolean
      };

      await testableQueries.saveVote(voteData);

      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          isUpvoted: false,
        }),
      );
    });

    it('should handle JSON data in message parts', async () => {
      const messageData = {
        chatId: 'chat-1',
        role: 'user',
        parts: [
          { type: 'text', text: 'Hello' },
          { type: 'image', url: 'https://example.com/image.jpg' },
        ],
        attachments: [
          {
            name: 'file.pdf',
            url: 'https://example.com/file.pdf',
            contentType: 'application/pdf',
          },
        ],
      };

      await testableQueries.saveMessage(messageData);

      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          parts: expect.arrayContaining([
            expect.objectContaining({ type: 'text' }),
            expect.objectContaining({ type: 'image' }),
          ]),
          attachments: expect.arrayContaining([
            expect.objectContaining({ contentType: 'application/pdf' }),
          ]),
        }),
      );
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle empty results gracefully', async () => {
      const userId = 'non-existent-user';
      mockWhere.mockResolvedValueOnce([]);

      const result = await testableQueries.getChatsByUserId(userId);

      expect(result).toEqual([]);
    });

    it('should handle database connection errors', async () => {
      const email = 'test@example.com';
      const error = new Error('Connection refused');
      mockWhere.mockRejectedValueOnce(error);

      await expect(testableQueries.getUserByEmail(email)).rejects.toThrow(
        'Connection refused',
      );
    });

    it('should handle special characters in data', async () => {
      const userData = {
        email: 'test+tag@example.com',
        name: "O'Connor",
        image: 'https://example.com/path with spaces/image.jpg',
      };

      await testableQueries.createUser(userData);

      expect(mockValues).toHaveBeenCalledWith(userData);
    });

    it('should handle large JSON data', async () => {
      const largeData = {
        chatId: 'chat-1',
        role: 'assistant',
        parts: Array.from({ length: 100 }, (_, i) => ({
          type: 'text',
          text: `Part ${i}`,
        })),
        attachments: Array.from({ length: 10 }, (_, i) => ({
          name: `file${i}.txt`,
          url: `https://example.com/file${i}.txt`,
          contentType: 'text/plain',
        })),
      };

      await testableQueries.saveMessage(largeData);

      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          parts: expect.arrayContaining([
            expect.objectContaining({ text: 'Part 0' }),
            expect.objectContaining({ text: 'Part 99' }),
          ]),
        }),
      );
    });
  });
});
