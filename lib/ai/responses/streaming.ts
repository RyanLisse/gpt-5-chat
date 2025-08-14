import type { ResponseChunk } from './types';

// Minimal mock-friendly event shapes for OpenAI Responses streaming
export type OpenAIStreamEvent =
  | { type: 'response.output_text.delta'; delta: string }
  | { type: 'response.output_text.done' }
  | { type: 'response.tool_call'; name: string; arguments: unknown }
  | { type: 'response.annotation'; annotation: unknown };

export function mapEventToChunks(evt: OpenAIStreamEvent): ResponseChunk[] {
  switch (evt.type) {
    case 'response.output_text.delta':
      return [{ type: 'text', data: evt.delta }];
    case 'response.output_text.done':
      return []; // marker only, no chunk needed for now
    case 'response.tool_call':
      return [{ type: 'tool_invocation', data: { name: evt.name, arguments: evt.arguments } }];
    case 'response.annotation':
      return [{ type: 'annotation', data: evt.annotation }];
    default:
      return [];
  }
}

export function parseStreamEvents(events: OpenAIStreamEvent[]): ResponseChunk[] {
  const out: ResponseChunk[] = [];
  for (const e of events) {
    out.push(...mapEventToChunks(e));
  }
  return out;
}
