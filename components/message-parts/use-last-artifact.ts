import type { ChatMessage } from '@/lib/ai/types';
import { chatStore } from '@/lib/stores/chat-store';

export const useLastArtifact = () => {
  const isLastArtifact = (
    messages: ChatMessage[],
    currentToolCallId: string,
  ): boolean => {
    let lastArtifact: { messageIndex: number; toolCallId: string } | null =
      null;

    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];
      if (message.role === 'assistant') {
        for (const part of message.parts) {
          if (
            (part.type === 'tool-createDocument' ||
              part.type === 'tool-updateDocument') &&
            part.state === 'output-available'
          ) {
            lastArtifact = {
              messageIndex: i,
              toolCallId: part.toolCallId,
            };
            break;
          }
        }
        if (lastArtifact) {
          break;
        }
      }
    }

    return lastArtifact?.toolCallId === currentToolCallId;
  };

  const checkIsLastArtifact = (currentToolCallId: string): boolean => {
    return isLastArtifact(chatStore.getState().messages, currentToolCallId);
  };

  return { checkIsLastArtifact };
};
