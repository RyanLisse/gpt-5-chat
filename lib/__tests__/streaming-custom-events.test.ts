import { describe, expect, it } from 'vitest';
import {
  type OpenAIStreamEvent,
  parseStreamEvents,
} from '@/lib/ai/responses/streaming';

describe('custom SSE event mapping', () => {
  it("maps 'text-delta' to text chunks", () => {
    const events: OpenAIStreamEvent[] = [
      { type: 'text-delta', delta: 'He' },
      { type: 'text-delta', delta: 'llo' },
      { type: 'text-delta', delta: '!' },
    ];
    const chunks = parseStreamEvents(events);
    expect(chunks.map((c) => c.type)).toEqual(['text', 'text', 'text']);
    expect(chunks.map((c) => c.data).join('')).toEqual('Hello!');
  });

  it("maps 'data-responseId' to an annotation chunk with responses metadata", () => {
    const eventsWithData: OpenAIStreamEvent[] = [
      { type: 'data-responseId', data: 'resp_123' },
    ];
    const chunksA = parseStreamEvents(eventsWithData);
    expect(chunksA).toHaveLength(1);
    expect(chunksA[0].type).toBe('annotation');
    expect(chunksA[0].data).toMatchObject({
      type: 'responses',
      data: { responseId: 'resp_123' },
    });

    const eventsWithId: OpenAIStreamEvent[] = [
      { type: 'data-responseId', id: 'resp_999' },
    ];
    const chunksB = parseStreamEvents(eventsWithId);
    expect(chunksB).toHaveLength(1);
    expect(chunksB[0].data).toMatchObject({
      type: 'responses',
      data: { responseId: 'resp_999' },
    });

    // Test object format (as sent by API)
    const eventsWithObjectData: OpenAIStreamEvent[] = [
      { type: 'data-responseId', data: { responseId: 'resp_obj_456' } },
    ];
    const chunksC = parseStreamEvents(eventsWithObjectData);
    expect(chunksC).toHaveLength(1);
    expect(chunksC[0].data).toMatchObject({
      type: 'responses',
      data: { responseId: 'resp_obj_456' },
    });
  });
});
