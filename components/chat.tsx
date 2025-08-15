'use client';
import { useChat } from '@ai-sdk/react';
import { useQuery } from '@tanstack/react-query';
import { DefaultChatTransport } from 'ai';
import { useSession } from 'next-auth/react';
import { useEffect, useMemo } from 'react';
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
import { Artifact } from './artifact';
import { useDataStream } from './data-stream-provider';
import { Messages } from './messages';
import { MultimodalInput } from './multimodal-input';

function useRecreateChat(id: string, initialMessages: ChatMessage[]) {
  useEffect(() => {
    if (id !== chatStore.getState().id) {
      chatStore.getState().setNewChat(id, initialMessages || []);
    }
  }, [id, initialMessages]);
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
  const trpc = useTRPC();
  const { data: session } = useSession();
  const { mutate: saveChatMessage } = useSaveMessageMutation();

  const { setDataStream } = useDataStream();

  // Workaround to act as `shouldRecreateChat` functionality in the `useChat` hook
  // If the id is different from the stored id, reset the chat with new messages
  useRecreateChat(id, initialMessages);

  const isAuthenticated = Boolean(session?.user);
  const isLoading = id !== chatStore.getState().id;

  const chat = useMemo(() => {
    return new ZustandChat<ChatMessage>({
      state: chatState,

      id,
      // messages: initialMessages,
      // sendExtraMessageFields: true,
      generateId: generateUUID,
      onFinish: ({ message }) => {
        saveChatMessage({
          message,
          chatId: id,
        });
      },
      transport: new DefaultChatTransport({
        api: '/api/chat',
        fetch: fetchWithErrorHandlers,
        prepareSendMessagesRequest({ messages, id, body }) {
          return {
            body: {
              id,
              message: messages.at(-1),
              prevMessages: isAuthenticated ? [] : messages.slice(0, -1),
              ...body,
            },
          };
        },
      }),
      onData: (dataPart) => {
        setDataStream((ds) => (ds ? [...ds, dataPart] : []));
      },
      onError: (error) => {
        const cause = error.cause;
        if (cause && typeof cause === 'string') {
          toast.error(error.message ?? 'An error occured, please try again!', {
            description: cause,
          });
        } else {
          toast.error(error.message ?? 'An error occured, please try again!');
        }
      },
    });
  }, [id, saveChatMessage, setDataStream, isAuthenticated]);

  const { messages, status, stop, resumeStream, sendMessage, regenerate } =
    useChat<ChatMessage>({
      // @ts-expect-error #private property required but not really
      chat,
      experimental_throttle: 100,
    });
  // Auto-resume functionality
  useAutoResume({
    autoResume: true,
    initialMessages,
    resumeStream,
  });

  const { data: votes } = useQuery({
    ...trpc.vote.getVotes.queryOptions({ chatId: id }),
    enabled:
      messages.length >= 2 &&
      !isReadonly &&
      Boolean(session?.user) &&
      !isLoading,
  });

  const { state } = useSidebar();
  const isArtifactVisible = useArtifactSelector((state) => state.isVisible);

  return (
    <>
      <div
        className={cn(
          '@container flex h-dvh min-w-0 max-w-screen flex-col bg-background md:max-w-[calc(100vw-var(--sidebar-width))]',
          state === 'collapsed' && 'md:max-w-screen',
        )}
      >
        <ChatHeader
          chatId={id}
          hasMessages={messages.length > 0}
          isReadonly={isReadonly}
          user={session?.user}
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

      <Artifact
        chatId={id}
        isAuthenticated={Boolean(session?.user)}
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
