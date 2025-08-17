import type { UseChatHelpers } from '@ai-sdk/react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import equal from 'fast-deep-equal';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { memo } from 'react';
import { toast } from 'sonner';
import type { ChatMessage } from '@/lib/ai/types';
import type { Vote } from '@/lib/db/schema';
import { useCopy } from '@/lib/hooks/use-copy';
import { chatStore } from '@/lib/stores/chat-store';
import { useMessageTree } from '@/providers/message-tree-provider';
import { useTRPC } from '@/trpc/react';
import { CopyIcon, ThumbDownIcon, ThumbUpIcon } from './icons';
import { RetryButton } from './retry-button';
import { Button } from './ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './ui/tooltip';

export function PureMessageActions({
  chatId,
  messageId,
  role,
  vote,
  isLoading,
  isReadOnly,
  sendMessage,
}: {
  chatId: string;
  messageId: string;
  role: string;
  vote: Vote | undefined;
  isLoading: boolean;
  isReadOnly: boolean;
  sendMessage: UseChatHelpers<ChatMessage>['sendMessage'];
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { copy } = useCopy({
    onSuccess: () => toast.success('Copied to clipboard!'),
    onError: () => toast.error('Failed to copy to clipboard'),
  });
  const { data: session } = useSession();
  const { getMessageSiblingInfo, navigateToSibling } = useMessageTree();

  const isAuthenticated = Boolean(session?.user);

  const voteMessageMutation = useMutation(
    trpc.vote.voteMessage.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.vote.getVotes.queryKey({ chatId }),
        });
      },
    }),
  );

  // Get sibling info for navigation
  const siblingInfo = getMessageSiblingInfo(messageId);
  const hasSiblings = siblingInfo && siblingInfo.siblings.length > 1;

  if (isLoading) {
    return null;
  }

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex flex-row gap-0.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              className="h-7 w-7 p-0 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              onClick={() => {
                const message = chatStore
                  .getState()
                  .messages.find((m) => m.id === messageId);
                if (!message) {
                  return;
                }

                const textFromParts = message.parts
                  ?.filter((part) => part.type === 'text')
                  .map((part) => part.text)
                  .join('\n')
                  .trim();

                if (!textFromParts) {
                  toast.error("There's no text to copy!");
                  return;
                }

                copy(textFromParts);
              }}
              size="sm"
              variant="ghost"
            >
              <CopyIcon size={14} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Copy</TooltipContent>
        </Tooltip>

        {hasSiblings && (
          <div className="flex items-center justify-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  className="h-7 w-7 px-0 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  disabled={siblingInfo.siblingIndex === 0}
                  onClick={() => navigateToSibling(messageId, 'prev')}
                  size="sm"
                  variant="ghost"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Previous version</TooltipContent>
            </Tooltip>

            <span className="text-muted-foreground text-xs">
              {siblingInfo.siblingIndex + 1}/{siblingInfo.siblings.length}
            </span>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  className="h-7 w-7 px-0 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  disabled={
                    siblingInfo.siblingIndex === siblingInfo.siblings.length - 1
                  }
                  onClick={() => navigateToSibling(messageId, 'next')}
                  size="sm"
                  variant="ghost"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Next version</TooltipContent>
            </Tooltip>
          </div>
        )}

        {role === 'assistant' && !isReadOnly && isAuthenticated && (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  className="!pointer-events-auto h-7 w-7 p-0 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  data-testid="message-upvote"
                  disabled={vote?.isUpvoted || !isAuthenticated}
                  onClick={() => {
                    toast.promise(
                      voteMessageMutation.mutateAsync({
                        chatId,
                        messageId,
                        type: 'up' as const,
                      }),
                      {
                        loading: 'Upvoting Response...',
                        success: 'Upvoted Response!',
                        error: 'Failed to upvote response.',
                      },
                    );
                  }}
                  size="sm"
                  variant="ghost"
                >
                  <ThumbUpIcon size={14} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Upvote Response</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  className="!pointer-events-auto h-7 w-7 p-0 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  data-testid="message-downvote"
                  disabled={(vote && !vote.isUpvoted) || !session?.user}
                  onClick={() => {
                    toast.promise(
                      voteMessageMutation.mutateAsync({
                        chatId,
                        messageId,
                        type: 'down' as const,
                      }),
                      {
                        loading: 'Downvoting Response...',
                        success: 'Downvoted Response!',
                        error: 'Failed to downvote response.',
                      },
                    );
                  }}
                  size="sm"
                  variant="ghost"
                >
                  <ThumbDownIcon size={14} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Downvote Response</TooltipContent>
            </Tooltip>
            {!isReadOnly && sendMessage && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <RetryButton
                    messageId={messageId}
                    sendMessage={sendMessage}
                  />
                </TooltipTrigger>
                <TooltipContent>Retry</TooltipContent>
              </Tooltip>
            )}
            {(() => {
              const message = chatStore
                .getState()
                .messages.find((m) => m.id === messageId);
              return (
                message?.metadata?.selectedModel && (
                  <div className="ml-2 flex items-center">
                    <span className="rounded bg-muted px-1.5 py-0.5 text-muted-foreground text-xs">
                      {message.metadata.selectedModel}
                    </span>
                  </div>
                )
              );
            })()}
          </>
        )}
      </div>
    </TooltipProvider>
  );
}

export const MessageActions = memo(
  PureMessageActions,
  (prevProps, nextProps) => {
    if (!equal(prevProps.vote, nextProps.vote)) {
      return false;
    }
    if (prevProps.chatId !== nextProps.chatId) {
      return false;
    }
    if (prevProps.messageId !== nextProps.messageId) {
      return false;
    }
    if (prevProps.role !== nextProps.role) {
      return false;
    }
    if (prevProps.isLoading !== nextProps.isLoading) {
      return false;
    }
    if (prevProps.isReadOnly !== nextProps.isReadOnly) {
      return false;
    }
    if (prevProps.sendMessage !== nextProps.sendMessage) {
      return false;
    }

    return true;
  },
);
