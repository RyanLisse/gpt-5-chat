import { describe, it, expect } from 'vitest';
import { ResponsesAPIClient } from '@/lib/ai/responses/client';
import type { ResponseRequest } from '@/lib/ai/responses/types';

describe('ResponsesAPIClient.buildOpenAIRequest', () => {
  it('maps simple text input correctly', () => {
    const req: ResponseRequest = {
      model: 'gpt-4o-mini',
      input: 'Hello world',
    };
    const payload = ResponsesAPIClient.buildOpenAIRequest(req);

    expect(payload.model).toBe('gpt-4o-mini');
    expect(Array.isArray(payload.input)).toBe(true);
    const first = (payload.input as any[])[0];
    expect(first).toEqual({ type: 'text', text: 'Hello world' });
    expect(payload.store).toBe(false);
    expect(payload.previous_response_id).toBeUndefined();
  });

  it('maps multimodal inputs correctly', () => {
    const image = new ArrayBuffer(8);
    const req: ResponseRequest = {
      model: 'gpt-4o',
      input: [
        { type: 'text', content: 'What is this?' },
        { type: 'image', content: image },
      ],
      previousResponseId: 'resp_123',
      store: true,
      metadata: { traceId: 'abc' },
    };

    const payload = ResponsesAPIClient.buildOpenAIRequest(req) as any;

    expect(payload.model).toBe('gpt-4o');
    expect(payload.store).toBe(true);
    expect(payload.previous_response_id).toBe('resp_123');
    expect(payload.metadata).toEqual({ traceId: 'abc' });

    const [t, i] = payload.input;
    expect(t).toEqual({ type: 'text', text: 'What is this?' });
    expect(i.type).toBe('input_image');
    expect(i.image).toBeDefined();
    expect(i.image.data).toBeInstanceOf(ArrayBuffer);
  });
});
