'use client';

import { memo, useMemo } from 'react';
import type { ChatMessage } from '@/lib/ai/types';
import { Response } from './ai-elements/response';
import { MessageReasoning } from './message-reasoning';

// Individual tool components
import { WeatherToolPart } from './message-parts/weather-tool-part';
import { DocumentToolPart } from './message-parts/document-tool-part';
import { RetrieveToolPart } from './message-parts/retrieve-tool-part';
import { ReadDocumentToolPart } from './message-parts/read-document-tool-part';
import { StockChartToolPart } from './message-parts/stock-chart-tool-part';
import { GeneratedImageToolPart } from './message-parts/generated-image-tool-part';
import { useMessagePartGroups } from './message-parts/use-message-part-groups';
import { useLastArtifact } from './message-parts/use-last-artifact';

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
      if (lastArtifact) {
        break;
      }
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
          isLoading={isLoading && group.endIndex === message.parts.length - 1}
          key={key}
          reasoning={group.parts.map((p) => p.text)}
        />
      );
    }

    const { part, index } = group;
    const { type } = part;
    const key = `message-${message.id}-part-${index}`;

    if (type === 'text') {
      return (
        <div className="flex w-full flex-col gap-4" key={key}>
          <Response>{part.text}</Response>
        </div>
      );
    }

    if (type === 'tool-getWeather') {
      const { toolCallId, state } = part;
      if (state === 'input-available') {
        return (
          <div className="skeleton" key={toolCallId}>
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
              args={input}
              isReadonly={isReadonly}
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
            <div className="rounded border p-2 text-red-500" key={toolCallId}>
              Error: {String(output.error)}
            </div>
          );
        }

        return (
          <div key={toolCallId}>
            {shouldShowFullPreview ? (
              <DocumentPreview
                args={input}
                isReadonly={isReadonly}
                messageId={message.id}
                result={output}
                type="create"
              />
            ) : (
              <DocumentToolResult
                isReadonly={isReadonly}
                messageId={message.id}
                result={output}
                type="create"
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
              args={{ title: input.description }}
              isReadonly={isReadonly}
              type="update"
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
            <div className="rounded border p-2 text-red-500" key={toolCallId}>
              Error: {String(output.error)}
            </div>
          );
        }

        return (
          <div key={toolCallId}>
            {shouldShowFullPreview ? (
              <DocumentPreview
                args={input}
                isReadonly={isReadonly}
                messageId={message.id}
                result={output}
                type="update"
              />
            ) : (
              <DocumentToolResult
                isReadonly={isReadonly}
                messageId={message.id}
                result={output}
                type="update"
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
              args={{ title: '' }}
              isReadonly={isReadonly}
              type="request-suggestions"
            />
          </div>
        );
      }

      if (state === 'output-available') {
        const { output } = part;
        if ('error' in output) {
          return (
            <div className="rounded border p-2 text-red-500" key={toolCallId}>
              Error: {String(output.error)}
            </div>
          );
        }

        return (
          <div key={toolCallId}>
            <DocumentToolResult
              isReadonly={isReadonly}
              messageId={message.id}
              result={output}
              type="request-suggestions"
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
            <StockChartMessage args={input} result={null} />
          </div>
        );
      }
      if (state === 'output-available') {
        const { output, input } = part;
        return (
          <div key={toolCallId}>
            {/* @ts-expect-error - TODO: fix this */}
            <StockChartMessage args={input} result={output} />
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
            <GeneratedImage args={input} result={output} />
          </div>
        );
      }
    }

    return null;
  });
}

export const MessageParts = memo(PureMessageParts);
