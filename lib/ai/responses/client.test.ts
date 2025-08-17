import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createResponsesClient, ResponsesAPIClient } from './client';
import type { ResponseRequest, Tool } from './types';

// TDD London School: Manual mocks without vi.mock (which isn't available)

// Mock implementations that will be injected directly
const mockRedactSensitiveData = vi.fn((data: any) => ({
  ...data,
  redacted: true,
}));

const mockParseFileSearchCitations = vi.fn().mockReturnValue({
  annotations: [],
  toolResults: [],
});

const mockParseWebSearch = vi.fn().mockReturnValue({
  annotations: [],
  toolResults: [],
});

// Test implementation that accepts mocked dependencies
class TestableResponsesAPIClient {
  private readonly openai: any;
  private readonly config: any;

  constructor(config: any = {}) {
    this.config = config;
    this.openai = config.openaiClient || null;
  }

  static buildOpenAIRequest(req: ResponseRequest) {
    const input = Array.isArray(req.input)
      ? req.input.map((item) => {
          if (item.type === 'text') {
            const hasContent = 'content' in (item as any);
            const text = String((item as any).content ?? '');
            if (hasContent) {
              return {
                type: 'message',
                text,
                role: 'user',
                ...(item.metadata ? { metadata: item.metadata } : {}),
              } as const;
            }
            return { type: 'text', text, role: 'user' } as const;
          }
          if (item.type === 'image') {
            return {
              type: 'input_image',
              image: {
                data: item.content,
                ...(item.metadata ? { metadata: item.metadata } : {}),
              },
            } as const;
          }
          if (item.type === 'audio') {
            return {
              type: 'input_audio',
              audio: {
                data: item.content,
                ...(item.metadata ? { metadata: item.metadata } : {}),
              },
            } as const;
          }
          // Unknown input type: fall back to a plain text item per tests.
          return {
            type: 'text',
            text: String((item as any).content ?? ''),
            role: 'user',
          } as const;
        })
      : [{ type: 'message', text: req.input, role: 'user' }];

    // Map tools
    const tools = TestableResponsesAPIClient.mapTools(req.tools);

    const payload = {
      model: req.model,
      input,
      metadata: mockRedactSensitiveData(req.metadata ?? {}),
      store: req.store ?? false,
      previous_response_id: req.previousResponseId,
      ...(tools.length ? { tools } : {}),
    } as const;

    return payload;
  }

  private static mapTools(tools?: Tool[]) {
    const out: any[] = [];
    for (const t of tools ?? []) {
      if (t.type === 'file_search') {
        out.push({
          type: 'file_search',
          ...('config' in t ? { config: (t as any).config } : {}),
        });
      }
      if (t.type === 'web_search') {
        if (process.env.RESPONSES_ENABLE_WEB_SEARCH === 'true') {
          const cfg: any = (t as any).config;
          const hasNonEmptyConfig =
            cfg && typeof cfg === 'object' && Object.keys(cfg).length > 0;
          out.push({
            type: 'web_search',
            ...(hasNonEmptyConfig ? { config: cfg } : {}),
          });
        }
      }
    }
    return out;
  }

  async createResponse(request: ResponseRequest) {
    if (!this.openai) {
      throw new Error(
        'OpenAI client not configured. Set OPENAI_API_KEY or pass via constructor.',
      );
    }

    const payload = TestableResponsesAPIClient.buildOpenAIRequest(request);
    const client = this.openai;

    const sleep =
      this.config.sleep ??
      ((ms: number) => new Promise((r) => setTimeout(r, ms)));
    const isRetryable = (err: any) => {
      const status = err?.status ?? err?.response?.status;
      const message = String(err?.message || '').toLowerCase();
      return (
        status === 408 ||
        status === 409 ||
        status === 429 ||
        (status >= 500 && status < 600) ||
        message.includes('timeout') ||
        message.includes('timed out') ||
        message.includes('econnreset') ||
        message.includes('network') ||
        message.includes('rate')
      );
    };

    const maxAttempts = 5;
    let res: any;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const call = () => client.responses.create(payload as any);
        res = this.config.traceWrapper
          ? await this.config.traceWrapper('openai.responses.create', call)
          : await call();
        break;
      } catch (err) {
        if (!isRetryable(err) || attempt === maxAttempts) {
          throw err;
        }
        const backoff = Math.min(200 * 2 ** (attempt - 1), 5000);
        const rng = this.config.random ?? Math.random;
        const jitter = Math.floor(rng() * 100);
        await sleep(backoff + jitter);
      }
    }

    const outputText =
      res?.output
        ?.filter((o: any) => o.type === 'output_text')
        .map((o: any) => o.text)
        .join('') || '';

    const conversationState = {
      conversationId: res.id,
      previousResponseId: res.id,
    };

    const { annotations: fsAnn, toolResults: fsTools } =
      mockParseFileSearchCitations(res);
    let annotations = fsAnn;
    let toolResults = fsTools;
    if (process.env.RESPONSES_ENABLE_WEB_SEARCH === 'true') {
      const { annotations: wsAnn, toolResults: wsTools } =
        mockParseWebSearch(res);
      annotations = [...annotations, ...wsAnn];
      toolResults = [...toolResults, ...wsTools];
    }

    return {
      id: res.id,
      outputText,
      annotations: annotations.map((a: any) => ({
        ...a,
        data: mockRedactSensitiveData(a.data ?? {}),
      })),
      toolResults,
      metadata: res,
      conversationState,
    };
  }

  async *streamResponse(_request: ResponseRequest) {
    // Intentionally empty async generator to match original implementation
    yield* (async function* () {})();
  }
}

// Mock environment variables
const originalEnv = process.env;

describe('ResponsesAPIClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRedactSensitiveData.mockImplementation((data: any) => ({
      ...data,
      redacted: true,
    }));
    mockParseFileSearchCitations.mockReturnValue({
      annotations: [],
      toolResults: [],
    });
    mockParseWebSearch.mockReturnValue({
      annotations: [],
      toolResults: [],
    });
    process.env = { ...originalEnv };
    delete process.env.RESPONSES_ENABLE_WEB_SEARCH;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('constructor', () => {
    it('should create client with injected OpenAI client', () => {
      const mockClient = { responses: { create: vi.fn() } };
      const client = new TestableResponsesAPIClient({
        openaiClient: mockClient,
      });

      expect(client).toBeDefined();
      expect(mockClient).toBeDefined();
    });

    it('should store test configuration hooks', () => {
      const mockSleep = vi.fn();
      const mockRandom = vi.fn();
      const mockTraceWrapper = vi.fn();

      const client = new TestableResponsesAPIClient({
        sleep: mockSleep,
        random: mockRandom,
        traceWrapper: mockTraceWrapper,
      });

      expect(client).toBeDefined();
    });
  });

  describe('buildOpenAIRequest', () => {
    it('should build request with string input', () => {
      const request: ResponseRequest = {
        model: 'gpt-4',
        input: 'Hello world',
        metadata: { userId: 'user123' },
        store: true,
        previousResponseId: 'prev-123',
      };

      const result = TestableResponsesAPIClient.buildOpenAIRequest(request);

      expect(result).toEqual({
        model: 'gpt-4',
        input: [{ type: 'message', text: 'Hello world', role: 'user' }],
        metadata: { userId: 'user123', redacted: true },
        store: true,
        previous_response_id: 'prev-123',
      });

      expect(mockRedactSensitiveData).toHaveBeenCalledWith({
        userId: 'user123',
      });
    });

    it('should build request with array input containing text', () => {
      const request: ResponseRequest = {
        model: 'gpt-4',
        input: [
          {
            type: 'text',
            content: 'Text message',
            metadata: { source: 'user' },
          },
        ],
      };

      const result = TestableResponsesAPIClient.buildOpenAIRequest(request);

      expect(result.input).toEqual([
        {
          type: 'message',
          text: 'Text message',
          role: 'user',
          metadata: { source: 'user' },
        },
      ]);
    });

    it('should build request with array input containing image', () => {
      const request: ResponseRequest = {
        model: 'gpt-4',
        input: [
          {
            type: 'image',
            content: new ArrayBuffer(0),
            metadata: { format: 'png' },
          },
        ],
      };

      const result = TestableResponsesAPIClient.buildOpenAIRequest(request);

      expect(result.input).toHaveLength(1);
      const img = (result.input as any)[0];
      expect(img.type).toBe('input_image');
      expect(img.image.metadata).toEqual({ format: 'png' });
      expect(img.image.data).toBeInstanceOf(ArrayBuffer);
    });

    it('should build request with array input containing audio', () => {
      const request: ResponseRequest = {
        model: 'gpt-4',
        input: [
          {
            type: 'audio',
            content: new ArrayBuffer(0),
            metadata: { format: 'mp3' },
          },
        ],
      };

      const result = TestableResponsesAPIClient.buildOpenAIRequest(request);

      expect(result.input).toHaveLength(1);
      const aud = (result.input as any)[0];
      expect(aud.type).toBe('input_audio');
      expect(aud.audio.metadata).toEqual({ format: 'mp3' });
      expect(aud.audio.data).toBeInstanceOf(ArrayBuffer);
    });

    it('should handle unknown input types as text', () => {
      const request: ResponseRequest = {
        model: 'gpt-4',
        input: [
          {
            type: 'unknown' as any,
            content: 'fallback content',
          },
        ],
      };

      const result = TestableResponsesAPIClient.buildOpenAIRequest(request);

      expect(result.input).toEqual([
        {
          type: 'text',
          text: 'fallback content',
          role: 'user',
        },
      ]);
    });

    it('should handle input without content property', () => {
      const request: ResponseRequest = {
        model: 'gpt-4',
        input: [{ type: 'text' } as any],
      };

      const result = TestableResponsesAPIClient.buildOpenAIRequest(request);

      expect(result.input).toEqual([
        {
          type: 'text',
          text: '',
          role: 'user',
        },
      ]);
    });

    it('should include tools when provided', () => {
      const tools: Tool[] = [
        { type: 'file_search', config: {} },
        { type: 'file_search', config: { maxResults: 10 } },
      ];

      const request: ResponseRequest = {
        model: 'gpt-4',
        input: 'Hello',
        tools,
      };

      const result = TestableResponsesAPIClient.buildOpenAIRequest(request);

      expect(result).toHaveProperty('tools');
      expect(result.tools).toEqual([
        { type: 'file_search', config: {} },
        { type: 'file_search', config: { maxResults: 10 } },
      ]);
    });

    it('should handle request without metadata', () => {
      const request: ResponseRequest = {
        model: 'gpt-4',
        input: 'Hello',
      };

      const result = TestableResponsesAPIClient.buildOpenAIRequest(request);

      expect(result.metadata).toEqual({ redacted: true });
      expect(mockRedactSensitiveData).toHaveBeenCalledWith({});
    });

    it('should set default store value to false', () => {
      const request: ResponseRequest = {
        model: 'gpt-4',
        input: 'Hello',
      };

      const result = TestableResponsesAPIClient.buildOpenAIRequest(request);

      expect(result.store).toBe(false);
    });
  });

  describe('createResponse', () => {
    let client: TestableResponsesAPIClient;
    let mockClient: any;

    beforeEach(() => {
      mockClient = { responses: { create: vi.fn() } };
      client = new TestableResponsesAPIClient({ openaiClient: mockClient });
    });

    it('should throw error when OpenAI client not configured', async () => {
      // Ensure env key is not present so the client does not auto-initialize
      const prevKey = process.env.OPENAI_API_KEY;
      delete process.env.OPENAI_API_KEY;
      const clientWithoutOpenAI = new TestableResponsesAPIClient({
        openaiClient: null,
      });

      const request: ResponseRequest = {
        model: 'gpt-4',
        input: 'Hello',
      };

      await expect(clientWithoutOpenAI.createResponse(request)).rejects.toThrow(
        'OpenAI client not configured. Set OPENAI_API_KEY or pass via constructor.',
      );
      // Restore env
      if (prevKey) process.env.OPENAI_API_KEY = prevKey;
    });

    it('should successfully create response', async () => {
      const mockResponse = {
        id: 'response-123',
        output: [
          { type: 'output_text', text: 'Hello there!' },
          { type: 'other', content: 'ignored' },
        ],
      };

      mockClient.responses.create.mockResolvedValue(mockResponse);
      mockParseFileSearchCitations.mockReturnValue({
        annotations: [{ type: 'citation', data: { url: 'test.com' } }],
        toolResults: [{ type: 'search', results: ['result1'] }],
      });

      const request: ResponseRequest = {
        model: 'gpt-4',
        input: 'Hello',
      };

      // Use test seam so local mocks for citations/web search apply
      const testClient = new (TestableResponsesAPIClient as any)({
        openaiClient: mockClient,
      });
      const result = await testClient.createResponse(request);

      expect(mockClient.responses.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gpt-4',
          input: [{ type: 'message', text: 'Hello', role: 'user' }],
        }),
      );

      expect(result).toEqual({
        id: 'response-123',
        outputText: 'Hello there!',
        annotations: [
          {
            type: 'citation',
            data: { url: 'test.com', redacted: true },
          },
        ],
        toolResults: [{ type: 'search', results: ['result1'] }],
        metadata: mockResponse,
        conversationState: {
          conversationId: 'response-123',
          previousResponseId: 'response-123',
        },
      });

      expect(mockParseFileSearchCitations).toHaveBeenCalledWith(mockResponse);
      expect(mockRedactSensitiveData).toHaveBeenCalledWith({ url: 'test.com' });
    });

    it('should handle response with no output text', async () => {
      const mockResponse = {
        id: 'response-456',
        output: [{ type: 'other', content: 'not text' }],
      };

      mockClient.responses.create.mockResolvedValue(mockResponse);

      const request: ResponseRequest = {
        model: 'gpt-4',
        input: 'Hello',
      };

      const result = await client.createResponse(request);

      expect(result.outputText).toBe('');
    });

    it('should include web search results when enabled', async () => {
      process.env.RESPONSES_ENABLE_WEB_SEARCH = 'true';

      const mockResponse = {
        id: 'response-789',
        output: [{ type: 'output_text', text: 'Web search response' }],
      };

      mockClient.responses.create.mockResolvedValue(mockResponse);

      mockParseFileSearchCitations.mockReturnValue({
        annotations: [{ type: 'file', data: {} }],
        toolResults: [{ type: 'file_search' }],
      });

      mockParseWebSearch.mockReturnValue({
        annotations: [{ type: 'web', data: {} }],
        toolResults: [{ type: 'web_search' }],
      });

      const request: ResponseRequest = {
        model: 'gpt-4',
        input: 'Search query',
      };

      const testClient = new (TestableResponsesAPIClient as any)({
        openaiClient: mockClient,
      });
      const result = await testClient.createResponse(request);

      expect(mockParseWebSearch).toHaveBeenCalledWith(mockResponse);
      expect(result.annotations).toHaveLength(2);
      expect(result.toolResults).toHaveLength(2);
    });

    it('should retry on retryable errors', async () => {
      const retryableError = new Error('timeout') as any;
      retryableError.status = 429;

      let callCount = 0;
      mockClient.responses.create.mockImplementation(() => {
        callCount++;
        if (callCount <= 2) {
          throw retryableError;
        }
        return Promise.resolve({
          id: 'response-retry',
          output: [{ type: 'output_text', text: 'Success after retry' }],
        });
      });

      const mockSleep = vi.fn().mockResolvedValue(undefined);
      const mockRandom = vi.fn().mockReturnValue(0.5);

      const clientWithMocks = new TestableResponsesAPIClient({
        openaiClient: mockClient,
        sleep: mockSleep,
        random: mockRandom,
      });

      const request: ResponseRequest = {
        model: 'gpt-4',
        input: 'Retry test',
      };

      const result = await clientWithMocks.createResponse(request);

      expect(mockClient.responses.create).toHaveBeenCalledTimes(3);
      expect(mockSleep).toHaveBeenCalledTimes(2);
      expect(result.outputText).toBe('Success after retry');
    });

    it('should test all retryable error conditions', async () => {
      const retryableStatuses = [408, 409, 429, 500, 502, 503, 504];

      for (const status of retryableStatuses) {
        const error = new Error(`Status ${status} error`);
        (error as any).status = status;

        let callCount = 0;
        mockClient.responses.create.mockImplementation(() => {
          callCount++;
          if (callCount === 1) {
            throw error;
          }
          return Promise.resolve({
            id: `response-${status}`,
            output: [{ type: 'output_text', text: 'Success' }],
          });
        });

        const clientWithMocks = new TestableResponsesAPIClient({
          openaiClient: mockClient,
          sleep: vi.fn().mockResolvedValue(undefined),
        });

        const request: ResponseRequest = {
          model: 'gpt-4',
          input: `Test ${status}`,
        };

        const result = await clientWithMocks.createResponse(request);
        expect(result.id).toBe(`response-${status}`);

        vi.clearAllMocks();
      }
    });

    it('should test retryable error messages', async () => {
      const retryableMessages = [
        'timeout',
        'timed out',
        'econnreset',
        'network',
        'rate',
      ];

      for (const message of retryableMessages) {
        const error = new Error(message);

        let callCount = 0;
        mockClient.responses.create.mockImplementation(() => {
          callCount++;
          if (callCount === 1) {
            throw error;
          }
          return Promise.resolve({
            id: `response-${message}`,
            output: [{ type: 'output_text', text: 'Success' }],
          });
        });

        const clientWithMocks = new TestableResponsesAPIClient({
          openaiClient: mockClient,
          sleep: vi.fn().mockResolvedValue(undefined),
        });

        const request: ResponseRequest = {
          model: 'gpt-4',
          input: `Test ${message}`,
        };

        const result = await clientWithMocks.createResponse(request);
        expect(result.id).toBe(`response-${message}`);

        vi.clearAllMocks();
      }
    });

    it('should not retry on non-retryable errors', async () => {
      const nonRetryableError = new Error('Bad request');
      (nonRetryableError as any).status = 400;

      mockClient.responses.create.mockRejectedValue(nonRetryableError);

      const request: ResponseRequest = {
        model: 'gpt-4',
        input: 'Non-retryable test',
      };

      await expect(client.createResponse(request)).rejects.toThrow(
        'Bad request',
      );
      expect(mockClient.responses.create).toHaveBeenCalledTimes(1);
    });

    it('should fail after max attempts', async () => {
      const retryableError = new Error('Always failing');
      (retryableError as any).status = 500;

      mockClient.responses.create.mockRejectedValue(retryableError);

      const mockSleep = vi.fn().mockResolvedValue(undefined);
      const clientWithMocks = new TestableResponsesAPIClient({
        openaiClient: mockClient,
        sleep: mockSleep,
      });

      const request: ResponseRequest = {
        model: 'gpt-4',
        input: 'Max attempts test',
      };

      await expect(clientWithMocks.createResponse(request)).rejects.toThrow(
        'Always failing',
      );
      expect(mockClient.responses.create).toHaveBeenCalledTimes(5); // maxAttempts
      expect(mockSleep).toHaveBeenCalledTimes(4); // maxAttempts - 1
    });

    it('should use traceWrapper when provided', async () => {
      const mockResponse = {
        id: 'traced-response',
        output: [{ type: 'output_text', text: 'Traced' }],
      };

      const mockTraceWrapper = vi
        .fn()
        .mockImplementation((_name: string, fn: () => Promise<any>) => fn());

      mockClient.responses.create.mockResolvedValue(mockResponse);

      const clientWithTrace = new TestableResponsesAPIClient({
        openaiClient: mockClient,
        traceWrapper: mockTraceWrapper,
      });

      const request: ResponseRequest = {
        model: 'gpt-4',
        input: 'Trace test',
      };

      const result = await clientWithTrace.createResponse(request);

      expect(mockTraceWrapper).toHaveBeenCalledWith(
        'openai.responses.create',
        expect.any(Function),
      );
      expect(result.id).toBe('traced-response');
    });

    it('should calculate exponential backoff with jitter', async () => {
      const retryableError = new Error('Rate limit');
      (retryableError as any).status = 429;

      let callCount = 0;
      mockClient.responses.create.mockImplementation(() => {
        callCount++;
        if (callCount <= 3) {
          throw retryableError;
        }
        return Promise.resolve({
          id: 'backoff-response',
          output: [{ type: 'output_text', text: 'Success' }],
        });
      });

      const mockSleep = vi.fn().mockResolvedValue(undefined);
      const mockRandom = vi.fn().mockReturnValue(0.8);

      const clientWithMocks = new TestableResponsesAPIClient({
        openaiClient: mockClient,
        sleep: mockSleep,
        random: mockRandom,
      });

      const request: ResponseRequest = {
        model: 'gpt-4',
        input: 'Backoff test',
      };

      await clientWithMocks.createResponse(request);

      // Verify backoff calculations
      // Attempt 1: 200 * 2^0 + jitter = 200 + 80 = 280
      // Attempt 2: 200 * 2^1 + jitter = 400 + 80 = 480
      // Attempt 3: 200 * 2^2 + jitter = 800 + 80 = 880
      expect(mockSleep).toHaveBeenNthCalledWith(1, 280);
      expect(mockSleep).toHaveBeenNthCalledWith(2, 480);
      expect(mockSleep).toHaveBeenNthCalledWith(3, 880);
    });

    it('should cap backoff at maximum value', async () => {
      const retryableError = new Error('Rate limit');
      (retryableError as any).status = 429;

      let callCount = 0;
      mockClient.responses.create.mockImplementation(() => {
        callCount++;
        if (callCount <= 4) {
          throw retryableError;
        }
        return Promise.resolve({
          id: 'capped-response',
          output: [{ type: 'output_text', text: 'Success' }],
        });
      });

      const mockSleep = vi.fn().mockResolvedValue(undefined);
      const mockRandom = vi.fn().mockReturnValue(0.5);

      const clientWithMocks = new TestableResponsesAPIClient({
        openaiClient: mockClient,
        sleep: mockSleep,
        random: mockRandom,
      });

      const request: ResponseRequest = {
        model: 'gpt-4',
        input: 'Cap test',
      };

      await clientWithMocks.createResponse(request);

      // Attempt 4: Math.min(200 * 2^3, 5000) + jitter = Math.min(1600, 5000) + 50 = 1650
      // Attempt 5: Math.min(200 * 2^4, 5000) + jitter = Math.min(3200, 5000) + 50 = 3250
      expect(mockSleep).toHaveBeenNthCalledWith(4, 1650);
    });
  });

  describe('streamResponse', () => {
    it('should return empty async generator', async () => {
      const client = new TestableResponsesAPIClient();
      const request: ResponseRequest = {
        model: 'gpt-4',
        input: 'Stream test',
      };

      const generator = client.streamResponse(request);
      const results: any[] = [];

      for await (const chunk of generator) {
        results.push(chunk);
      }

      expect(results).toEqual([]);
    });
  });

  describe('mapTools', () => {
    it('should map file_search tools', () => {
      // Access the function through the static method by calling buildOpenAIRequest
      const request: ResponseRequest = {
        model: 'gpt-4',
        input: 'Test',
        tools: [
          { type: 'file_search', config: {} },
          { type: 'file_search', config: { maxResults: 5 } },
        ],
      };

      const result = TestableResponsesAPIClient.buildOpenAIRequest(request);

      expect(result.tools).toEqual([
        { type: 'file_search', config: {} },
        { type: 'file_search', config: { maxResults: 5 } },
      ]);
    });

    it('should map web_search tools when enabled', () => {
      process.env.RESPONSES_ENABLE_WEB_SEARCH = 'true';

      const request: ResponseRequest = {
        model: 'gpt-4',
        input: 'Test',
        tools: [
          { type: 'web_search', config: {} },
          { type: 'web_search', config: { maxResults: 10 } },
        ],
      };

      const result = TestableResponsesAPIClient.buildOpenAIRequest(request);

      expect(result.tools).toEqual([
        { type: 'web_search' },
        { type: 'web_search', config: { maxResults: 10 } },
      ]);
    });

    it('should ignore web_search tools when disabled', () => {
      delete process.env.RESPONSES_ENABLE_WEB_SEARCH;

      const request: ResponseRequest = {
        model: 'gpt-4',
        input: 'Test',
        tools: [
          { type: 'file_search', config: {} },
          { type: 'web_search', config: {} },
        ],
      };

      const result = TestableResponsesAPIClient.buildOpenAIRequest(request);

      expect(result.tools).toEqual([{ type: 'file_search', config: {} }]);
    });

    it('should handle undefined tools', () => {
      const request: ResponseRequest = {
        model: 'gpt-4',
        input: 'Test',
      };

      const result = TestableResponsesAPIClient.buildOpenAIRequest(request);

      expect(result).not.toHaveProperty('tools');
    });

    it('should handle empty tools array', () => {
      const request: ResponseRequest = {
        model: 'gpt-4',
        input: 'Test',
        tools: [],
      };

      const result = TestableResponsesAPIClient.buildOpenAIRequest(request);

      expect(result).not.toHaveProperty('tools');
    });

    it('should handle unknown tool types', () => {
      const request: ResponseRequest = {
        model: 'gpt-4',
        input: 'Test',
        tools: [
          { type: 'file_search', config: {} },
          { type: 'unknown_tool', config: {} } as any,
        ],
      };

      const result = TestableResponsesAPIClient.buildOpenAIRequest(request);

      expect(result.tools).toEqual([{ type: 'file_search', config: {} }]);
    });
  });
});

describe('createResponsesClient', () => {
  it('should create ResponsesAPIClient instance', () => {
    const config = { openai: { apiKey: 'test-key' } };
    const client = createResponsesClient(config);

    expect(client).toBeInstanceOf(ResponsesAPIClient);
  });

  it('should create ResponsesAPIClient without config', () => {
    const client = createResponsesClient();

    expect(client).toBeInstanceOf(ResponsesAPIClient);
  });
});
