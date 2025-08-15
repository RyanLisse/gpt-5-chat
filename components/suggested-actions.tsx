'use client';

import type { UseChatHelpers } from '@ai-sdk/react';
import { motion } from 'motion/react';
import { memo } from 'react';
import type { ModelId } from '@/lib/ai/model-id';
import type { ChatMessage } from '@/lib/ai/types';
import { Button } from './ui/button';

type SuggestedActionsProps = {
  chatId: string;
  sendMessage: UseChatHelpers<ChatMessage>['sendMessage'];
  selectedModelId: ModelId;
};

function PureSuggestedActions({
  chatId,
  sendMessage,
  selectedModelId,
}: SuggestedActionsProps) {
  const suggestedActions = [
    {
      title: 'What are the advantages',
      label: 'of using Next.js?',
      action: 'What are the advantages of using Next.js?',
    },
    {
      title: 'Write code to',
      label: `demonstrate djikstra's algorithm`,
      action: `Write code to demonstrate djikstra's algorithm`,
    },
    {
      title: 'Help me write an essay',
      label: `about silicon valley`,
      action: `Help me write an essay about silicon valley`,
    },
    {
      title: 'What is the weather',
      label: 'in San Francisco?',
      action: 'What is the weather in San Francisco?',
    },
  ];

  return (
    <div
      className="grid w-full gap-2 sm:grid-cols-2"
      data-testid="suggested-actions"
    >
      {suggestedActions.map((suggestedAction, index) => (
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className={index > 1 ? 'hidden sm:block' : 'block'}
          exit={{ opacity: 0, y: 20 }}
          initial={{ opacity: 0, y: 20 }}
          key={`suggested-action-${suggestedAction.title}-${index}`}
          transition={{ delay: 0.05 * index }}
        >
          <Button
            className="h-auto w-full flex-1 items-start justify-start gap-1 rounded-xl border px-4 py-3.5 text-left text-sm sm:flex-col"
            onClick={async () => {
              window.history.replaceState({}, '', `/chat/${chatId}`);

              sendMessage(
                {
                  role: 'user',
                  parts: [{ type: 'text', text: suggestedAction.action }],
                  metadata: {
                    selectedModel: selectedModelId,
                    createdAt: new Date(),
                    parentMessageId: null,
                  },
                },
                {
                  body: {
                    data: {
                      reason: false,
                      generateImage: false,
                      writeOrCode: false,
                    },
                  },
                },
              );
            }}
            variant="ghost"
          >
            <span className="font-medium">{suggestedAction.title}</span>
            <span className="text-muted-foreground">
              {suggestedAction.label}
            </span>
          </Button>
        </motion.div>
      ))}
    </div>
  );
}

export const SuggestedActions = memo(PureSuggestedActions, () => true);
