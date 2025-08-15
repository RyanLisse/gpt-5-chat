'use client';

import { useQueryClient } from '@tanstack/react-query';
import type { User } from 'next-auth';
import { useEffect, useRef } from 'react';
import { useGetAllChats } from '@/hooks/chat-sync-hooks';
import { useTRPC } from '@/trpc/react';

type ChatPrefetchProps = {
  user: User | undefined;
};

export function ChatPrefetch({ user }: ChatPrefetchProps) {
  const { data: chats } = useGetAllChats(10);
  const queryClient = useQueryClient();
  const trpc = useTRPC();
  const hasPrefetched = useRef(false);

  useEffect(() => {
    // Only prefetch for authenticated users with chats
    if (hasPrefetched.current || !user || !chats?.length) {
      return;
    }
    hasPrefetched.current = true;

    // Prefetch messages for each chat in the background
    const prefetchPromises = chats.map((chat) => {
      const queryOptions = trpc.chat.getChatMessages.queryOptions({
        chatId: chat.id,
      });
      return queryClient.prefetchQuery(queryOptions);
    });

    // Execute all prefetch operations in parallel
    Promise.allSettled(prefetchPromises)
      .then(() => {})
      .catch((_error) => {});
  }, [chats, user, queryClient, trpc.chat.getChatMessages]);

  return null;
}
