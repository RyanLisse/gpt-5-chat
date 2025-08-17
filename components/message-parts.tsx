'use client';

import { memo, useMemo } from 'react';
import type { ChatMessage } from '@/lib/ai/types';
import { groupMessageParts } from './message-parts/group-message-parts';
import { PartRenderer } from './message-parts/part-renderer';

type MessagePartsProps = {
  message: ChatMessage;
  isLoading: boolean;
  isReadonly: boolean;
};

export function PureMessageParts({
  message,
  isLoading,
  isReadonly,
}: MessagePartsProps) {
  const groups = useMemo(
    () => groupMessageParts(message.parts),
    [message.parts],
  );

  return groups.map((group, groupIdx) => (
    <PartRenderer
      group={group}
      groupIdx={groupIdx}
      isLoading={isLoading}
      isReadonly={isReadonly}
      key={`${message.id}-${groupIdx}`}
      messageId={message.id}
      totalParts={message.parts.length}
    />
  ));
}

export const MessageParts = memo(PureMessageParts);
