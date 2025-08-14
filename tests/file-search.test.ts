import { describe, it, expect } from 'bun:test';
import { ResponsesAPIClient } from '@/lib/ai/responses/client';
import { FileSearchService } from '@/lib/ai/responses/file-search';
import type { ResponseRequest } from '@/lib/ai/responses/types';

describe('file_search mapping and parsing', () => {
  it('includes file_search tool in payload when provided', () => {
    const req: ResponseRequest = {
      model: 'gpt-4o',
      input: 'Find details',
      tools: [
        { type: 'file_search', config: { vectorStoreIds: ['vs_123'], maxResults: 3 } },
      ],
      store: true,
    };
    const payload = ResponsesAPIClient.buildOpenAIRequest(req) as any;
    expect(payload.tools).toBeDefined();
    expect(Array.isArray(payload.tools)).toBe(true);
    expect(payload.tools[0].type).toBe('file_search');
    expect(payload.tools[0].config.vectorStoreIds).toEqual(['vs_123']);
  });

  it('parses citations and tool results from response output', () => {
    const mockResponse = {
      id: 'resp_1',
      output: [
        {
          type: 'annotation',
          annotation: {
            source: 'file_search',
            document_id: 'doc_1',
            filename: 'manual.pdf',
            passage: 'The safety valve must be replaced every 6 months.',
            score: 0.92,
            metadata: { section: 'Maintenance' },
          },
        },
        {
          type: 'tool_result',
          tool_name: 'file_search',
          results: [
            {
              document_id: 'doc_1',
              filename: 'manual.pdf',
              passage: 'The safety valve must be replaced every 6 months.',
              score: 0.92,
              metadata: { section: 'Maintenance' },
            },
          ],
        },
      ],
    };

    const { annotations, toolResults } = FileSearchService.parseCitations(mockResponse);
    expect(annotations.length).toBe(1);
    expect(annotations[0].type).toBe('citation');
    expect((annotations[0].data as any).documentId).toBe('doc_1');

    expect(toolResults.length).toBe(1);
    expect(toolResults[0].type).toBe('file_search');
    expect(Array.isArray(toolResults[0].results)).toBe(true);
  });
});
