import { describe, it, expect } from 'vitest';
import { parseStreamEvents, type OpenAIStreamEvent } from '@/lib/ai/responses/streaming';

describe('streaming event mapping', () => {
  it('maps text deltas to text chunks and ignores done markers', () => {
    const events: OpenAIStreamEvent[] = [
      { type: 'response.output_text.delta', delta: 'Hello' },
      { type: 'response.output_text.delta', delta: ' ' },
      { type: 'response.output_text.delta', delta: 'world' },
      { type: 'response.output_text.done' },
    ];
    const chunks = parseStreamEvents(events);
    expect(chunks).toHaveLength(3);
    expect(chunks.map((c) => c.type)).toEqual(['text', 'text', 'text']);
    expect(chunks.map((c) => c.data).join('')).toEqual('Hello world');
  });

  it('maps tool calls and annotations to corresponding chunk types', () => {
    const events: OpenAIStreamEvent[] = [
      { type: 'response.tool_call', name: 'file_search', arguments: { query: 'x' } },
      { type: 'response.annotation', annotation: { source: 'file_search', id: 'doc_1' } },
    ];
    const chunks = parseStreamEvents(events);
    expect(chunks).toHaveLength(2);
    expect(chunks[0].type).toBe('tool_invocation');
    expect((chunks[0].data as any).name).toBe('file_search');
    expect(chunks[1].type).toBe('annotation');
  });
});
