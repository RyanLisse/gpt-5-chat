import type { Chat, DBMessage } from '@/lib/db/schema';
import type { UIChat } from '@/lib/types/uiChat';
import type { ModelId } from './ai/model-id';
import type { ChatMessage, UiToolName } from './ai/types';

// Helper functions for type conversion
export function dbChatToUIChat(chat: Chat): UIChat {
  return {
    id: chat.id,
    createdAt: chat.createdAt,
    updatedAt: chat.updatedAt,
    title: chat.title,
    visibility: chat.visibility,
    userId: chat.userId,
    isPinned: chat.isPinned,
  };
}

export function dbMessageToChatMessage(message: DBMessage): ChatMessage {
  return {
    id: message.id,
    parts: message.parts as ChatMessage['parts'],
    role: message.role as ChatMessage['role'],
    metadata: {
      createdAt: message.createdAt,
      isPartial: message.isPartial,
      parentMessageId: message.parentMessageId,
      selectedModel: (message.selectedModel as ModelId) || ('' as ModelId),
      selectedTool: (message.selectedTool as UiToolName | null) || undefined,
    },
  };
}

export function chatMessageToDbMessage(
  message: ChatMessage,
  chatId: string,
): DBMessage {
  const parentMessageId = message.metadata.parentMessageId || null;
  const isPartial = message.metadata.isPartial;
  const selectedModel = message.metadata.selectedModel;

  return {
    id: message.id,
    chatId,
    role: message.role,
    parts: message.parts,
    attachments: [],
    createdAt: message.metadata?.createdAt || new Date(),
    annotations: [],
    isPartial,
    parentMessageId,
    selectedModel,
    selectedTool: message.metadata?.selectedTool || null,
  };
}
