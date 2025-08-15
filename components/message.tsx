'use client';
import type { UseChatHelpers } from '@ai-sdk/react';
import equal from 'fast-deep-equal';
import { AnimatePresence, motion } from 'motion/react';
import { memo, useState } from 'react';
import type { ChatMessage } from '@/lib/ai/types';
import type { Vote } from '@/lib/db/schema';
import { useChatId, useMessageById } from '@/lib/stores/chat-store';
import { cn, getAttachmentsFromMessage } from '@/lib/utils';
import { AttachmentList } from './attachment-list';
import { ImageModal } from './image-modal';
import { MessageActions } from './message-actions';
import { SourcesAnnotations } from './message-annotations';
import { MessageEditor } from './message-editor';
import { MessageParts } from './message-parts';
import { Skeleton } from './ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';

type BaseMessageProps = {
  messageId: string;
  vote: Vote | undefined;
  isLoading: boolean;
  isReadonly: boolean;
  sendMessage: UseChatHelpers<ChatMessage>['sendMessage'];
  parentMessageId: string | null;
};

const PureUserMessage = ({
  messageId,
  vote,
  isLoading,
  isReadonly,
  sendMessage,
  parentMessageId,
}: BaseMessageProps) => {
  const chatId = useChatId();
  const message = useMessageById(messageId);
  const [mode, setMode] = useState<'view' | 'edit'>('view');
  const [imageModal, setImageModal] = useState<{
    isOpen: boolean;
    imageUrl: string;
    imageName?: string;
  }>({
    isOpen: false,
    imageUrl: '',
    imageName: undefined,
  });

  const handleImageClick = (imageUrl: string, imageName?: string) => {
    setImageModal({
      isOpen: true,
      imageUrl,
      imageName,
    });
  };

  const handleImageModalClose = () => {
    setImageModal({
      isOpen: false,
      imageUrl: '',
      imageName: undefined,
    });
  };

  if (!message) {
    return null;
  }
  const textPart = message.parts.find((part) => part.type === 'text');
  if (!(textPart && chatId)) {
    return null;
  }

  return (
    <div
      className={cn(
        'flex w-full flex-col items-end',
        mode === 'edit'
          ? 'max-w-full'
          : 'group-data-[role=user]/message:ml-auto group-data-[role=user]/message:w-fit group-data-[role=user]/message:max-w-2xl',
      )}
    >
      <div
        className={cn(
          'flex w-full flex-col gap-4',
          message.role === 'user' && mode !== 'edit' && 'items-end',
        )}
      >
        {mode === 'view' ? (
          isReadonly ? (
            <div
              className="flex w-full flex-col gap-4 rounded-2xl border bg-muted px-3 py-2 text-left dark:border-zinc-700"
              data-testid="message-content"
            >
              <AttachmentList
                attachments={getAttachmentsFromMessage(message)}
                onImageClick={handleImageClick}
                testId="message-attachments"
              />
              <pre className="whitespace-pre-wrap font-sans">
                {textPart.text}
              </pre>
            </div>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className="cursor-pointer transition-opacity hover:opacity-80"
                  data-testid="message-content"
                  onClick={() => setMode('edit')}
                  type="button"
                >
                  <div
                    className="flex w-full flex-col gap-4 rounded-2xl border bg-muted px-3 py-2 text-left dark:border-zinc-700"
                    data-testid="message-content"
                  >
                    <AttachmentList
                      attachments={getAttachmentsFromMessage(message)}
                      onImageClick={handleImageClick}
                      testId="message-attachments"
                    />
                    <pre className="whitespace-pre-wrap font-sans">
                      {textPart.text}
                    </pre>
                  </div>
                </button>
              </TooltipTrigger>
              <TooltipContent>Click to edit message</TooltipContent>
            </Tooltip>
          )
        ) : (
          <div className="flex flex-row items-start gap-2">
            <MessageEditor
              chatId={chatId}
              key={message.id}
              message={message}
              parentMessageId={parentMessageId}
              sendMessage={sendMessage}
              setMode={setMode}
            />
          </div>
        )}

        <div className="self-end">
          <MessageActions
            chatId={chatId}
            isLoading={isLoading}
            isReadOnly={isReadonly}
            key={`action-${message.id}`}
            messageId={message.id}
            role={message.role}
            sendMessage={sendMessage}
            vote={vote}
          />
        </div>
      </div>
      <ImageModal
        imageName={imageModal.imageName}
        imageUrl={imageModal.imageUrl}
        isOpen={imageModal.isOpen}
        onClose={handleImageModalClose}
      />
    </div>
  );
};

const UserMessage = memo(PureUserMessage, (prevProps, nextProps) => {
  if (prevProps.messageId !== nextProps.messageId) {
    return false;
  }
  if (prevProps.isReadonly !== nextProps.isReadonly) {
    return false;
  }
  if (prevProps.sendMessage !== nextProps.sendMessage) {
    return false;
  }
  if (prevProps.parentMessageId !== nextProps.parentMessageId) {
    return false;
  }
  if (!equal(prevProps.vote, nextProps.vote)) {
    return false;
  }
  if (prevProps.isLoading !== nextProps.isLoading) {
    return false;
  }

  return true;
});

const PureAssistantMessage = ({
  messageId,
  vote,
  isLoading,
  isReadonly,
  sendMessage,
}: Omit<BaseMessageProps, 'parentMessageId'>) => {
  const chatId = useChatId();
  const message = useMessageById(messageId);

  if (!(chatId && message)) {
    return null;
  }

  return (
    <div className="w-full">
      <div className="flex w-full flex-col gap-4">
        {message.metadata?.isPartial && message.parts.length === 0 && (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-4/5 rounded-full" />
            <Skeleton className="h-4 w-3/5 rounded-full" />
            <Skeleton className="h-4 w-2/5 rounded-full" />
          </div>
        )}

        <MessageParts
          isLoading={isLoading}
          isReadonly={isReadonly}
          message={message}
        />

        <SourcesAnnotations
          key={`sources-annotations-${message.id}`}
          parts={message.parts}
        />

        <MessageActions
          chatId={chatId}
          isLoading={isLoading}
          isReadOnly={isReadonly}
          key={`action-${message.id}`}
          messageId={message.id}
          role={message.role}
          sendMessage={sendMessage}
          vote={vote}
        />
      </div>
    </div>
  );
};

const AssistantMessage = memo(PureAssistantMessage, (prevProps, nextProps) => {
  if (prevProps.messageId !== nextProps.messageId) {
    return false;
  }
  if (prevProps.vote !== nextProps.vote) {
    return false;
  }
  if (prevProps.isLoading !== nextProps.isLoading) {
    return false;
  }
  if (prevProps.isReadonly !== nextProps.isReadonly) {
    return false;
  }
  if (prevProps.sendMessage !== nextProps.sendMessage) {
    return false;
  }

  return true;
});

const PurePreviewMessage = ({
  messageId,
  vote,
  isLoading,
  isReadonly,
  sendMessage,
  parentMessageId,
}: BaseMessageProps) => {
  const message = useMessageById(messageId);
  if (!message) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        animate={{ y: 0, opacity: 1 }}
        className="group/message mx-auto w-full max-w-3xl px-4"
        data-role={message.role}
        data-testid={`message-${message.role}`}
        initial={{ y: 5, opacity: 0 }}
      >
        {message.role === 'user' ? (
          <UserMessage
            isLoading={isLoading}
            isReadonly={isReadonly}
            messageId={messageId}
            parentMessageId={parentMessageId}
            sendMessage={sendMessage}
            vote={vote}
          />
        ) : (
          <AssistantMessage
            isLoading={isLoading}
            isReadonly={isReadonly}
            messageId={messageId}
            sendMessage={sendMessage}
            vote={vote}
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export const PreviewMessage = memo(
  PurePreviewMessage,
  (prevProps, nextProps) => {
    if (prevProps.isLoading !== nextProps.isLoading) {
      return false;
    }
    if (prevProps.messageId !== nextProps.messageId) {
      return false;
    }
    if (prevProps.sendMessage !== nextProps.sendMessage) {
      return false;
    }
    if (!equal(prevProps.vote, nextProps.vote)) {
      return false;
    }
    if (prevProps.parentMessageId !== nextProps.parentMessageId) {
      return false;
    }

    return true;
  },
);
