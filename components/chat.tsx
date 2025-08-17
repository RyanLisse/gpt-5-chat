'use client';
import { useChat } from '@ai-sdk/react';
import { useQuery } from '@tanstack/react-query';
import { DefaultChatTransport } from 'ai';
import { useSession } from 'next-auth/react';
import { useCallback, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { ChatHeader } from '@/components/chat-header';
import { CloneChatButton } from '@/components/clone-chat-button';
import { useSidebar } from '@/components/ui/sidebar';
import { useSaveMessageMutation } from '@/hooks/chat-sync-hooks';
import { useArtifactSelector } from '@/hooks/use-artifact';
import { useAutoResume } from '@/hooks/use-auto-resume';
import type { ChatMessage } from '@/lib/ai/types';
import { chatState, chatStore, ZustandChat } from '@/lib/stores/chat-store';
import { cn, fetchWithErrorHandlers, generateUUID } from '@/lib/utils';
import { useTRPC } from '@/trpc/react';
import { useDataStream } from './data-stream-provider';
import { ArtifactLazy as Artifact } from './lazy/artifact-lazy';
import { MultimodalInputLazy as MultimodalInput } from './lazy/multimodal-input-lazy';
import { Messages } from './messages';

function useRecreateChat(id: string, initialMessages: ChatMessage[]) {
  useEffect(() => {
    if (id !== chatStore.getState().id) {
      chatStore.getState().setNewChat(id, initialMessages);
    }
  }, [id, initialMessages]);
}

// Hook for managing chat callbacks with proper error handling
function useChatCallbacks(id: string, isAuthenticated: boolean) {
  const { mutate: saveChatMessage } = useSaveMessageMutation();
  const { setDataStream } = useDataStream();

  const onFinish = useCallback(
    ({ message }: { message: ChatMessage }) => {
      saveChatMessage({
        message,
        chatId: id,
      });
    },
    [saveChatMessage, id],
  );

  const onData = useCallback(
    (dataPart: any) => {
      setDataStream((ds) => (ds ? [...ds, dataPart] : []));
    },
    [setDataStream],
  );

  const onError = useCallback((error: Error) => {
    const cause = error.cause;
    if (cause && typeof cause === 'string') {
      toast.error(error.message ?? 'An error occured, please try again!', {
        description: cause,
      });
    } else {
      toast.error(error.message ?? 'An error occured, please try again!');
    }
  }, []);

  const prepareSendMessagesRequest = useCallback(
    ({ messages: requestMessages, id: requestId, body }: any) => {
      return {
        body: {
          id: requestId,
          message: requestMessages.at(-1),
          prevMessages: isAuthenticated ? [] : requestMessages.slice(0, -1),
          ...body,
        },
      };
    },
    [isAuthenticated],
  );

  return { onFinish, onData, onError, prepareSendMessagesRequest };
}

// Hook for managing chat instance and configuration
function useChatInstance(id: string, callbacks: any) {
  const { onFinish, onData, onError, prepareSendMessagesRequest } = callbacks;

  const chat = useMemo(() => {
    return new ZustandChat<ChatMessage>({
      state: chatState,
      id,
      generateId: generateUUID,
      onFinish,
      transport: new DefaultChatTransport({
        api: '/api/chat',
        fetch: fetchWithErrorHandlers,
        prepareSendMessagesRequest,
      }),
      onData,
      onError,
    });
  }, [id, onFinish, prepareSendMessagesRequest, onData, onError]);

  return chat;
}

// Configuration for chat votes query
interface ChatVotesConfig {
  chatId: string;
  messagesLength: number;
  isReadonly: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
}

// Hook for managing votes query with proper conditions
function useChatVotes(config: ChatVotesConfig) {
  const { chatId, messagesLength, isReadonly, isAuthenticated, isLoading } =
    config;
  const trpc = useTRPC();

  return useQuery({
    ...trpc.vote.getVotes.queryOptions({ chatId }),
    enabled:
      messagesLength >= 2 && !isReadonly && isAuthenticated && !isLoading,
  });
}

// Main chat area component
function ChatMainArea({
  id,
  isReadonly,
  messages,
  regenerate,
  sendMessage,
  votes,
  status,
  stop,
  user,
  isArtifactVisible,
  sidebarState,
}: any) {
  return (
    <div
      className={cn(
        '@container flex h-dvh min-w-0 max-w-screen flex-col bg-background md:max-w-[calc(100vw-var(--sidebar-width))]',
        sidebarState === 'collapsed' && 'md:max-w-screen',
      )}
    >
      <ChatHeader
        chatId={id}
        hasMessages={messages.length > 0}
        isReadonly={isReadonly}
        user={user}
      />

      <Messages
        isReadonly={isReadonly}
        isVisible={!isArtifactVisible}
        regenerate={regenerate}
        sendMessage={sendMessage}
        votes={votes}
      />

      {isReadonly ? (
        <CloneChatButton chatId={id} className="w-full" />
      ) : (
        <MultimodalInput
          chatId={id}
          parentMessageId={chatStore.getState().getLastMessageId()}
          sendMessage={sendMessage}
          status={status}
          stop={stop}
        />
      )}
    </div>
  );
}

export function Chat({
  id,
  initialMessages,
  isReadonly,
}: {
  id: string;
  initialMessages: ChatMessage[];
  isReadonly: boolean;
}) {
  const { data: session } = useSession();

  useRecreateChat(id, initialMessages);

  const isAuthenticated = Boolean(session?.user);
  const isLoading = id !== chatStore.getState().id;

  const callbacks = useChatCallbacks(id, isAuthenticated);
  const chat = useChatInstance(id, callbacks);

  const { messages, status, stop, resumeStream, sendMessage, regenerate } =
    useChat<ChatMessage>({
      // @ts-expect-error #private property required but not really
      chat,
      experimental_throttle: 100,
    });

  useAutoResume({
    autoResume: true,
    initialMessages,
    resumeStream,
  });

  const { data: votes } = useChatVotes({
    chatId: id,
    messagesLength: messages.length,
    isReadonly,
    isAuthenticated,
    isLoading,
  });

  const { state } = useSidebar();
  const isArtifactVisible = useArtifactSelector(
    (artifactState) => artifactState.isVisible,
  );

  return (
    <>
      <ChatMainArea
        id={id}
        isArtifactVisible={isArtifactVisible}
        isReadonly={isReadonly}
        messages={messages}
        regenerate={regenerate}
        sendMessage={sendMessage}
        sidebarState={state}
        status={status}
        stop={stop}
        user={session?.user}
        votes={votes}
      />

      <Artifact
        chatId={id}
        isAuthenticated={isAuthenticated}
        isReadonly={isReadonly}
        messages={messages}
        regenerate={regenerate}
        sendMessage={sendMessage}
        status={status}
        stop={stop}
        votes={votes}
      />
    </>
  );
}
