// TDD London School: Lightweight mocks for AI providers
// Focus: Behavior verification over integration testing

import { vi } from 'vitest';

// Mock contracts for AI provider behavior
export type MockAIResponse = {
  id: string;
  content: string;
  tokens: number;
  model: string;
};

export type MockStreamChunk = {
  type: 'text' | 'tool_invocation' | 'annotation';
  data: any;
};

// London School: Mock AI Provider with behavior verification
export class MockAIProvider {
  private responses: MockAIResponse[] = [];
  private streamChunks: MockStreamChunk[] = [];

  // Spy functions for behavior verification
  public generateSpy = vi.fn();
  public streamSpy = vi.fn();
  public toolCallSpy = vi.fn();

  constructor() {
    this.setupDefaultBehavior();
  }

  private setupDefaultBehavior() {
    // Mock default responses for fast test execution
    this.responses = [
      {
        id: 'mock_resp_1',
        content: "It's just green duh!",
        tokens: 15,
        model: 'mock-gpt-4',
      },
      {
        id: 'mock_resp_2',
        content: "It's just blue duh!",
        tokens: 15,
        model: 'mock-gpt-4',
      },
      {
        id: 'mock_resp_3',
        content: 'With Next.js, you can ship fast!',
        tokens: 25,
        model: 'mock-gpt-4',
      },
      {
        id: 'mock_resp_4',
        content: 'This painting is by Monet!',
        tokens: 20,
        model: 'mock-gpt-4',
      },
      {
        id: 'mock_resp_5',
        content: 'The current temperature in San Francisco is 17°C.',
        tokens: 30,
        model: 'mock-gpt-4',
      },
    ];

    this.streamChunks = [
      { type: 'text', data: 'Hello' },
      { type: 'text', data: ' ' },
      { type: 'text', data: 'world' },
      {
        type: 'tool_invocation',
        data: { name: 'file_search', args: { query: 'x' } },
      },
      { type: 'annotation', data: { source: 'file_search', id: 'doc_1' } },
    ];
  }

  // Mock generate method with fast response
  async generate(prompt: string, options?: any): Promise<MockAIResponse> {
    this.generateSpy(prompt, options);

    // Fast mock response based on prompt patterns
    if (prompt.includes('grass')) {
      return this.responses[0];
    }
    if (prompt.includes('sky')) {
      return this.responses[1];
    }
    if (prompt.includes('Next.js')) {
      return this.responses[2];
    }
    if (prompt.includes('painted')) {
      return this.responses[3];
    }
    if (prompt.includes('weather')) {
      return this.responses[4];
    }

    return this.responses[0]; // Default response
  }

  // Mock stream method with immediate chunks
  async *stream(
    prompt: string,
    options?: any,
  ): AsyncGenerator<MockStreamChunk> {
    this.streamSpy(prompt, options);

    for (const chunk of this.streamChunks) {
      yield chunk;
      // Minimal delay for realistic behavior without slowing tests
      await new Promise((resolve) => setTimeout(resolve, 1));
    }
  }

  // Mock tool call with immediate response
  async callTool(name: string, args: any): Promise<any> {
    this.toolCallSpy(name, args);

    // Fast tool responses for common test scenarios
    switch (name) {
      case 'weather':
        return { temperature: '17°C', location: 'San Francisco' };
      case 'file_search':
        return { results: [{ id: 'doc_1', content: 'Mock file content' }] };
      default:
        return { result: 'Mock tool result' };
    }
  }

  // Behavior verification helpers
  getGenerateCalls() {
    return this.generateSpy.mock.calls;
  }

  getStreamCalls() {
    return this.streamSpy.mock.calls;
  }

  getToolCalls() {
    return this.toolCallSpy.mock.calls;
  }

  reset() {
    this.generateSpy.mockClear();
    this.streamSpy.mockClear();
    this.toolCallSpy.mockClear();
  }
}

// Export singleton for consistent behavior across tests
export const mockAIProvider = new MockAIProvider();

// London School: Mock HTTP responses for AI APIs
export const createMockAIResponse = (
  overrides: Partial<MockAIResponse> = {},
): MockAIResponse => ({
  id: 'mock_response_id',
  content: 'Mock AI response content',
  tokens: 50,
  model: 'mock-gpt-4',
  ...overrides,
});

// Mock rate limit headers for behavior verification
export const createMockRateLimitHeaders = () => ({
  'x-ratelimit-limit-minute': '60',
  'x-ratelimit-remaining-minute': '59',
  'x-ratelimit-reset-minute': '60',
});
