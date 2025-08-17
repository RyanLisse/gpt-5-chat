import type { ChatMessage } from '@/lib/ai/types';

type ReasoningPart = Extract<
  ChatMessage['parts'][number],
  { type: 'reasoning' }
>;

type GroupedPart =
  | { kind: 'reasoning'; parts: ReasoningPart[]; endIndex: number }
  | {
      kind: 'single';
      part: Exclude<ChatMessage['parts'][number], ReasoningPart>;
      index: number;
    };

export function groupMessageParts(parts: ChatMessage['parts']): GroupedPart[] {
  const result: GroupedPart[] = [];
  let i = 0;

  while (i < parts.length) {
    const part = parts[i];

    if (part.type === 'reasoning') {
      const reasoningParts: ReasoningPart[] = [];
      const _startIndex = i;

      while (i < parts.length && parts[i].type === 'reasoning') {
        reasoningParts.push(parts[i] as ReasoningPart);
        i++;
      }

      const endIndex = i - 1;
      result.push({ kind: 'reasoning', parts: reasoningParts, endIndex });
    } else {
      result.push({ kind: 'single', part, index: i });
      i++;
    }
  }

  return result;
}
