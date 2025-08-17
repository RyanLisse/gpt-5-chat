import 'server-only';
import { revalidateTag } from 'next/cache';

// Cache tag constants (mirrored from cached-queries.ts)
const CACHE_TAGS = {
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
 * Cache invalidation utilities for database mutations
 * These functions should be called after successful mutations to keep cache fresh
 */

/**
 * Invalidate user-related caches
 * Call when user data is created or updated
 */
export function invalidateUserCache(userId: string, email?: string) {
  revalidateTag(CACHE_TAGS.USER(userId));
  if (email) {
    revalidateTag(CACHE_TAGS.USER_EMAIL(email));
  }
}

/**
 * Invalidate chat list cache for a user
 * Call when chats are created, deleted, or their metadata changes
 */
export function invalidateChatListCache(userId: string) {
  revalidateTag(CACHE_TAGS.CHAT_LIST(userId));
}

/**
 * Invalidate specific chat metadata cache
 * Call when chat title, visibility, pinned status, or updatedAt changes
 */
export function invalidateChatCache(chatId: string) {
  revalidateTag(CACHE_TAGS.CHAT(chatId));
}

/**
 * Invalidate chat messages cache
 * Call when messages are added, updated, or deleted in a chat
 */
export function invalidateChatMessagesCache(chatId: string) {
  revalidateTag(CACHE_TAGS.CHAT_MESSAGES(chatId));
}

/**
 * Invalidate chat votes cache
 * Call when votes are added or updated for a chat
 */
export function invalidateChatVotesCache(chatId: string) {
  revalidateTag(CACHE_TAGS.CHAT_VOTES(chatId));
}

/**
 * Invalidate documents cache
 * Call when documents are created, updated, or deleted
 */
export function invalidateDocumentsCache(messageIds: string[]) {
  const sortedIds = messageIds.sort().join(',');
  revalidateTag(CACHE_TAGS.DOCUMENTS(sortedIds));
}

/**
 * Invalidate document suggestions cache
 * Call when suggestions are added or updated for a document
 */
export function invalidateDocumentSuggestionsCache(documentId: string) {
  revalidateTag(CACHE_TAGS.DOCUMENT_SUGGESTIONS(documentId));
}

/**
 * Comprehensive cache invalidation for chat operations
 * Handles the common case where chat metadata, messages, and user's chat list all need updating
 */
export function invalidateFullChatCache({
  chatId,
  userId,
  includeMessages = false,
}: {
  chatId: string;
  userId: string;
  includeMessages?: boolean;
}) {
  invalidateChatCache(chatId);
  invalidateChatListCache(userId);

  if (includeMessages) {
    invalidateChatMessagesCache(chatId);
  }
}

/**
 * Warm up critical caches by pre-loading frequently accessed data
 * Call this for newly created chats or after major operations
 */
export async function warmUpChatCaches({
  chatId,
  userId,
}: {
  chatId: string;
  userId: string;
}) {
  // Import cached functions to trigger cache warming
  const { getChatById, getChatsByUserId, getAllMessagesByChatId } =
    await import('./cached-queries');

  try {
    // Pre-load chat metadata
    await getChatById({ id: chatId });

    // Pre-load user's chat list
    await getChatsByUserId({ id: userId });

    // Pre-load chat messages (if chat exists)
    await getAllMessagesByChatId({ chatId });
  } catch (_error) {}
}

/**
 * Warm up user-related caches
 * Call this during authentication or user operations
 */
export async function warmUpUserCaches({
  userId,
  email,
}: {
  userId: string;
  email?: string;
}) {
  const { getUserById, getUserByEmail, getChatsByUserId } = await import(
    './cached-queries'
  );

  try {
    // Pre-load user data
    await getUserById({ userId });

    if (email) {
      await getUserByEmail(email);
    }

    // Pre-load user's chat list
    await getChatsByUserId({ id: userId });
  } catch (_error) {}
}
