'use client';
import type { UseChatHelpers } from '@ai-sdk/react';
import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import type { ModelId } from '@/lib/ai/model-id';
import type { ChatMessage } from '@/lib/ai/types';
import {
  getAttachmentsFromMessage,
  getTextContentFromMessage,
} from '@/lib/utils';
import { ChatInputProvider } from '@/providers/chat-input-provider';
import { MultimodalInput } from './multimodal-input';

export type MessageEditorProps = {
  chatId: string;
  message: ChatMessage;
  setMode: Dispatch<SetStateAction<'view' | 'edit'>>;
  sendMessage: UseChatHelpers<ChatMessage>['sendMessage'];
  parentMessageId: string | null;
};

function MessageEditorContent({
  chatId,
  setMode,
  sendMessage,
  parentMessageId,
}: MessageEditorProps & { onModelChange?: (modelId: string) => void }) {
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setMode('view');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [setMode]);

  const handleAppend = useCallback(
    async (
      message: Parameters<UseChatHelpers<ChatMessage>['sendMessage']>[0],
      options?: Parameters<UseChatHelpers<ChatMessage>['sendMessage']>[1],
    ) => {
      setIsSubmitting(true);

      setMode('view');

      // Save the message manually to keep local state in sync
      const res = await sendMessage(message, options);

      setIsSubmitting(false);
      return res;
    },
    [setIsSubmitting, setMode, sendMessage],
  );

  return (
    <div className="w-full" ref={containerRef}>
      <MultimodalInput
        chatId={chatId}
        isEditMode={true}
        parentMessageId={parentMessageId}
        sendMessage={handleAppend}
        status={isSubmitting ? 'submitted' : 'ready'}
        stop={() => setIsSubmitting(false)}
      />
    </div>
  );
}

export function MessageEditor(
  props: MessageEditorProps & { onModelChange?: (modelId: string) => void },
) {
  // Get the initial input value from the message content
  const initialInput = getTextContentFromMessage(props.message);
  const initialAttachments = getAttachmentsFromMessage(props.message);

  // Use selectedModel from the message metadata, or fall back to current selected model
  const messageSelectedModel = props.message.metadata?.selectedModel as ModelId;
  const { parentMessageId, ...rest } = props;
  return (
    <ChatInputProvider
      initialAttachments={initialAttachments}
      initialInput={initialInput}
      initialTool={props.message.metadata?.selectedTool}
      key={`edit-${props.message.id}`}
      localStorageEnabled={false}
      overrideModelId={messageSelectedModel || undefined}
    >
      <MessageEditorContent
        {...rest}
        parentMessageId={props.message.metadata?.parentMessageId}
      />
    </ChatInputProvider>
  );
}
