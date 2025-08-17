'use client';

import type { UseChatHelpers } from '@ai-sdk/react';
import { lazy, Suspense } from 'react';
import type { ChatMessage } from '@/lib/ai/types';
import { MultimodalInputSkeleton } from '../loading-fallbacks';

// Lazy load the heavy MultimodalInput component
const MultimodalInputComponent = lazy(() =>
  import('../multimodal-input').then((module) => ({
    default: module.MultimodalInput,
  })),
);

type MultimodalInputLazyProps = {
  chatId: string;
  status: UseChatHelpers<ChatMessage>['status'];
  stop: () => void;
  sendMessage: UseChatHelpers<ChatMessage>['sendMessage'];
  className?: string;
  isEditMode?: boolean;
  parentMessageId: string | null;
};

export function MultimodalInputLazy(props: MultimodalInputLazyProps) {
  return (
    <Suspense fallback={<MultimodalInputSkeleton />}>
      <MultimodalInputComponent {...props} />
    </Suspense>
  );
}
