import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ResponsesAPIClient } from '@/lib/ai/responses/client';

// OpenAI client seam via config.openaiClient
let createMock: any;

function makeArrayBuffer(len: number) {
  return new Uint8Array(len).buffer as ArrayBuffer;
}

describe('ResponsesAPIClient', () => {
  beforeEach(() => {
    createMock = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('buildOpenAIRequest maps input and tools correctly (text/image/audio)', () => {
    const req = {
      model: 'gpt-5-mini',
      input: [
        { type: 'text', content: 'hello', metadata: { a: 1 } },
        { type: 'image', content: makeArrayBuffer(8), metadata: { b: 'x' } },
        { type: 'audio', content: makeArrayBuffer(4) },
      ],
      tools: [{ type: 'file_search', config: {} }],
      previousResponseId: 'prev_123',
      store: false,
      metadata: { chatId: 'chat-1', userId: 'user-1' },
    } as const;

    const payload = ResponsesAPIClient.buildOpenAIRequest(req as any);

    expect(payload).toMatchObject({
      model: 'gpt-5-mini',
      previous_response_id: 'prev_123',
      store: false,
    });

    expect(Array.isArray(payload.input)).toBe(true);
    expect(payload.input).toEqual([
      { type: 'message', text: 'hello', role: 'user', metadata: { a: 1 } },
      {
        type: 'input_image',
        image: { data: makeArrayBuffer(8), metadata: { b: 'x' } },
      },
      { type: 'input_audio', audio: { data: makeArrayBuffer(4) } },
    ]);

    // Tools mapping
    expect(payload.tools).toEqual([{ type: 'file_search', config: {} }]);
  });

  it('buildOpenAIRequest maps string input to text item', () => {
    const req = {
      model: 'gpt-5-mini',
      input: 'hello world',
      store: false,
    } as const;

    const payload = ResponsesAPIClient.buildOpenAIRequest(req as any);
    expect(payload.input).toEqual([
      { type: 'message', text: 'hello world', role: 'user' },
    ]);
  });

  it('createResponse retries on retryable errors and returns aggregated outputText', async () => {
    // Fail twice with a retryable 429, then succeed
    createMock
      .mockRejectedValueOnce(
        Object.assign(new Error('rate limit'), { status: 429 }),
      )
      .mockRejectedValueOnce(
        Object.assign(new Error('timeout'), { status: 408 }),
      )
      .mockResolvedValueOnce({
        id: 'resp_1',
        output: [
          { type: 'output_text', text: 'Hello ' },
          { type: 'output_text', text: 'world!' },
        ],
      });

    const client = new ResponsesAPIClient({
      openaiClient: {
        responses: { create: (payload: any) => createMock(payload) },
      },
      random: () => 0,
      sleep: async () => {},
    });

    const promise = client.createResponse({
      model: 'gpt-5-mini',
      input: 'ping',
      tools: [{ type: 'file_search', config: {} }],
      store: false,
    } as any);

    const res = await promise;
    expect(createMock).toHaveBeenCalledTimes(3);
    expect(res.id).toBe('resp_1');
    expect(res.outputText).toBe('Hello world!');
  });
});
