'use client';

import type { ChatMessage } from '@/lib/ai/types';
import { Response } from '../ai-elements/response';
import { MessageReasoning } from '../message-reasoning';
import { ToolRenderer } from './tool-renderers';

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

type PartRendererProps = {
  group: GroupedPart;
  groupIdx: number;
  messageId: string;
  isLoading: boolean;
  isReadonly: boolean;
  totalParts: number;
};

export function PartRenderer({
  group,
  groupIdx,
  messageId,
  isLoading,
  isReadonly,
  totalParts,
}: PartRendererProps) {
  if (group.kind === 'reasoning') {
    const key = `message-${messageId}-reasoning-${groupIdx}`;
    const isLastGroup = group.endIndex === totalParts - 1;

    return (
      <MessageReasoning
        isLoading={isLoading && isLastGroup}
        key={key}
        reasoning={group.parts.map((p) => p.text)}
      />
    );
  }

  const { part, index } = group;
  const { type } = part;
  const key = `message-${messageId}-part-${index}`;

  if (type === 'text') {
    return (
      <div className="flex w-full flex-col gap-4" key={key}>
        <Response>{part.text}</Response>
      </div>
    );
  }

  return (
    <div key={key}>
      <ToolRenderer isReadonly={isReadonly} messageId={messageId} part={part} />
    </div>
  );
}
