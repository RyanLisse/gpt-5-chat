'use client';
import { useSuspenseQuery } from '@tanstack/react-query';
import { notFound } from 'next/navigation';
import { memo, useMemo } from 'react';
import { Chat } from '@/components/chat';
import { DataStreamHandler } from '@/components/data-stream-handler';
import type { UiToolName } from '@/lib/ai/types';
import { getDefaultThread } from '@/lib/thread-utils';
import { ChatInputProvider } from '@/providers/chat-input-provider';
import { useTRPC } from '@/trpc/react';

const MemoizedChatWrapper = memo(function MemoizedChatWrapper({
  id,
  initialMessages,
  isReadonly,
  initialTool,
}: {
  id: string;
  initialMessages: any[];
  isReadonly: boolean;
  initialTool: UiToolName | null;
}) {
  return (
    <ChatInputProvider initialTool={initialTool} localStorageEnabled={true}>
      <Chat
        id={id}
        initialMessages={initialMessages}
        isReadonly={isReadonly}
        key={id}
      />
      <DataStreamHandler id={id} />
    </ChatInputProvider>
  );
});

export function ChatPage({ id }: { id: string }) {
  const trpc = useTRPC();

  const { data: chat } = useSuspenseQuery(
    trpc.chat.getChatById.queryOptions({ chatId: id || '' }),
  );
  const { data: messages } = useSuspenseQuery(
    trpc.chat.getChatMessages.queryOptions({ chatId: id || '' }),
  );

  const initialThreadMessages = useMemo(() => {
    if (!messages) {
      return [];
    }
    return getDefaultThread(
      messages.map((msg) => ({ ...msg, id: msg.id.toString() })),
    );
  }, [messages]);

  const initialTool = useMemo<UiToolName | null>(() => null, [messages]);

  if (!id) {
    return notFound();
  }

  if (!chat) {
    return notFound();
  }

  return (
    <MemoizedChatWrapper
      id={chat.id}
      initialMessages={initialThreadMessages}
      initialTool={initialTool}
      isReadonly={false}
    />
  );
}
