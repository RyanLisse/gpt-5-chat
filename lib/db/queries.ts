import 'server-only';
import { del } from '@vercel/blob';
import { and, asc, desc, eq, gt, gte, inArray } from 'drizzle-orm';
import type { Attachment } from '@/lib/ai/types';
import type { ArtifactKind } from '../artifacts/artifact-kind';
import { db } from './client';
import {
  chat,
  type DBMessage,
  document,
  message,
  type Suggestion,
  suggestion,
  type User,
  user,
  vote,
} from './schema';

export async function getUserByEmail(email: string): Promise<User[]> {
  try {
    return await db.select().from(user).where(eq(user.email, email));
  } catch (error) {
    // Return empty array for graceful degradation
    if (error instanceof Error && error.message.includes('unavailable')) {
      return [];
    }

    throw error;
  }
}

export async function createUser({
  email,
  name,
  image,
}: {
  email: string;
  name: string | null;
  image: string | null;
}) {
  return await db.insert(user).values({
    email,
    name,
    image,
  });
}

export async function saveChat({
  id,
  userId,
  title,
}: {
  id: string;
  userId: string;
  title: string;
}) {
  return await db.insert(chat).values({
    id,
    createdAt: new Date(),
    updatedAt: new Date(),
    userId,
    title,
  });
}

export async function deleteChatById({ id }: { id: string }) {
  // Get all messages for this chat to clean up their attachments
  const messagesToDelete = await db
    .select()
    .from(message)
    .where(eq(message.chatId, id));

  // Clean up attachments before deleting the chat (which will cascade delete messages)
  if (messagesToDelete.length > 0) {
    await deleteAttachmentsFromMessages(messagesToDelete);
  }

  return await db.delete(chat).where(eq(chat.id, id));
}

export async function getChatsByUserId({ id }: { id: string }) {
  return await db
    .select()
    .from(chat)
    .where(eq(chat.userId, id))
    .orderBy(desc(chat.updatedAt));
}

export async function tryGetChatById({ id }: { id: string }) {
  try {
    const [selectedChat] = await db.select().from(chat).where(eq(chat.id, id));
    return selectedChat;
  } catch (_error) {
    return null;
  }
}

export async function getChatById({ id }: { id: string }) {
  const [selectedChat] = await db.select().from(chat).where(eq(chat.id, id));
  return selectedChat;
}

export async function saveMessage({ _message }: { _message: DBMessage }) {
  const result = await db.insert(message).values(_message);

  // Update chat's updatedAt timestamp
  await updateChatUpdatedAt({ chatId: _message.chatId });

  return result;
}

// TODO: This should indicate the it's only updating messages for a single chat
export async function saveMessages({ _messages }: { _messages: DBMessage[] }) {
  if (_messages.length === 0) {
    return;
  }
  const result = await db.insert(message).values(_messages);

  // Update chat's updatedAt timestamp for all affected chats
  const uniqueChatIds = [...new Set(_messages.map((msg) => msg.chatId))];
  await Promise.all(
    uniqueChatIds.map((chatId) => updateChatUpdatedAt({ chatId })),
  );

  return result;
}

export async function updateMessage({ _message }: { _message: DBMessage }) {
  return await db
    .update(message)
    .set({
      parts: _message.parts,
      annotations: _message.annotations,
      attachments: _message.attachments,
      createdAt: _message.createdAt,
      isPartial: _message.isPartial,
      parentMessageId: _message.parentMessageId,
    })
    .where(eq(message.id, _message.id));
}

export async function getAllMessagesByChatId({ chatId }: { chatId: string }) {
  return await db
    .select()
    .from(message)
    .where(eq(message.chatId, chatId))
    .orderBy(asc(message.createdAt));
}

export async function voteMessage({
  chatId,
  messageId,
  type,
}: {
  chatId: string;
  messageId: string;
  type: 'up' | 'down';
}) {
  const [existingVote] = await db
    .select()
    .from(vote)
    .where(and(eq(vote.messageId, messageId), eq(vote.chatId, chatId)));

  if (existingVote) {
    return await db
      .update(vote)
      .set({ isUpvoted: type === 'up' })
      .where(and(eq(vote.messageId, messageId), eq(vote.chatId, chatId)));
  }
  return await db.insert(vote).values({
    chatId,
    messageId,
    isUpvoted: type === 'up',
  });
}

export async function getVotesByChatId({ id }: { id: string }) {
  return await db.select().from(vote).where(eq(vote.chatId, id));
}

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
  return await db.insert(document).values({
    id,
    title,
    kind,
    content,
    userId,
    messageId,
    createdAt: new Date(),
  });
}

async function _getDocumentsById({ id }: { id: string }) {
  const documents = await db
    .select()
    .from(document)
    .where(eq(document.id, id))
    .orderBy(asc(document.createdAt));

  return documents;
}

export async function getDocumentsById({
  id,
  userId,
}: {
  id: string;
  userId?: string;
}) {
  // First, get the document and check ownership
  const documents = await _getDocumentsById({ id });

  if (documents.length === 0) {
    return [];
  }

  const [doc] = documents;

  if (!userId || doc.userId !== userId) {
    // Need to check if chat is public
    const documentsWithVisibility = await db
      .select({
        id: document.id,
        createdAt: document.createdAt,
        title: document.title,
        content: document.content,
        kind: document.kind,
        userId: document.userId,
        messageId: document.messageId,
        chatVisibility: chat.visibility,
      })
      .from(document)
      .innerJoin(message, eq(document.messageId, message.id))
      .innerJoin(chat, eq(message.chatId, chat.id))
      .where(and(eq(document.id, id), eq(chat.visibility, 'public')))
      .orderBy(asc(document.createdAt));

    return documentsWithVisibility;
  }

  return documents;
}

export async function getPublicDocumentsById({ id }: { id: string }) {
  const documents = await db
    .select({
      id: document.id,
      createdAt: document.createdAt,
      title: document.title,
      content: document.content,
      kind: document.kind,
      userId: document.userId,
      messageId: document.messageId,
    })
    .from(document)
    .innerJoin(message, eq(document.messageId, message.id))
    .innerJoin(chat, eq(message.chatId, chat.id))
    .where(and(eq(document.id, id), eq(chat.visibility, 'public')))
    .orderBy(asc(document.createdAt));

  return documents;
}

export async function getDocumentById({ id }: { id: string }) {
  const [selectedDocument] = await db
    .select()
    .from(document)
    .where(eq(document.id, id))
    .orderBy(desc(document.createdAt));

  return selectedDocument;
}

export async function deleteDocumentsByIdAfterTimestamp({
  id,
  timestamp,
}: {
  id: string;
  timestamp: Date;
}) {
  await db
    .delete(suggestion)
    .where(
      and(
        eq(suggestion.documentId, id),
        gt(suggestion.documentCreatedAt, timestamp),
      ),
    );

  return await db
    .delete(document)
    .where(and(eq(document.id, id), gt(document.createdAt, timestamp)));
}

export async function saveSuggestions({
  suggestions,
}: {
  suggestions: Suggestion[];
}) {
  return await db.insert(suggestion).values(suggestions);
}

export async function getSuggestionsByDocumentId({
  documentId,
}: {
  documentId: string;
}) {
  return await db
    .select()
    .from(suggestion)
    .where(and(eq(suggestion.documentId, documentId)));
}

export async function getDocumentsByMessageIds({
  messageIds,
}: {
  messageIds: string[];
}) {
  if (messageIds.length === 0) {
    return [];
  }
  return await db
    .select()
    .from(document)
    .where(inArray(document.messageId, messageIds))
    .orderBy(asc(document.createdAt));
}

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
  return await db.insert(document).values(documents);
}

export async function getMessageById({ id }: { id: string }) {
  return await db.select().from(message).where(eq(message.id, id));
}

export async function deleteMessagesByChatIdAfterTimestamp({
  chatId,
  timestamp,
}: {
  chatId: string;
  timestamp: Date;
}) {
  const messagesToDelete = await db
    .select()
    .from(message)
    .where(and(eq(message.chatId, chatId), gte(message.createdAt, timestamp)));

  const messageIds = messagesToDelete.map((message) => message.id);

  if (messageIds.length > 0) {
    // Clean up attachments before deleting messages
    await deleteAttachmentsFromMessages(messagesToDelete);

    await db
      .delete(vote)
      .where(and(eq(vote.chatId, chatId), inArray(vote.messageId, messageIds)));

    return await db
      .delete(message)
      .where(and(eq(message.chatId, chatId), inArray(message.id, messageIds)));
  }
}

export async function deleteMessagesByChatIdAfterMessageId({
  chatId,
  messageId,
}: {
  chatId: string;
  messageId: string;
}) {
  // First, get the target message to find its position in the chat
  const [targetMessage] = await db
    .select()
    .from(message)
    .where(and(eq(message.id, messageId), eq(message.chatId, chatId)));

  if (!targetMessage) {
    throw new Error('Target message not found');
  }

  // Get all messages in the chat ordered by creation time
  const allMessages = await db
    .select()
    .from(message)
    .where(eq(message.chatId, chatId))
    .orderBy(asc(message.createdAt));

  // Find the index of the target message
  const targetIndex = allMessages.findIndex((msg) => msg.id === messageId);

  if (targetIndex === -1) {
    throw new Error('Target message not found in chat');
  }

  // Delete all messages after the target message (including the target itself)
  const messagesToDelete = allMessages.slice(targetIndex);
  const messageIdsToDelete = messagesToDelete.map((msg) => msg.id);

  if (messageIdsToDelete.length > 0) {
    // Clean up attachments before deleting messages
    await deleteAttachmentsFromMessages(messagesToDelete);

    // Delete the messages (votes will be deleted automatically via CASCADE)
    return await db
      .delete(message)
      .where(
        and(
          eq(message.chatId, chatId),
          inArray(message.id, messageIdsToDelete),
        ),
      );
  }
}

export async function updateChatVisiblityById({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: 'private' | 'public';
}) {
  return await db.update(chat).set({ visibility }).where(eq(chat.id, chatId));
}

export async function updateChatTitleById({
  chatId,
  title,
}: {
  chatId: string;
  title: string;
}) {
  return await db
    .update(chat)
    .set({
      title,
    })
    .where(eq(chat.id, chatId));
}

export async function updateChatIsPinnedById({
  chatId,
  isPinned,
}: {
  chatId: string;
  isPinned: boolean;
}) {
  return await db
    .update(chat)
    .set({
      isPinned,
    })
    .where(eq(chat.id, chatId));
}

export async function updateChatUpdatedAt({ chatId }: { chatId: string }) {
  return await db
    .update(chat)
    .set({
      updatedAt: new Date(),
    })
    .where(eq(chat.id, chatId));
}

export async function getUserById({
  userId,
}: {
  userId: string;
}): Promise<User | undefined> {
  const users = await db
    .select()
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);
  return users[0];
}

export async function getMessagesWithAttachments() {
  return await db.select({ attachments: message.attachments }).from(message);
}

export async function getAllAttachmentUrls(): Promise<string[]> {
  const messages = await getMessagesWithAttachments();

  const attachmentUrls: string[] = [];

  for (const msg of messages) {
    if (msg.attachments && Array.isArray(msg.attachments)) {
      const attachments = msg.attachments as Attachment[];
      for (const attachment of attachments) {
        if (attachment.url) {
          attachmentUrls.push(attachment.url);
        }
      }
    }
  }

  return attachmentUrls;
}

async function deleteAttachmentsFromMessages(messages: DBMessage[]) {
  try {
    const attachmentUrls: string[] = [];

    for (const msg of messages) {
      if (msg.attachments && Array.isArray(msg.attachments)) {
        const attachments = msg.attachments as Attachment[];
        for (const attachment of attachments) {
          if (attachment.url) {
            attachmentUrls.push(attachment.url);
          }
        }
      }
    }

    if (attachmentUrls.length > 0) {
      await del(attachmentUrls);
    }
  } catch (_error) {
    // Don't throw here - we still want to proceed with message deletion
    // even if blob cleanup fails
  }
}
