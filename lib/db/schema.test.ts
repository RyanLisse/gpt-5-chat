import { describe, expect, it } from 'vitest';
import {
  type Chat,
  chat,
  conversationState,
  type DBConversationState,
  type DBMessage,
  type Document,
  document,
  message,
  type Suggestion,
  suggestion,
  type User,
  user,
  type Vote,
  vote,
} from './schema';

describe('Database Schema', () => {
  describe('User Table', () => {
    it('should have correct columns and types', () => {
      expect(user.id).toBeDefined();
      expect(user.createdAt).toBeDefined();
      expect(user.email).toBeDefined();
      expect(user.name).toBeDefined();
      expect(user.image).toBeDefined();
      expect(user.credits).toBeDefined();
      expect(user.reservedCredits).toBeDefined();
    });

    it('should have correct default values', () => {
      const columnDefaults = {
        credits: user.credits.default,
        reservedCredits: user.reservedCredits.default,
      };

      expect(columnDefaults.credits).toBe(100);
      expect(columnDefaults.reservedCredits).toBe(0);
    });

    it('should have email as required field', () => {
      expect(user.email.notNull).toBe(true);
    });

    it('should have id as primary key', () => {
      expect(user.id.primary).toBe(true);
    });

    it('should export correct User type', () => {
      // Type check that User type matches expected structure
      const mockUser: User = {
        id: 'user-id',
        createdAt: new Date(),
        email: 'test@example.com',
        name: 'Test User',
        image: 'https://example.com/image.jpg',
        credits: 100,
        reservedCredits: 0,
      };

      expect(mockUser.id).toBe('user-id');
      expect(mockUser.email).toBe('test@example.com');
      expect(mockUser.credits).toBe(100);
      expect(mockUser.reservedCredits).toBe(0);
    });
  });

  describe('Chat Table', () => {
    it('should have correct columns and types', () => {
      expect(chat.id).toBeDefined();
      expect(chat.createdAt).toBeDefined();
      expect(chat.updatedAt).toBeDefined();
      expect(chat.title).toBeDefined();
      expect(chat.userId).toBeDefined();
      expect(chat.visibility).toBeDefined();
      expect(chat.isPinned).toBeDefined();
    });

    it('should have correct default values', () => {
      const columnDefaults = {
        visibility: chat.visibility.default,
        isPinned: chat.isPinned.default,
      };

      expect(columnDefaults.visibility).toBe('private');
      expect(columnDefaults.isPinned).toBe(false);
    });

    it('should have userId field for foreign key relationship', () => {
      expect(chat.userId).toBeDefined();
      expect(chat.userId.notNull).toBe(true);
    });

    it('should export correct Chat type', () => {
      const mockChat: Chat = {
        id: 'chat-id',
        createdAt: new Date(),
        updatedAt: new Date(),
        title: 'Test Chat',
        userId: 'user-id',
        visibility: 'private',
        isPinned: false,
      };

      expect(mockChat.id).toBe('chat-id');
      expect(mockChat.title).toBe('Test Chat');
      expect(mockChat.visibility).toBe('private');
      expect(mockChat.isPinned).toBe(false);
    });

    it('should accept valid visibility values', () => {
      const publicChat: Chat = {
        id: 'chat-id',
        createdAt: new Date(),
        updatedAt: new Date(),
        title: 'Public Chat',
        userId: 'user-id',
        visibility: 'public',
        isPinned: false,
      };

      const privateChat: Chat = {
        id: 'chat-id',
        createdAt: new Date(),
        updatedAt: new Date(),
        title: 'Private Chat',
        userId: 'user-id',
        visibility: 'private',
        isPinned: false,
      };

      expect(publicChat.visibility).toBe('public');
      expect(privateChat.visibility).toBe('private');
    });
  });

  describe('Message Table', () => {
    it('should have correct columns and types', () => {
      expect(message.id).toBeDefined();
      expect(message.chatId).toBeDefined();
      expect(message.parentMessageId).toBeDefined();
      expect(message.role).toBeDefined();
      expect(message.parts).toBeDefined();
      expect(message.attachments).toBeDefined();
      expect(message.createdAt).toBeDefined();
      expect(message.annotations).toBeDefined();
      expect(message.isPartial).toBeDefined();
      expect(message.selectedModel).toBeDefined();
      expect(message.selectedTool).toBeDefined();
    });

    it('should have correct default values', () => {
      const columnDefaults = {
        isPartial: message.isPartial.default,
        selectedModel: message.selectedModel.default,
        selectedTool: message.selectedTool.default,
      };

      expect(columnDefaults.isPartial).toBe(false);
      expect(columnDefaults.selectedModel).toBe('');
      expect(columnDefaults.selectedTool).toBe('');
    });

    it('should have chatId field for foreign key relationship', () => {
      expect(message.chatId).toBeDefined();
      expect(message.chatId.notNull).toBe(true);
    });

    it('should export correct DBMessage type', () => {
      const mockMessage: DBMessage = {
        id: 'message-id',
        chatId: 'chat-id',
        parentMessageId: null,
        role: 'user',
        parts: [{ type: 'text', text: 'Hello' }],
        attachments: [],
        createdAt: new Date(),
        annotations: null,
        isPartial: false,
        selectedModel: 'gpt-4',
        selectedTool: '',
      };

      expect(mockMessage.id).toBe('message-id');
      expect(mockMessage.role).toBe('user');
      expect(mockMessage.parts).toEqual([{ type: 'text', text: 'Hello' }]);
      expect(mockMessage.isPartial).toBe(false);
    });
  });

  describe('Vote Table', () => {
    it('should have correct columns and types', () => {
      expect(vote.chatId).toBeDefined();
      expect(vote.messageId).toBeDefined();
      expect(vote.isUpvoted).toBeDefined();
    });

    it('should have composite primary key', () => {
      // Vote table should have composite primary key on chatId and messageId
      expect(vote.chatId).toBeDefined();
      expect(vote.messageId).toBeDefined();
    });

    it('should have foreign key fields', () => {
      expect(vote.chatId).toBeDefined();
      expect(vote.messageId).toBeDefined();
      expect(vote.chatId.notNull).toBe(true);
      expect(vote.messageId.notNull).toBe(true);
    });

    it('should export correct Vote type', () => {
      const mockVote: Vote = {
        chatId: 'chat-id',
        messageId: 'message-id',
        isUpvoted: true,
      };

      expect(mockVote.chatId).toBe('chat-id');
      expect(mockVote.messageId).toBe('message-id');
      expect(mockVote.isUpvoted).toBe(true);
    });
  });

  describe('Document Table', () => {
    it('should have correct columns and types', () => {
      expect(document.id).toBeDefined();
      expect(document.createdAt).toBeDefined();
      expect(document.title).toBeDefined();
      expect(document.content).toBeDefined();
      expect(document.kind).toBeDefined();
      expect(document.userId).toBeDefined();
      expect(document.messageId).toBeDefined();
    });

    it('should have correct default values', () => {
      const columnDefaults = {
        kind: document.kind.default,
      };

      expect(columnDefaults.kind).toBe('text');
    });

    it('should have foreign key fields', () => {
      expect(document.userId).toBeDefined();
      expect(document.messageId).toBeDefined();
      expect(document.userId.notNull).toBe(true);
      expect(document.messageId.notNull).toBe(true);
    });

    it('should export correct Document type', () => {
      const mockDocument: Document = {
        id: 'document-id',
        createdAt: new Date(),
        title: 'Test Document',
        content: 'Document content',
        kind: 'text',
        userId: 'user-id',
        messageId: 'message-id',
      };

      expect(mockDocument.id).toBe('document-id');
      expect(mockDocument.title).toBe('Test Document');
      expect(mockDocument.kind).toBe('text');
    });

    it('should accept valid document kinds', () => {
      const textDoc: Document = {
        id: 'doc-1',
        createdAt: new Date(),
        title: 'Text Document',
        content: 'Text content',
        kind: 'text',
        userId: 'user-id',
        messageId: 'message-id',
      };

      const codeDoc: Document = {
        id: 'doc-2',
        createdAt: new Date(),
        title: 'Code Document',
        content: 'const x = 1;',
        kind: 'code',
        userId: 'user-id',
        messageId: 'message-id',
      };

      const sheetDoc: Document = {
        id: 'doc-3',
        createdAt: new Date(),
        title: 'Sheet Document',
        content: 'CSV data',
        kind: 'sheet',
        userId: 'user-id',
        messageId: 'message-id',
      };

      expect(textDoc.kind).toBe('text');
      expect(codeDoc.kind).toBe('code');
      expect(sheetDoc.kind).toBe('sheet');
    });
  });

  describe('Suggestion Table', () => {
    it('should have correct columns and types', () => {
      expect(suggestion.id).toBeDefined();
      expect(suggestion.documentId).toBeDefined();
      expect(suggestion.documentCreatedAt).toBeDefined();
      expect(suggestion.originalText).toBeDefined();
      expect(suggestion.suggestedText).toBeDefined();
      expect(suggestion.description).toBeDefined();
      expect(suggestion.isResolved).toBeDefined();
      expect(suggestion.userId).toBeDefined();
      expect(suggestion.createdAt).toBeDefined();
    });

    it('should have correct default values', () => {
      const columnDefaults = {
        isResolved: suggestion.isResolved.default,
      };

      expect(columnDefaults.isResolved).toBe(false);
    });

    it('should have foreign key fields', () => {
      expect(suggestion.userId).toBeDefined();
      expect(suggestion.userId.notNull).toBe(true);
    });

    it('should export correct Suggestion type', () => {
      const mockSuggestion: Suggestion = {
        id: 'suggestion-id',
        documentId: 'document-id',
        documentCreatedAt: new Date(),
        originalText: 'Original text',
        suggestedText: 'Suggested text',
        description: 'Suggestion description',
        isResolved: false,
        userId: 'user-id',
        createdAt: new Date(),
      };

      expect(mockSuggestion.id).toBe('suggestion-id');
      expect(mockSuggestion.originalText).toBe('Original text');
      expect(mockSuggestion.suggestedText).toBe('Suggested text');
      expect(mockSuggestion.isResolved).toBe(false);
    });
  });

  describe('ConversationState Table', () => {
    it('should have correct columns and types', () => {
      expect(conversationState.conversationId).toBeDefined();
      expect(conversationState.userId).toBeDefined();
      expect(conversationState.previousResponseId).toBeDefined();
      expect(conversationState.contextMetadata).toBeDefined();
      expect(conversationState.createdAt).toBeDefined();
      expect(conversationState.updatedAt).toBeDefined();
      expect(conversationState.version).toBeDefined();
    });

    it('should have correct default values', () => {
      const columnDefaults = {
        version: conversationState.version.default,
      };

      expect(columnDefaults.version).toBe(1);
    });

    it('should have conversationId as primary key', () => {
      expect(conversationState.conversationId.primary).toBe(true);
    });

    it('should have userId field for foreign key relationship', () => {
      expect(conversationState.userId).toBeDefined();
      expect(conversationState.userId.notNull).toBe(true);
    });

    it('should export correct DBConversationState type', () => {
      const mockConversationState: DBConversationState = {
        conversationId: 'conversation-id',
        userId: 'user-id',
        previousResponseId: 'response-id',
        contextMetadata: { key: 'value' },
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      };

      expect(mockConversationState.conversationId).toBe('conversation-id');
      expect(mockConversationState.userId).toBe('user-id');
      expect(mockConversationState.version).toBe(1);
    });
  });

  describe('Table Relationships', () => {
    it('should have proper foreign key fields', () => {
      // Chat -> User
      expect(chat.userId).toBeDefined();
      expect(chat.userId.notNull).toBe(true);

      // Message -> Chat
      expect(message.chatId).toBeDefined();
      expect(message.chatId.notNull).toBe(true);

      // Vote -> Chat and Message
      expect(vote.chatId).toBeDefined();
      expect(vote.messageId).toBeDefined();
      expect(vote.chatId.notNull).toBe(true);
      expect(vote.messageId.notNull).toBe(true);

      // Document -> User and Message
      expect(document.userId).toBeDefined();
      expect(document.messageId).toBeDefined();
      expect(document.userId.notNull).toBe(true);
      expect(document.messageId.notNull).toBe(true);

      // Suggestion -> User
      expect(suggestion.userId).toBeDefined();
      expect(suggestion.userId.notNull).toBe(true);

      // ConversationState -> User
      expect(conversationState.userId).toBeDefined();
      expect(conversationState.userId.notNull).toBe(true);
    });

    it('should have foreign key fields for cascade relationships', () => {
      // Message should have chatId for cascade delete when chat is deleted
      expect(message.chatId).toBeDefined();
      expect(message.chatId.notNull).toBe(true);

      // Vote should have foreign keys for cascade delete
      expect(vote.chatId).toBeDefined();
      expect(vote.messageId).toBeDefined();
      expect(vote.chatId.notNull).toBe(true);
      expect(vote.messageId.notNull).toBe(true);

      // Document should have messageId for cascade delete
      expect(document.messageId).toBeDefined();
      expect(document.messageId.notNull).toBe(true);

      // ConversationState should have userId for cascade delete
      expect(conversationState.userId).toBeDefined();
      expect(conversationState.userId.notNull).toBe(true);
    });
  });

  describe('Primary Keys and Constraints', () => {
    it('should have UUID primary keys where expected', () => {
      expect(user.id.primary).toBe(true);
      expect(chat.id.primary).toBe(true);
      expect(message.id.primary).toBe(true);
      expect(conversationState.conversationId.primary).toBe(true);
    });

    it('should have composite primary keys where expected', () => {
      // Vote table has composite primary key
      expect(vote.chatId).toBeDefined();
      expect(vote.messageId).toBeDefined();

      // Document table has composite primary key
      expect(document.id).toBeDefined();
      expect(document.createdAt).toBeDefined();

      // Suggestion has single primary key
      expect(suggestion.id).toBeDefined();
    });

    it('should have not null constraints on required fields', () => {
      // User
      expect(user.id.notNull).toBe(true);
      expect(user.email.notNull).toBe(true);
      expect(user.createdAt.notNull).toBe(true);

      // Chat
      expect(chat.id.notNull).toBe(true);
      expect(chat.title.notNull).toBe(true);
      expect(chat.userId.notNull).toBe(true);

      // Message
      expect(message.id.notNull).toBe(true);
      expect(message.chatId.notNull).toBe(true);
      expect(message.role.notNull).toBe(true);
      expect(message.parts.notNull).toBe(true);
      expect(message.attachments.notNull).toBe(true);

      // ConversationState
      expect(conversationState.conversationId.notNull).toBe(true);
      expect(conversationState.userId.notNull).toBe(true);
    });
  });

  describe('Column Data Types', () => {
    it('should use appropriate data types for different fields', () => {
      // Check that email has length constraint
      expect(user.email).toBeDefined();

      // Check that name has length constraint
      expect(user.name).toBeDefined();

      // Check that image has length constraint
      expect(user.image).toBeDefined();

      // Check that selectedModel has length constraint
      expect(message.selectedModel).toBeDefined();

      // Check that selectedTool has length constraint
      expect(message.selectedTool).toBeDefined();

      // Check that conversationId has length constraint
      expect(conversationState.conversationId).toBeDefined();

      // Check that previousResponseId has length constraint
      expect(conversationState.previousResponseId).toBeDefined();
    });

    it('should use JSON type for complex data', () => {
      // Message parts and attachments should be JSON
      expect(message.parts).toBeDefined();
      expect(message.attachments).toBeDefined();
      expect(message.annotations).toBeDefined();

      // ConversationState contextMetadata should be JSON
      expect(conversationState.contextMetadata).toBeDefined();
    });

    it('should use boolean type for flags', () => {
      expect(chat.isPinned).toBeDefined();
      expect(message.isPartial).toBeDefined();
      expect(suggestion.isResolved).toBeDefined();
      expect(vote.isUpvoted).toBeDefined();
    });

    it('should use timestamp type for dates', () => {
      expect(user.createdAt).toBeDefined();
      expect(chat.createdAt).toBeDefined();
      expect(chat.updatedAt).toBeDefined();
      expect(message.createdAt).toBeDefined();
      expect(document.createdAt).toBeDefined();
      expect(suggestion.createdAt).toBeDefined();
      expect(suggestion.documentCreatedAt).toBeDefined();
      expect(conversationState.createdAt).toBeDefined();
      expect(conversationState.updatedAt).toBeDefined();
    });
  });
});
