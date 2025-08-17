'use client';

import { notFound } from 'next/navigation';
import { useDeferredValue } from 'react';
import { ChatPage } from '@/app/(chat)/chat/[id]/chat-page';
import { WithSkeleton } from '@/components/ui/skeleton';
import { useChatId } from '@/providers/chat-id-provider';
import { ChatHome } from '../../chat-home';
import { SharedChatPage } from '../../share/[id]/shared-chat-page';

// Loading skeleton component
function DeferredChatSkeleton() {
  return (
    <div className="flex h-screen w-full">
      <WithSkeleton className="h-full w-full" isLoading={true}>
        <div className="flex h-screen w-full" />
      </WithSkeleton>
    </div>
  );
}

export function DeferredChatPage() {
  const { id, type } = useChatId();

  const { id: deferredId, type: deferredType } = useDeferredValue({
    id,
    type,
  });

  // Early validation
  if (!id) {
    return notFound();
  }

  // Show skeleton when deferred values don't match current values
  if (deferredId !== id || deferredType !== type) {
    return <DeferredChatSkeleton />;
  }

  // Page type mapping
  const pageComponents = {
    provisional: ChatHome,
    shared: SharedChatPage,
    chat: ChatPage,
  };

  const PageComponent =
    pageComponents[deferredType as keyof typeof pageComponents];

  return PageComponent ? <PageComponent id={deferredId} /> : notFound();
}
