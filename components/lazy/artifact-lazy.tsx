'use client';

import type { UseChatHelpers } from '@ai-sdk/react';
import { lazy, Suspense } from 'react';
import type { ChatMessage } from '@/lib/ai/types';
import type { Vote } from '@/lib/db/schema';
import { ArtifactSkeleton } from '../loading-fallbacks';

// Lazy load the Artifact component
const ArtifactComponent = lazy(() =>
  import('../artifact').then((module) => ({
    default: module.Artifact,
  })),
);

type ArtifactLazyProps = {
  chatId: string;
  messages: ChatMessage[];
  votes: Vote[] | undefined;
  sendMessage: UseChatHelpers<ChatMessage>['sendMessage'];
  regenerate: UseChatHelpers<ChatMessage>['regenerate'];
  status: UseChatHelpers<ChatMessage>['status'];
  stop: UseChatHelpers<ChatMessage>['stop'];
  isReadonly: boolean;
  isAuthenticated: boolean;
};

export function ArtifactLazy(props: ArtifactLazyProps) {
  return (
    <Suspense fallback={<ArtifactSkeleton />}>
      <ArtifactComponent {...props} />
    </Suspense>
  );
}
