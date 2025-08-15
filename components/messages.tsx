import type { UseChatHelpers } from '@ai-sdk/react';
import { ArrowDown } from 'lucide-react';
import { memo } from 'react';
import { useStickToBottom } from 'use-stick-to-bottom';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { ChatMessage } from '@/lib/ai/types';
import type { Vote } from '@/lib/db/schema';
import {
  useChatId,
  useChatStatus,
  useMessageIds,
} from '@/lib/stores/chat-store';
import { cn } from '@/lib/utils';
import { Greeting } from './greeting';
import { PreviewMessage } from './message';
import { ResponseErrorMessage } from './response-error-message';
import { ThinkingMessage } from './thinking-message';
import { Button } from './ui/button';

type PureMessagesInternalProps = {
  votes: Vote[] | undefined;
  sendMessage: UseChatHelpers<ChatMessage>['sendMessage'];
  regenerate: (options?: any) => void;
  isReadonly: boolean;
};

const PureMessagesInternal = memo(function PureMessagesInternal({
  votes,
  sendMessage,
  regenerate,
  isReadonly,
}: PureMessagesInternalProps) {
  const chatId = useChatId();
  const status = useChatStatus();
  const messageIds = useMessageIds();

  // TODO: Verify if this is needed ai sdk v5
  // useDataStream();

  if (!chatId) {
    return null;
  }

  return (
    <>
      {messageIds.length === 0 && <Greeting />}

      {messageIds.map((messageId, index) => (
        <PreviewMessage
          isLoading={status === 'streaming' && messageIds.length - 1 === index}
          isReadonly={isReadonly}
          key={messageId}
          messageId={messageId}
          parentMessageId={index > 0 ? messageIds[index - 1] : null}
          sendMessage={sendMessage}
          vote={
            votes
              ? votes.find((vote) => vote.messageId === messageId)
              : undefined
          }
        />
      ))}

      {status === 'submitted' && messageIds.length > 0 && (
        // messages[messages.length - 1].role === 'user' &&
        <ThinkingMessage />
      )}

      {status === 'error' && <ResponseErrorMessage regenerate={regenerate} />}

      <div className="min-h-[24px] min-w-[24px] shrink-0" />
    </>
  );
});

export type MessagesProps = {
  votes: Vote[] | undefined;
  sendMessage: UseChatHelpers<ChatMessage>['sendMessage'];
  regenerate: (options?: any) => void;
  isReadonly: boolean;
  isVisible: boolean;
  onModelChange?: (modelId: string) => void;
};

function PureMessages({
  votes,
  sendMessage,
  regenerate,
  isReadonly,
  isVisible,
}: MessagesProps) {
  const { scrollRef, contentRef, scrollToBottom, isNearBottom, state } =
    useStickToBottom();

  return (
    <ScrollArea
      className="flex w-full flex-1 flex-col"
      ref={scrollRef}
      viewPortClassName=" [&>div]:!block"
    >
      <div
        className="container mx-auto flex h-full min-w-0 flex-col gap-6 px-2 pt-4 sm:max-w-2xl sm:px-4 md:max-w-3xl"
        ref={contentRef}
      >
        <PureMessagesInternal
          isReadonly={isReadonly}
          regenerate={regenerate}
          sendMessage={sendMessage}
          votes={votes}
        />
      </div>
      {/* Scroll to bottom button */}
      <div className="absolute bottom-4 flex w-full items-center justify-center">
        <Button
          className={cn(
            'z-10 rounded-full bg-background/80 shadow-lg hover:bg-muted',
            isNearBottom && 'hidden',
          )}
          onClick={() => scrollToBottom()}
          size="icon"
          variant="outline"
        >
          <ArrowDown className="size-4" />
        </Button>
      </div>
    </ScrollArea>
  );
}

export const Messages = memo(PureMessages, (prevProps, nextProps) => {
  if (prevProps.votes !== nextProps.votes) {
    return false;
  }
  if (prevProps.isReadonly !== nextProps.isReadonly) {
    return false;
  }
  // NOTE: isVisible avoids re-renders when the messages aren't visible
  if (prevProps.isVisible !== nextProps.isVisible) {
    return false;
  }
  if (prevProps.sendMessage !== nextProps.sendMessage) {
    return false;
  }
  if (prevProps.regenerate !== nextProps.regenerate) {
    return false;
  }

  return true;
});
