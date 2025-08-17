import type { ModelMessage } from 'ai';
import { getEncoding } from 'js-tiktoken';
import { RecursiveCharacterTextSplitter } from './text-splitter';

const MinChunkSize = 140;
const encoder = getEncoding('o200k_base');

// Calculate total tokens from messages
export function calculateMessagesTokens(messages: ModelMessage[]): number {
  let totalTokens = 0;

  for (const message of messages) {
    // Count tokens for role
    totalTokens += encoder.encode(message.role).length;

    // Count tokens for content - handle both string and array formats
    if (typeof message.content === 'string') {
      totalTokens += encoder.encode(message.content).length;
    } else if (Array.isArray(message.content)) {
      for (const part of message.content) {
        if (part.type === 'text') {
          totalTokens += encoder.encode(part.text).length;
        } else if (
          part.type === 'tool-result' &&
          part.output &&
          typeof part.output === 'object' &&
          'value' in part.output &&
          typeof part.output.value === 'string'
        ) {
          // Handle tool-result parts with text output
          totalTokens += encoder.encode(part.output.value).length;
        }
        // Add overhead for other part types (image, file, etc.)
        // Using GPT-4V approximation: ~765 tokens for typical image
        else {
          totalTokens += 765;
        }
      }
    }

    // Add overhead for message structure (role, content wrapper, etc.)
    totalTokens += 5;
  }

  return totalTokens;
}

// trim prompt to maximum context size
export function trimPrompt(
  prompt: string,
  contextSize = Number(process.env.CONTEXT_SIZE) || 128_000,
) {
  if (!prompt) {
    return '';
  }

  const length = encoder.encode(prompt).length;
  if (length <= contextSize) {
    return prompt;
  }

  const overflowTokens = length - contextSize;
  // on average it's 3 characters per token, so multiply by 3 to get a rough estimate of the number of characters
  const chunkSize = prompt.length - overflowTokens * 3;
  if (chunkSize < MinChunkSize) {
    return prompt.slice(0, MinChunkSize);
  }

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize,
    chunkOverlap: 0,
  });
  const trimmedPrompt = splitter.splitText(prompt)[0] ?? '';

  // last catch, there's a chance that the trimmed prompt is same length as the original prompt, due to how tokens are split & innerworkings of the splitter, handle this case by just doing a hard cut
  if (trimmedPrompt.length === prompt.length) {
    return trimPrompt(prompt.slice(0, chunkSize), contextSize);
  }

  // recursively trim until the prompt is within the context size
  return trimPrompt(trimmedPrompt, contextSize);
}

// Helper: Handle system message overflow
function handleSystemMessageOverflow(
  systemMessage: ModelMessage,
  maxTokens: number,
): ModelMessage[] {
  if (typeof systemMessage.content === 'string') {
    return [
      {
        ...systemMessage,
        content: trimPrompt(systemMessage.content, maxTokens),
      } as ModelMessage,
    ];
  }
  return [systemMessage];
}

// Helper: Truncate string content message
function truncateStringMessage(
  message: ModelMessage,
  availableTokens: number,
  currentTokens: number,
): ModelMessage {
  const tokensToRemove = currentTokens - availableTokens;
  const charsToRemove = tokensToRemove * 4; // rough estimate
  const content = message.content as string;
  const truncatedContent = content.slice(0, -charsToRemove);

  return {
    ...message,
    content: trimPrompt(truncatedContent, availableTokens),
  } as ModelMessage;
}

// Helper: Truncate tool message with array content
function truncateToolMessage(
  message: ModelMessage,
  availableTokens: number,
): ModelMessage {
  const content = [...(message.content as any[])];
  const currentMessageTokens = calculateMessagesTokens([message]);
  let tokensToRemove = currentMessageTokens - availableTokens;

  // Truncate from the end of the content array
  for (let i = content.length - 1; i >= 0 && tokensToRemove > 0; i--) {
    const part = content[i];
    if (
      part.type === 'tool-result' &&
      part.output &&
      typeof part.output === 'object' &&
      'value' in part.output &&
      typeof part.output.value === 'string'
    ) {
      const partTokens = encoder.encode(part.output.value).length;
      if (partTokens > 0) {
        // Truncate this part's output value
        const targetTokens = Math.max(0, partTokens - tokensToRemove);
        content[i] = {
          ...part,
          output: {
            type: 'text' as const,
            value: trimPrompt(part.output.value, targetTokens),
          },
        };
        tokensToRemove -= partTokens - targetTokens;
      } else {
        // Remove entire part if needed
        content.splice(i, 1);
        tokensToRemove -= partTokens;
      }
    }
  }

  return { ...message, content } as ModelMessage;
}

// Helper: Truncate last message when still over token limit
function truncateLastMessage(
  messages: ModelMessage[],
  availableTokens: number,
  currentTokens: number,
): void {
  const lastMessage = messages.at(-1);
  if (!lastMessage) return;

  const isStringContent = typeof lastMessage.content === 'string';
  const isToolMessage = lastMessage.role === 'tool';
  const isArrayContent = Array.isArray(lastMessage.content);

  if (isStringContent && !isToolMessage) {
    messages[messages.length - 1] = truncateStringMessage(
      lastMessage,
      availableTokens,
      currentTokens,
    );
  } else if (isArrayContent && isToolMessage) {
    messages[messages.length - 1] = truncateToolMessage(
      lastMessage,
      availableTokens,
    );
  }
}

// Truncate messages array to fit within token limit
export function truncateMessages(
  messages: ModelMessage[],
  maxTokens: number,
  preserveSystemMessage = true,
): ModelMessage[] {
  if (messages.length === 0) {
    return messages;
  }

  // Always preserve system message if requested
  const systemMessage =
    preserveSystemMessage && messages[0]?.role === 'system'
      ? messages[0]
      : null;
  const otherMessages = systemMessage ? messages.slice(1) : messages;

  // Calculate tokens for system message if it exists
  const systemTokens = systemMessage
    ? calculateMessagesTokens([systemMessage])
    : 0;
  const availableTokens = maxTokens - systemTokens;

  if (availableTokens <= 0) {
    return systemMessage
      ? handleSystemMessageOverflow(systemMessage, maxTokens)
      : [];
  }

  // Start with all other messages and remove from the beginning until we fit
  const truncatedMessages = [...otherMessages];
  let currentTokens = calculateMessagesTokens(truncatedMessages);

  while (currentTokens > availableTokens && truncatedMessages.length > 0) {
    truncatedMessages.shift(); // Remove oldest message first
    currentTokens = calculateMessagesTokens(truncatedMessages);
  }

  // If we still don't fit and have messages, truncate the content of the last message
  if (currentTokens > availableTokens && truncatedMessages.length > 0) {
    truncateLastMessage(truncatedMessages, availableTokens, currentTokens);
  }

  return systemMessage
    ? [systemMessage, ...truncatedMessages]
    : truncatedMessages;
}
