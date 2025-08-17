import 'server-only';
import { unstable_cache } from 'next/cache';
import {
  getAllMessagesByChatId as _getAllMessagesByChatId,
  getChatById as _getChatById,
  getChatsByUserId as _getChatsByUserId,
  getDocumentsById as _getDocumentsById,
  getDocumentsByMessageIds as _getDocumentsByMessageIds,
  getSuggestionsByDocumentId as _getSuggestionsByDocumentId,
  getUserByEmail as _getUserByEmail,
  getUserById as _getUserById,
  getVotesByChatId as _getVotesByChatId,
} from './queries';
import type { User } from './schema';

// Cache duration constants (in seconds)
const CACHE_DURATIONS = {
  USER_DATA: 300, // 5 minutes - user data changes infrequently
  CHAT_LIST: 180, // 3 minutes - chat list updates moderately
  CHAT_MESSAGES: 600, // 10 minutes - messages are immutable once created
  CHAT_METADATA: 300, // 5 minutes - chat metadata (title, visibility)
  DOCUMENTS: 900, // 15 minutes - documents rarely change after creation
  SUGGESTIONS: 600, // 10 minutes - suggestions are stable
  VOTES: 300, // 5 minutes - votes can change but not frequently
} as const;

// Cache tag constants for organized invalidation
const _CACHE_TAGS = {
  USER: (id: string) => `user:${id}`,
  USER_EMAIL: (email: string) => `user-email:${email}`,
  CHAT: (id: string) => `chat:${id}`,
  CHAT_LIST: (userId: string) => `chat-list:${userId}`,
  CHAT_MESSAGES: (chatId: string) => `chat-messages:${chatId}`,
  CHAT_VOTES: (chatId: string) => `chat-votes:${chatId}`,
  DOCUMENTS: (ids: string) => `documents:${ids}`,
  DOCUMENT_SUGGESTIONS: (documentId: string) =>
    `document-suggestions:${documentId}`,
} as const;

/**
 * Cached version of getUserByEmail with email-based cache key
 * Cache duration: 5 minutes
 * Invalidation: When user data changes
 */
export const getUserByEmail = unstable_cache(
  async (email: string): Promise<User[]> => {
    return await _getUserByEmail(email);
  },
  ['getUserByEmail'],
  {
    revalidate: CACHE_DURATIONS.USER_DATA,
  },
);

/**
 * Cached version of getUserById with user ID-based cache key
 * Cache duration: 5 minutes
 * Invalidation: When user data changes
 */
export const getUserById = unstable_cache(
  async ({ userId }: { userId: string }): Promise<User | undefined> => {
    return await _getUserById({ userId });
  },
  ['getUserById'],
  {
    revalidate: CACHE_DURATIONS.USER_DATA,
  },
);

/**
 * Cached version of getChatsByUserId with user-specific cache key
 * Cache duration: 3 minutes
 * Invalidation: When user's chats are modified (created, deleted, updated)
 */
export const getChatsByUserId = unstable_cache(
  async ({ id }: { id: string }) => {
    return await _getChatsByUserId({ id });
  },
  ['getChatsByUserId'],
  {
    revalidate: CACHE_DURATIONS.CHAT_LIST,
  },
);

/**
 * Cached version of getChatById with chat-specific cache key
 * Cache duration: 5 minutes
 * Invalidation: When specific chat metadata changes
 */
export const getChatById = unstable_cache(
  async ({ id }: { id: string }) => {
    return await _getChatById({ id });
  },
  ['getChatById'],
  {
    revalidate: CACHE_DURATIONS.CHAT_METADATA,
  },
);

/**
 * Cached version of getAllMessagesByChatId with chat-specific cache key
 * Cache duration: 10 minutes (messages are immutable once created)
 * Invalidation: When new messages are added to the chat
 */
export const getAllMessagesByChatId = unstable_cache(
  async ({ chatId }: { chatId: string }) => {
    return await _getAllMessagesByChatId({ chatId });
  },
  ['getAllMessagesByChatId'],
  {
    revalidate: CACHE_DURATIONS.CHAT_MESSAGES,
  },
);

/**
 * Cached version of getVotesByChatId with chat-specific cache key
 * Cache duration: 5 minutes
 * Invalidation: When votes are added or updated for the chat
 */
export const getVotesByChatId = unstable_cache(
  async ({ id }: { id: string }) => {
    return await _getVotesByChatId({ id });
  },
  ['getVotesByChatId'],
  {
    revalidate: CACHE_DURATIONS.VOTES,
  },
);

/**
 * Cached version of getDocumentsByMessageIds with message IDs-based cache key
 * Cache duration: 15 minutes (documents rarely change after creation)
 * Invalidation: When documents are created or updated for these messages
 */
export const getDocumentsByMessageIds = unstable_cache(
  async ({ messageIds }: { messageIds: string[] }) => {
    return await _getDocumentsByMessageIds({ messageIds });
  },
  ['getDocumentsByMessageIds'],
  {
    revalidate: CACHE_DURATIONS.DOCUMENTS,
  },
);

/**
 * Cached version of getDocumentsById with document ID-based cache key
 * Cache duration: 15 minutes
 * Invalidation: When specific document changes
 */
export const getDocumentsById = unstable_cache(
  async ({ id, userId }: { id: string; userId?: string }) => {
    return await _getDocumentsById({ id, userId });
  },
  ['getDocumentsById'],
  {
    revalidate: CACHE_DURATIONS.DOCUMENTS,
  },
);

/**
 * Cached version of getSuggestionsByDocumentId with document-specific cache key
 * Cache duration: 10 minutes
 * Invalidation: When suggestions are added or updated for the document
 */
export const getSuggestionsByDocumentId = unstable_cache(
  async ({ documentId }: { documentId: string }) => {
    return await _getSuggestionsByDocumentId({ documentId });
  },
  ['getSuggestionsByDocumentId'],
  {
    revalidate: CACHE_DURATIONS.SUGGESTIONS,
  },
);
