import type { UseChatHelpers } from '@ai-sdk/react';
import { useCallback } from 'react';
import { useSaveMessageMutation } from '@/hooks/chat-sync-hooks';
import type { ModelId } from '@/lib/ai/model-id';
import type { Attachment, ChatMessage, UiToolName } from '@/lib/ai/types';
import { chatStore, useSetMessages } from '@/lib/stores/chat-store';
import { generateUUID } from '@/lib/utils';

type MessageSubmissionHook = {
  submitMessage: () => void;
};

type MessageSubmissionOptions = {
  chatId: string;
  attachments: Attachment[];
  selectedModelId: ModelId;
  selectedTool: string | null;
  isEditMode: boolean;
  parentMessageId: string | null;
  getInputValue: () => string;
  sendMessage: UseChatHelpers<ChatMessage>['sendMessage'];
  editorRef: React.RefObject<any>;
  width?: number;
};

export const useMessageSubmission = (
  options: MessageSubmissionOptions,
): MessageSubmissionHook => {
  const {
    chatId,
    attachments,
    selectedModelId,
    selectedTool,
    isEditMode,
    parentMessageId,
    getInputValue,
    sendMessage,
    editorRef,
    width,
  } = options;

  const { mutate: saveChatMessage } = useSaveMessageMutation();
  const setMessages = useSetMessages();

  const handleUrlUpdate = useCallback(() => {
    if (window.location.pathname === '/') {
      window.history.pushState({}, '', `/chat/${chatId}`);
    }
  }, [chatId]);

  const getEffectiveParentMessageId = useCallback(() => {
    return isEditMode
      ? parentMessageId
      : chatStore.getState().getLastMessageId();
  }, [isEditMode, parentMessageId]);

  const handleEditModeMessageTrimming = useCallback(() => {
    if (!isEditMode) {
      return;
    }

    if (parentMessageId === null) {
      setMessages([]);
    } else {
      const currentMessages = chatStore.getState().messages;
      const parentIndex = currentMessages.findIndex(
        (msg) => msg.id === parentMessageId,
      );
      if (parentIndex !== -1) {
        const messagesUpToParent = currentMessages.slice(0, parentIndex + 1);
        setMessages(messagesUpToParent);
      }
    }
  }, [isEditMode, parentMessageId, setMessages]);

  const createChatMessage = useCallback(
    (input: string, effectiveParentMessageId: string | null): ChatMessage => ({
      id: generateUUID(),
      parts: [
        ...attachments.map((attachment) => ({
          type: 'file' as const,
          url: attachment.url,
          name: attachment.name,
          mediaType: attachment.contentType,
        })),
        {
          type: 'text',
          text: input,
        },
      ],
      metadata: {
        createdAt: new Date(),
        parentMessageId: effectiveParentMessageId,
        selectedModel: selectedModelId,
        selectedTool:
          selectedTool &&
          ['generateImage', 'createDocument'].includes(selectedTool)
            ? (selectedTool as UiToolName)
            : undefined,
      },
      role: 'user',
    }),
    [attachments, selectedModelId, selectedTool],
  );

  const handlePostSubmitFocus = useCallback(() => {
    if (width && width > 768) {
      editorRef.current?.focus();
    }
  }, [width, editorRef]);

  const submitMessage = useCallback(() => {
    const input = getInputValue();

    handleUrlUpdate();
    const effectiveParentMessageId = getEffectiveParentMessageId();
    handleEditModeMessageTrimming();

    const message = createChatMessage(input, effectiveParentMessageId);

    saveChatMessage({
      message,
      chatId,
    });

    sendMessage(message);
    handlePostSubmitFocus();
  }, [
    getInputValue,
    handleUrlUpdate,
    getEffectiveParentMessageId,
    handleEditModeMessageTrimming,
    createChatMessage,
    saveChatMessage,
    chatId,
    sendMessage,
    handlePostSubmitFocus,
  ]);

  return {
    submitMessage,
  };
};
