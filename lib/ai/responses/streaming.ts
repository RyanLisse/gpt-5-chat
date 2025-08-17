import type { ResponseChunk } from './types';

// Minimal mock-friendly event shapes for OpenAI Responses streaming
export type OpenAIStreamEvent =
  | { type: 'response.output_text.delta'; delta: string }
  | { type: 'response.output_text.done' }
  | { type: 'response.tool_call'; name: string; args: unknown }
  | { type: 'response.annotation'; annotation: unknown }
  // Custom SSE events emitted by our server
  | { type: 'text-delta'; delta: string }
  | {
      type: 'data-responseId';
      data?: string | { responseId: string };
      id?: string;
    };

export function mapEventToChunks(evt: OpenAIStreamEvent): ResponseChunk[] {
  switch (evt.type) {
    case 'response.output_text.delta':
      return [{ type: 'text', data: evt.delta }];
    case 'response.output_text.done':
      return []; // marker only, no chunk needed for now
    case 'response.tool_call':
      return [
        { type: 'tool_invocation', data: { name: evt.name, args: evt.args } },
      ];
    case 'response.annotation':
      return [{ type: 'annotation', data: evt.annotation }];
    // Custom event mappings
    case 'text-delta':
      return [{ type: 'text', data: evt.delta }];
    case 'data-responseId': {
      const responseId =
        typeof evt.data === 'object' && evt.data?.responseId
          ? evt.data.responseId
          : (evt.data ?? evt.id ?? '');
      if (!responseId) {
        return [];
      }
      return [
        {
          type: 'annotation',
          data: { type: 'responses', data: { responseId } },
        },
      ];
    }
    default:
      return [];
  }
}

export function parseStreamEvents(
  events: OpenAIStreamEvent[],
): ResponseChunk[] {
  const out: ResponseChunk[] = [];
  for (const e of events) {
    out.push(...mapEventToChunks(e));
  }
  return out;
}
