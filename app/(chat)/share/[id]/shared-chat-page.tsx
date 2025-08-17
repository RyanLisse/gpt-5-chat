'use client';
import { notFound } from 'next/navigation';
import { useMemo } from 'react';
import { Chat } from '@/components/chat';
import { WithSkeleton } from '@/components/ui/skeleton';
import { usePublicChat, usePublicChatMessages } from '@/hooks/use-shared-chat';
import { getDefaultThread } from '@/lib/thread-utils';

// Error state component
function SharedChatError() {
  return (
    <div className="flex h-dvh items-center justify-center">
      <div className="text-muted-foreground">
        This chat is not available or has been set to private
      </div>
    </div>
  );
}

// Loading state component
function SharedChatLoading() {
  return (
    <WithSkeleton className="h-full w-full" isLoading={true}>
      <div className="flex h-screen w-full" />
    </WithSkeleton>
  );
}

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

  // Early validation
  if (!id) {
    return notFound();
  }

  // Error handling
  if (chatError || messagesError) {
    return <SharedChatError />;
  }

  // Loading state
  if (isMessagesLoading || isChatLoading) {
    return <SharedChatLoading />;
  }

  // Final validation and fallback
  if (!chat) {
    return notFound();
  }

  // Success state - render chat
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
