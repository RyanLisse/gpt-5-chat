import 'server-only';

// Export all read operations from cached queries
export {
  getAllMessagesByChatId,
  getChatById,
  getChatsByUserId,
  getDocumentsById,
  getDocumentsByMessageIds,
  getSuggestionsByDocumentId,
  getUserByEmail,
  getUserById,
  getVotesByChatId,
} from './cached-queries';

// Export all write operations from original queries (with cache invalidation)
export {
  getAllAttachmentUrls,
  getDocumentById,
  getMessageById,
  getMessagesWithAttachments,
  getPublicDocumentsById,
  tryGetChatById, // This is a read operation that handles errors gracefully
} from './queries';

import type { ArtifactKind } from '../artifacts/artifact-kind';

import {
  invalidateChatListCache,
  invalidateChatMessagesCache,
  invalidateChatVotesCache,
  invalidateDocumentSuggestionsCache,
  invalidateDocumentsCache,
  invalidateFullChatCache,
  warmUpChatCaches,
} from './cache-invalidation';
// Re-export write operations with cache invalidation
import {
  createUser as _createUser,
  deleteChatById as _deleteChatById,
  deleteDocumentsByIdAfterTimestamp as _deleteDocumentsByIdAfterTimestamp,
  deleteMessagesByChatIdAfterMessageId as _deleteMessagesByChatIdAfterMessageId,
  deleteMessagesByChatIdAfterTimestamp as _deleteMessagesByChatIdAfterTimestamp,
  saveChat as _saveChat,
  saveDocument as _saveDocument,
  saveDocuments as _saveDocuments,
  saveMessage as _saveMessage,
  saveMessages as _saveMessages,
  saveSuggestions as _saveSuggestions,
  updateChatIsPinnedById as _updateChatIsPinnedById,
  updateChatTitleById as _updateChatTitleById,
  updateChatUpdatedAt as _updateChatUpdatedAt,
  updateChatVisiblityById as _updateChatVisiblityById,
  updateMessage as _updateMessage,
  voteMessage as _voteMessage,
} from './queries';
import type { DBMessage, Suggestion } from './schema';

/**
 * Create a new user and invalidate user cache
 */
export async function createUser({
  email,
  name,
  image,
}: {
  email: string;
  name: string | null;
  image: string | null;
}) {
  const result = await _createUser({ email, name, image });

  // Note: We don't have userId yet, so we'll invalidate on first getUserByEmail call
  // This is acceptable since user creation is rare

  return result;
}

/**
 * Save a new chat and invalidate relevant caches
 */
export async function saveChat({
  id,
  userId,
  title,
}: {
  id: string;
  userId: string;
  title: string;
}) {
  const result = await _saveChat({ id, userId, title });

  // Invalidate user's chat list
  invalidateChatListCache(userId);

  // Warm up caches for the new chat
  await warmUpChatCaches({ chatId: id, userId });

  return result;
}

/**
 * Delete a chat by ID and invalidate relevant caches
 */
export async function deleteChatById({
  id,
  userId,
}: {
  id: string;
  userId?: string;
}) {
  const result = await _deleteChatById({ id });

  if (userId) {
    // Invalidate user's chat list and the specific chat
    invalidateFullChatCache({ chatId: id, userId, includeMessages: true });
  }

  return result;
}

/**
 * Save a message and invalidate relevant caches
 */
export async function saveMessage({ _message }: { _message: DBMessage }) {
  const result = await _saveMessage({ _message });

  // Invalidate chat messages and chat metadata (for updatedAt)
  invalidateChatMessagesCache(_message.chatId);
  invalidateFullChatCache({
    chatId: _message.chatId,
    userId: '', // We don't have userId here, but chat cache will be invalidated
    includeMessages: false, // Already invalidated above
  });

  return result;
}

/**
 * Save multiple messages and invalidate relevant caches
 */
export async function saveMessages({ _messages }: { _messages: DBMessage[] }) {
  if (_messages.length === 0) {
    return;
  }

  const result = await _saveMessages({ _messages });

  // Get unique chat IDs and invalidate their caches
  const uniqueChatIds = [...new Set(_messages.map((msg) => msg.chatId))];

  for (const chatId of uniqueChatIds) {
    invalidateChatMessagesCache(chatId);
    invalidateFullChatCache({
      chatId,
      userId: '', // We don't have userId here
      includeMessages: false, // Already invalidated above
    });
  }

  return result;
}

/**
 * Update a message and invalidate relevant caches
 */
export async function updateMessage({ _message }: { _message: DBMessage }) {
  const result = await _updateMessage({ _message });

  // Invalidate chat messages
  invalidateChatMessagesCache(_message.chatId);

  return result;
}

/**
 * Vote on a message and invalidate vote cache
 */
export async function voteMessage({
  chatId,
  messageId,
  type,
}: {
  chatId: string;
  messageId: string;
  type: 'up' | 'down';
}) {
  const result = await _voteMessage({ chatId, messageId, type });

  // Invalidate vote cache for the chat
  invalidateChatVotesCache(chatId);

  return result;
}

/**
 * Save a document and invalidate document cache
 */
export async function saveDocument({
  id,
  title,
  kind,
  content,
  userId,
  messageId,
}: {
  id: string;
  title: string;
  kind: ArtifactKind;
  content: string;
  userId: string;
  messageId: string;
}) {
  const result = await _saveDocument({
    id,
    title,
    kind,
    content,
    userId,
    messageId,
  });

  // Invalidate documents cache for this message
  invalidateDocumentsCache([messageId]);

  return result;
}

/**
 * Save multiple documents and invalidate document cache
 */
export async function saveDocuments({
  documents,
}: {
  documents: Array<{
    id: string;
    title: string;
    kind: ArtifactKind;
    content: string | null;
    userId: string;
    messageId: string;
    createdAt: Date;
  }>;
}) {
  if (documents.length === 0) {
    return;
  }

  const result = await _saveDocuments({ documents });

  // Get unique message IDs and invalidate document cache
  const messageIds = [...new Set(documents.map((doc) => doc.messageId))];
  invalidateDocumentsCache(messageIds);

  return result;
}

/**
 * Save suggestions and invalidate suggestion cache
 */
export async function saveSuggestions({
  suggestions,
}: {
  suggestions: Suggestion[];
}) {
  const result = await _saveSuggestions({ suggestions });

  // Invalidate suggestion cache for each document
  const documentIds = [...new Set(suggestions.map((s) => s.documentId))];
  for (const documentId of documentIds) {
    invalidateDocumentSuggestionsCache(documentId);
  }

  return result;
}

/**
 * Delete documents by ID after timestamp and invalidate cache
 */
export async function deleteDocumentsByIdAfterTimestamp({
  id,
  timestamp,
  messageId,
}: {
  id: string;
  timestamp: Date;
  messageId?: string;
}) {
  const result = await _deleteDocumentsByIdAfterTimestamp({ id, timestamp });

  if (messageId) {
    invalidateDocumentsCache([messageId]);
  }
  invalidateDocumentSuggestionsCache(id);

  return result;
}

/**
 * Delete messages by chat ID after timestamp and invalidate cache
 */
export async function deleteMessagesByChatIdAfterTimestamp({
  chatId,
  timestamp,
  userId,
}: {
  chatId: string;
  timestamp: Date;
  userId?: string;
}) {
  const result = await _deleteMessagesByChatIdAfterTimestamp({
    chatId,
    timestamp,
  });

  // Invalidate chat messages and update chat metadata
  invalidateChatMessagesCache(chatId);
  if (userId) {
    invalidateFullChatCache({ chatId, userId });
  }

  return result;
}

/**
 * Delete messages by chat ID after message ID and invalidate cache
 */
export async function deleteMessagesByChatIdAfterMessageId({
  chatId,
  messageId,
  userId,
}: {
  chatId: string;
  messageId: string;
  userId?: string;
}) {
  const result = await _deleteMessagesByChatIdAfterMessageId({
    chatId,
    messageId,
  });

  // Invalidate chat messages and update chat metadata
  invalidateChatMessagesCache(chatId);
  if (userId) {
    invalidateFullChatCache({ chatId, userId });
  }

  return result;
}

/**
 * Update chat visibility and invalidate cache
 */
export async function updateChatVisiblityById({
  chatId,
  visibility,
  userId,
}: {
  chatId: string;
  visibility: 'private' | 'public';
  userId?: string;
}) {
  const result = await _updateChatVisiblityById({ chatId, visibility });

  if (userId) {
    invalidateFullChatCache({ chatId, userId });
  }

  return result;
}

/**
 * Update chat title and invalidate cache
 */
export async function updateChatTitleById({
  chatId,
  title,
  userId,
}: {
  chatId: string;
  title: string;
  userId?: string;
}) {
  const result = await _updateChatTitleById({ chatId, title });

  if (userId) {
    invalidateFullChatCache({ chatId, userId });
  }

  return result;
}

/**
 * Update chat pinned status and invalidate cache
 */
export async function updateChatIsPinnedById({
  chatId,
  isPinned,
  userId,
}: {
  chatId: string;
  isPinned: boolean;
  userId?: string;
}) {
  const result = await _updateChatIsPinnedById({ chatId, isPinned });

  if (userId) {
    invalidateFullChatCache({ chatId, userId });
  }

  return result;
}

/**
 * Update chat updatedAt timestamp and invalidate cache
 */
export async function updateChatUpdatedAt({
  chatId,
  userId,
}: {
  chatId: string;
  userId?: string;
}) {
  const result = await _updateChatUpdatedAt({ chatId });

  if (userId) {
    invalidateFullChatCache({ chatId, userId });
  }

  return result;
}
