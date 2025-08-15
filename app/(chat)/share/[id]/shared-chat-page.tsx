'use client';
import { notFound } from 'next/navigation';
import { useMemo } from 'react';
import { Chat } from '@/components/chat';
import { WithSkeleton } from '@/components/ui/skeleton';
import { usePublicChat, usePublicChatMessages } from '@/hooks/use-shared-chat';
import { getDefaultThread } from '@/lib/thread-utils';

export function SharedChatPage({ id }: { id: string }) {
  const {
    data: chat,
    isLoading: isChatLoading,
    error: chatError,
  } = usePublicChat(id as string);
  const {
    data: messages,
    isLoading: isMessagesLoading,
    error: messagesError,
  } = usePublicChatMessages(id as string);

  const initialThreadMessages = useMemo(() => {
    if (!messages) {
      return [];
    }
    return getDefaultThread(
      messages.map((msg) => ({ ...msg, id: msg.id.toString() })),
    );
  }, [messages]);

  if (!id) {
    return notFound();
  }

  if (chatError || messagesError) {
    // TODO: Replace for error page
    return (
      <div className="flex h-dvh items-center justify-center">
        <div className="text-muted-foreground">
          This chat is not available or has been set to private
        </div>
      </div>
    );
  }

  if (!(isChatLoading || chat)) {
    return notFound();
  }

  if (isMessagesLoading || isChatLoading) {
    return (
      <WithSkeleton
        className="h-full w-full"
        isLoading={isChatLoading || isMessagesLoading}
      >
        <div className="flex h-screen w-full" />
      </WithSkeleton>
    );
  }

  if (!chat) {
    return notFound();
  }

  return (
    <>
      <WithSkeleton
        className="w-full"
        isLoading={isChatLoading || isMessagesLoading}
      >
        {/* // Shared chats don't need chat input provider */}
        <Chat
          id={chat.id}
          initialMessages={initialThreadMessages}
          isReadonly={true}
        />
      </WithSkeleton>
      {/* Shared chats don't need data handler */}
      {/* <DataStreamHandler id={id} /> */}
    </>
  );
}
