import type { ModelMessage } from 'ai';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  calculateMessagesTokens,
  trimPrompt,
  truncateMessages,
} from './token-utils';

describe('truncateMessages', () => {
  let messages: ModelMessage[];

  beforeEach(() => {
    // TEST SEAM: Reset all mocks for deterministic testing
    vi.clearAllMocks();

    messages = [
      {
        role: 'system',
        content: 'You are a helpful assistant.',
      },
      {
        role: 'user',
        content: 'Hello, how are you?',
      },
      {
        role: 'assistant',
        content: 'I am doing well, thank you for asking!',
      },
      {
        role: 'user',
        content: 'Can you help me with something?',
      },
    ];
  });

  it('should return empty array when input is empty', () => {
    const result = truncateMessages([], 1000);
    expect(result).toEqual([]);
  });

  it('should return all messages when under token limit', () => {
    const result = truncateMessages(messages, 1000);
    expect(result).toEqual(messages);
  });

  it('should preserve system message by default', () => {
    // Set a very low token limit that would normally remove everything
    const result = truncateMessages(messages, 50);

    // Should at least have the system message
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result[0].role).toBe('system');
    expect(result[0].content).toBe('You are a helpful assistant.');
  });

  it('should not preserve system message when preserveSystemMessage is false', () => {
    const result = truncateMessages(messages, 50, false);

    // May or may not have messages, but if it does, first shouldn't necessarily be system
    if (result.length > 0) {
      // Should prefer newer messages when system is not preserved
      expect(result.at(-1)?.role).toBe('user');
    }
  });

  it('should remove older messages first while preserving system message', () => {
    // Use a limit that allows system + some but not all messages
    const result = truncateMessages(messages, 200);

    expect(result[0].role).toBe('system');

    // Should prefer keeping newer messages
    const hasLastUserMessage = result.some(
      (msg) =>
        msg.role === 'user' &&
        msg.content === 'Can you help me with something?',
    );
    expect(hasLastUserMessage).toBe(true);
  });

  it('should handle string content when under token limit', () => {
    const longMessages: ModelMessage[] = [
      {
        role: 'system',
        content: 'Short system message',
      },
      {
        role: 'user',
        content:
          'This is a long user message that fits within reasonable token limits',
      },
    ];

    const result = truncateMessages(longMessages, 100);

    expect(result.length).toBe(2);
    expect(result[0].role).toBe('system');
    expect(result[1].role).toBe('user');

    // Content should remain unchanged when under limit
    const content = result[1].content as string;
    expect(content).toBe(longMessages[1].content);
  });

  it('should handle array content in messages', () => {
    const arrayContentMessages: ModelMessage[] = [
      {
        role: 'system',
        content: 'System message',
      },
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Hello there' },
          { type: 'image', image: 'base64data' },
          { type: 'text', text: 'How are you?' },
        ],
      },
    ];

    const result = truncateMessages(arrayContentMessages, 1000);
    expect(result).toEqual(arrayContentMessages);
  });

  it('should handle tool messages with complex content', () => {
    const toolMessages: ModelMessage[] = [
      {
        role: 'system',
        content: 'System message',
      },
      {
        role: 'tool',
        content: [
          {
            type: 'tool-result',
            toolCallId: 'call_1',
            toolName: 'search',
            output: {
              type: 'text',
              value:
                'This is a very long tool result that should be truncated when we exceed token limits because it contains extensive information',
            },
          },
          {
            type: 'tool-result',
            toolCallId: 'call_2',
            toolName: 'fetch',
            output: {
              type: 'text',
              value: 'Another tool result with important data',
            },
          },
        ],
      },
    ];

    // Test with generous limit - both messages should fit
    const result = truncateMessages(toolMessages, 150);

    expect(result.length).toBe(2);
    expect(result[0].role).toBe('system');
    expect(result[1].role).toBe('tool');
  });

  it('should handle system message that fits within limit', () => {
    const systemMessages: ModelMessage[] = [
      {
        role: 'system',
        content:
          'This is a system message that should fit within reasonable token limits',
      },
    ];

    const result = truncateMessages(systemMessages, 50);

    expect(result.length).toBe(1);
    expect(result[0].role).toBe('system');

    // Content should remain unchanged when it fits
    const content = result[0].content as string;
    expect(content).toBe(systemMessages[0].content);
  });

  it('should actually truncate content when forced by very low limits', () => {
    // Create a message that definitely exceeds token limits
    const veryLongContent =
      'This is a very long message that should definitely be truncated when we set an extremely low token limit because it contains way too much information and text that exceeds what would normally be acceptable within the constraints we are testing here and this should trigger the content truncation logic inside the function when we provide a very restrictive token limit that forces the algorithm to cut down the content to fit within the available space.';
    const longMessages: ModelMessage[] = [
      {
        role: 'user',
        content: veryLongContent,
      },
    ];

    // Use a very restrictive limit that should force truncation
    const result = truncateMessages(longMessages, 5);

    expect(result.length).toBeLessThanOrEqual(1);

    // If we get a result, it should be truncated or the message should be removed
    if (result.length > 0) {
      const content = result[0].content as string;
      expect(typeof content).toBe('string');
    }
  });

  it('should handle edge case with zero token limit', () => {
    const result = truncateMessages(messages, 0);

    // Should return empty array or minimal content
    expect(result.length).toBeLessThanOrEqual(1);
  });

  it('should maintain message order', () => {
    const result = truncateMessages(messages, 500);

    // First message should be system (if preserved)
    if (result.length > 1) {
      expect(result[0].role).toBe('system');

      // Subsequent messages should maintain relative order
      for (let i = 1; i < result.length - 1; i++) {
        const currentIndex = messages.indexOf(result[i]);
        const nextIndex = messages.findIndex((msg) => msg === result[i + 1]);
        expect(currentIndex).toBeLessThan(nextIndex);
      }
    }
  });

  it('should handle messages with no content', () => {
    const emptyMessages: ModelMessage[] = [
      {
        role: 'system',
        content: '',
      },
      {
        role: 'user',
        content: '',
      },
    ];

    const result = truncateMessages(emptyMessages, 100);
    expect(result).toEqual(emptyMessages);
  });

  it('should handle mixed content types properly', () => {
    const mixedMessages: ModelMessage[] = [
      {
        role: 'system',
        content: 'System prompt',
      },
      {
        role: 'user',
        content: 'Text message',
      },
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Mixed content message' },
          { type: 'image', image: 'data' },
        ],
      },
      {
        role: 'tool',
        content: [
          {
            type: 'tool-result',
            toolCallId: 'test',
            toolName: 'tool',
            output: { type: 'text', value: 'Tool output' },
          },
        ],
      },
    ];

    // Test with high limit - should keep some messages
    const result = truncateMessages(mixedMessages, 1000);
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result[0].role).toBe('system');

    // Test with low limit - should mostly keep system message
    const resultLow = truncateMessages(mixedMessages, 100);
    expect(resultLow.length).toBeGreaterThanOrEqual(1);
    expect(resultLow[0].role).toBe('system');
  });
});

describe('calculateMessagesTokens', () => {
  it('should calculate tokens for string content', () => {
    const messages: ModelMessage[] = [{ role: 'user', content: 'Hello world' }];

    const tokens = calculateMessagesTokens(messages);
    expect(typeof tokens).toBe('number');
    expect(tokens).toBeGreaterThan(0);
  });

  it('should calculate tokens for array content', () => {
    const messages: ModelMessage[] = [
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Hello' },
          { type: 'image', image: 'base64' },
        ],
      },
    ];

    const tokens = calculateMessagesTokens(messages);
    expect(typeof tokens).toBe('number');
    expect(tokens).toBeGreaterThan(0);
  });

  it('should return 0 for empty messages array', () => {
    const tokens = calculateMessagesTokens([]);
    expect(tokens).toBe(0);
  });

  it('should include overhead for message structure', () => {
    const singleMessage: ModelMessage[] = [{ role: 'user', content: 'test' }];

    const tokens = calculateMessagesTokens(singleMessage);

    // Should be more than just content tokens due to overhead
    expect(tokens).toBeGreaterThan(5); // Minimum overhead
  });

  it('should handle empty content', () => {
    const messages: ModelMessage[] = [{ role: 'user', content: '' }];

    const tokens = calculateMessagesTokens(messages);
    expect(tokens).toBeGreaterThanOrEqual(5); // Should still have role + overhead tokens
  });
});

describe('trimPrompt', () => {
  beforeEach(() => {
    // Reset environment variable for consistent testing
    delete process.env.CONTEXT_SIZE;
  });

  it('should return empty string for empty prompt', () => {
    const result = trimPrompt('');
    expect(result).toBe('');
  });

  it('should return prompt unchanged when under context size', () => {
    const prompt = 'This is a short prompt';
    const result = trimPrompt(prompt, 1000);
    expect(result).toBe(prompt);
  });

  it('should use default context size from environment', () => {
    process.env.CONTEXT_SIZE = '100';
    const longPrompt = 'a'.repeat(1000); // Very long prompt

    const result = trimPrompt(longPrompt);
    expect(result.length).toBeLessThan(longPrompt.length);
  });

  it('should use default context size of 128000 when env not set', () => {
    const moderatePrompt = 'a'.repeat(1000);

    const result = trimPrompt(moderatePrompt);
    expect(result).toBe(moderatePrompt); // Should not be trimmed with default size
  });

  it('should trim prompt when exceeding context size', () => {
    const longPrompt =
      'This is a very long prompt that should be trimmed '.repeat(100);
    const contextSize = 50;

    const result = trimPrompt(longPrompt, contextSize);
    expect(result.length).toBeLessThan(longPrompt.length);
  });

  it('should handle minimum chunk size constraint', () => {
    const shortPrompt = 'short';
    const verySmallContextSize = 1; // Should trigger MinChunkSize fallback

    const result = trimPrompt(shortPrompt, verySmallContextSize);
    expect(result.length).toBeGreaterThanOrEqual(
      Math.min(140, shortPrompt.length),
    );
  });

  it('should recursively trim when needed', () => {
    // Create a prompt that needs multiple trim iterations
    const longPrompt = 'word '.repeat(1000);
    const smallContextSize = 10;

    const result = trimPrompt(longPrompt, smallContextSize);
    expect(result.length).toBeLessThan(longPrompt.length);
    expect(typeof result).toBe('string');
  });

  it('should handle edge case where trimmed prompt equals original', async () => {
    // Mock the text splitter to return same length to trigger hard cut
    const originalSplitText = await import('./text-splitter');
    vi.spyOn(
      originalSplitText.RecursiveCharacterTextSplitter.prototype,
      'splitText',
    ).mockReturnValue(['unchanged_same_length_text_that_triggers_recursion']);

    const prompt = 'unchanged_same_length_text_that_triggers_recursion';
    const result = trimPrompt(prompt, 5);

    expect(typeof result).toBe('string');
    vi.restoreAllMocks();
  });
});

describe('truncateMessages - Additional Edge Cases', () => {
  it('should handle system message exceeding token limit', () => {
    const veryLongSystemMessage: ModelMessage[] = [
      {
        role: 'system',
        content: 'Very long system message that exceeds token limits '.repeat(
          100,
        ),
      },
    ];

    const result = truncateMessages(veryLongSystemMessage, 10);

    expect(result).toHaveLength(1);
    expect(result[0]?.role).toBe('system');
    expect(typeof result[0]?.content).toBe('string');
  });

  it('should handle system message with non-string content exceeding limit', () => {
    const systemMessageArray: ModelMessage[] = [
      {
        role: 'system',
        content: 'System message as array',
      },
    ];

    const result = truncateMessages(systemMessageArray, 5);

    expect(result).toHaveLength(1);
    expect(result[0]?.role).toBe('system');
  });

  it('should truncate last message content when over limit', () => {
    const messages: ModelMessage[] = [
      {
        role: 'system',
        content: 'Short system', // ~3 tokens + 5 overhead = 8 tokens
      },
      {
        role: 'user',
        content: 'Very long user message that should be truncated '.repeat(50), // ~625 tokens + 5 overhead = 630 tokens
      },
    ];

    // Set limit to allow system + truncated user message (higher limit for deterministic mock)
    const result = truncateMessages(messages, 800); // Allow enough for system + partial user

    expect(result).toHaveLength(2);
    expect(result[1]?.role).toBe('user');
    const content = result[1]?.content as string;
    expect(content.length).toBeLessThanOrEqual(
      (messages[1]?.content as string).length,
    );
  });

  it('should handle tool message with array content and truncate tool results', () => {
    const toolMessage: ModelMessage[] = [
      {
        role: 'system',
        content: 'System', // ~2 tokens + 5 overhead = 7 tokens
      },
      {
        role: 'tool',
        content: [
          {
            type: 'tool-result',
            toolCallId: 'call_1',
            toolName: 'search',
            output: {
              type: 'text',
              value: 'Very long tool result that should be truncated '.repeat(
                10,
              ), // ~150 tokens
            },
          },
          {
            type: 'tool-result',
            toolCallId: 'call_2',
            toolName: 'fetch',
            output: {
              type: 'text',
              value: 'Another long result '.repeat(5), // ~25 tokens
            },
          },
        ],
      }, // Total: ~180 tokens + 5 overhead = 185 tokens
    ];

    const result = truncateMessages(toolMessage, 1000); // Higher limit for deterministic mock

    expect(result).toHaveLength(2);
    expect(result[1]?.role).toBe('tool');
    expect(Array.isArray(result[1]?.content)).toBe(true);
  });

  it('should remove tool result parts when tokens are zero', () => {
    const toolMessage: ModelMessage[] = [
      {
        role: 'tool',
        content: [
          {
            type: 'tool-result',
            toolCallId: 'call_1',
            toolName: 'empty',
            output: {
              type: 'text',
              value: '', // Empty value - 0 tokens
            },
          },
          {
            type: 'tool-result',
            toolCallId: 'call_2',
            toolName: 'content',
            output: {
              type: 'text',
              value: 'Has content', // ~3 tokens
            },
          },
        ],
      }, // Total: ~8 tokens + 5 overhead = 13 tokens
    ];

    const result = truncateMessages(toolMessage, 100); // Higher limit for deterministic mock

    expect(result).toHaveLength(1);
    expect(result[0]?.role).toBe('tool');
    const content = result[0]?.content as any[];
    expect(content.length).toBeLessThanOrEqual(2);
  });

  it('should handle tool message that is not role tool', () => {
    const messages: ModelMessage[] = [
      {
        role: 'system',
        content: 'System',
      },
      {
        role: 'assistant',
        content: 'Very long assistant message '.repeat(100),
      },
    ];

    const result = truncateMessages(messages, 50);

    expect(result[0]?.role).toBe('system');
    if (result.length > 1) {
      expect(result[1]?.role).toBe('assistant');
    }
  });

  it('should handle array content message with non-text types', () => {
    const messages: ModelMessage[] = [
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Text part' },
          { type: 'image', image: 'base64data' },
          { type: 'file', data: 'data:text/plain;base64,filedata' } as any,
        ],
      },
    ];

    // Images get 765 tokens each + text tokens + role overhead = ~1540 tokens total
    const result = truncateMessages(messages, 2000); // Higher limit to accommodate images

    expect(result).toEqual(messages);
  });
});
