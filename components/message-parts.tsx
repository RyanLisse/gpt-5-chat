'use client';

import { memo, useMemo } from 'react';
import { Response } from './ai-elements/response';
import { Weather } from './weather';
import { DocumentPreview } from './document-preview';
import { DocumentToolCall, DocumentToolResult } from './document';
import { MessageReasoning } from './message-reasoning';
import { Retrieve } from './retrieve';
import { ReadDocument } from './read-document';
import { StockChartMessage } from './stock-chart-message';
import { GeneratedImage } from './generated-image';
import type { ChatMessage } from '@/lib/ai/types';
import { chatStore } from '@/lib/stores/chat-store';

type MessagePartsProps = {
  message: ChatMessage;
  isLoading: boolean;
  isReadonly: boolean;
};

const isLastArtifact = (
  messages: ChatMessage[],
  currentToolCallId: string,
): boolean => {
  let lastArtifact: { messageIndex: number; toolCallId: string } | null = null;

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
      if (lastArtifact) break;
    }
  }

  return lastArtifact?.toolCallId === currentToolCallId;
};


export function PureMessageParts({
  message,
  isLoading,
  isReadonly,
}: MessagePartsProps) {
  type ReasoningPart = Extract<
    ChatMessage['parts'][number],
    { type: 'reasoning' }
  >;

  const groups = useMemo(() => {
    const result: Array<
      | { kind: 'reasoning'; parts: ReasoningPart[]; endIndex: number }
      | {
          kind: 'single';
          part: Exclude<ChatMessage['parts'][number], ReasoningPart>;
          index: number;
        }
    > = [];

    const parts = message.parts;
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
  }, [message.parts]);

  return groups.map((group, groupIdx) => {
    if (group.kind === 'reasoning') {
      const key = `message-${message.id}-reasoning-${groupIdx}`;
      return (
        <MessageReasoning
          key={key}
          isLoading={isLoading && group.endIndex === message.parts.length - 1}
          reasoning={group.parts.map((p) => p.text)}
        />
      );
    }

    const { part, index } = group;
    const { type } = part;
    const key = `message-${message.id}-part-${index}`;

    if (type === 'text') {
      return (
        <div key={key} className="flex flex-col gap-4 w-full">
          <Response>{part.text}</Response>
        </div>
      );
    }

    if (type === 'tool-getWeather') {
      const { toolCallId, state } = part;
      if (state === 'input-available') {
        return (
          <div key={toolCallId} className="skeleton">
            <Weather />
          </div>
        );
      }
      if (state === 'output-available') {
        const { output } = part;
        return (
          <div key={toolCallId}>
            <Weather weatherAtLocation={output} />
          </div>
        );
      }
    }

    if (type === 'tool-createDocument') {
      const { toolCallId, state } = part;
      if (state === 'input-available') {
        const { input } = part;
        return (
          <div key={toolCallId}>
            <DocumentPreview
              isReadonly={isReadonly}
              args={input}
              messageId={message.id}
            />
          </div>
        );
      }

      if (state === 'output-available') {
        const { output, input } = part;
        const shouldShowFullPreview = isLastArtifact(
          chatStore.getState().messages,
          toolCallId,
        );

        if ('error' in output) {
          return (
            <div key={toolCallId} className="text-red-500 p-2 border rounded">
              Error: {String(output.error)}
            </div>
          );
        }

        return (
          <div key={toolCallId}>
            {shouldShowFullPreview ? (
              <DocumentPreview
                isReadonly={isReadonly}
                result={output}
                args={input}
                messageId={message.id}
                type="create"
              />
            ) : (
              <DocumentToolResult
                type="create"
                result={output}
                isReadonly={isReadonly}
                messageId={message.id}
              />
            )}
          </div>
        );
      }
    }

    if (type === 'tool-updateDocument') {
      const { toolCallId, state } = part;
      if (state === 'input-available') {
        const { input } = part;
        return (
          <div key={toolCallId}>
            <DocumentToolCall
              type="update"
              // @ts-expect-error - TODO: fix this
              args={input}
              isReadonly={isReadonly}
            />
          </div>
        );
      }

      if (state === 'output-available') {
        const { output, input } = part;
        const shouldShowFullPreview = isLastArtifact(
          chatStore.getState().messages,
          toolCallId,
        );

        if ('error' in output) {
          return (
            <div key={toolCallId} className="text-red-500 p-2 border rounded">
              Error: {String(output.error)}
            </div>
          );
        }

        return (
          <div key={toolCallId}>
            {shouldShowFullPreview ? (
              <DocumentPreview
                isReadonly={isReadonly}
                result={output}
                args={input}
                messageId={message.id}
                type="update"
              />
            ) : (
              <DocumentToolResult
                type="update"
                result={output}
                isReadonly={isReadonly}
                messageId={message.id}
              />
            )}
          </div>
        );
      }
    }

    if (type === 'tool-requestSuggestions') {
      const { toolCallId, state } = part;
      if (state === 'input-available') {
        const { input } = part;
        return (
          <div key={toolCallId}>
            <DocumentToolCall
              type="request-suggestions"
              // @ts-expect-error - TODO: fix this
              args={input}
              isReadonly={isReadonly}
            />
          </div>
        );
      }

      if (state === 'output-available') {
        const { output } = part;
        if ('error' in output) {
          return (
            <div key={toolCallId} className="text-red-500 p-2 border rounded">
              Error: {String(output.error)}
            </div>
          );
        }

        return (
          <div key={toolCallId}>
            <DocumentToolResult
              type="request-suggestions"
              result={output}
              isReadonly={isReadonly}
              messageId={message.id}
            />
          </div>
        );
      }
    }

    if (type === 'tool-retrieve') {
      const { toolCallId, state } = part;
      if (state === 'input-available') {
        return (
          <div key={toolCallId}>
            <Retrieve />
          </div>
        );
      }

      if (state === 'output-available') {
        const { output } = part;
        return (
          <div key={toolCallId}>
            {/* @ts-expect-error - TODO: fix this */}
            <Retrieve result={output} />
          </div>
        );
      }
    }

    if (type === 'tool-readDocument') {
      const { toolCallId, state } = part;
      if (state === 'input-available') {
        return null;
      }
      if (state === 'output-available') {
        const { output } = part;
        return (
          <div key={toolCallId}>
            {/* @ts-expect-error - TODO: fix this */}
            <ReadDocument result={output} />
          </div>
        );
      }
    }

    if (type === 'tool-stockChart') {
      const { toolCallId, state } = part;
      if (state === 'input-available') {
        const { input } = part;
        return (
          <div key={toolCallId}>
            {/* @ts-expect-error - TODO: fix this */}
            <StockChartMessage result={null} args={input} />
          </div>
        );
      }
      if (state === 'output-available') {
        const { output, input } = part;
        return (
          <div key={toolCallId}>
            {/* @ts-expect-error - TODO: fix this */}
            <StockChartMessage result={output} args={input} />
          </div>
        );
      }
    }


    if (type === 'tool-generateImage') {
      const { toolCallId, state } = part;
      if (state === 'input-available') {
        const { input } = part;
        return (
          <div key={toolCallId}>
            <GeneratedImage args={input} isLoading={true} />
          </div>
        );
      }
      if (state === 'output-available') {
        const { output, input } = part;
        return (
          <div key={toolCallId}>
            <GeneratedImage result={output} args={input} />
          </div>
        );
      }
    }


    return null;
  });
}

export const MessageParts = memo(PureMessageParts);
