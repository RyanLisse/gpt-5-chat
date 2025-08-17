import { useMemo } from 'react';
import type { ChatMessage } from '@/lib/ai/types';

type ReasoningPart = Extract<
  ChatMessage['parts'][number],
  { type: 'reasoning' }
>;

export type MessagePartGroup =
  | { kind: 'reasoning'; parts: ReasoningPart[]; endIndex: number }
  | {
      kind: 'single';
      part: Exclude<ChatMessage['parts'][number], ReasoningPart>;
      index: number;
    };

export const useMessagePartGroups = (parts: ChatMessage['parts']) => {
  return useMemo(() => {
    const result: MessagePartGroup[] = [];

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (part.type === 'reasoning') {
        const reasoningParts: ReasoningPart[] = [];
        while (i < parts.length && parts[i].type === 'reasoning') {
          reasoningParts.push(parts[i] as ReasoningPart);
          i++;
        }
        const endIndex = i - 1;
        result.push({ kind: 'reasoning', parts: reasoningParts, endIndex });
        i = endIndex;
      } else {
        result.push({ kind: 'single', part, index: i });
      }
    }

    return result;
  }, [parts]);
};