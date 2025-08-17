import type { UseChatHelpers } from '@ai-sdk/react';
import type { ChatRequestOptions } from 'ai';
import { useCallback } from 'react';
import type { ChatMessage } from '@/lib/ai/types';

export function useToolbarAppend(
  sendMessage: UseChatHelpers<ChatMessage>['sendMessage'],
) {
  const append = useCallback(
    (
      message: Parameters<UseChatHelpers<ChatMessage>['sendMessage']>[0],
      options?: ChatRequestOptions,
    ) => {
      return sendMessage(message, {
        ...options,
        body: {
          data: {
            reason: false,
            generateImage: false,
            writeOrCode: false,
          },
        },
      });
    },
    [sendMessage],
  );

  return append;
}
