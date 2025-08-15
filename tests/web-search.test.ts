import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ResponsesAPIClient } from '@/lib/ai/responses/client';
import type { ResponseRequest } from '@/lib/ai/responses/types';
import { parseWebSearch } from '@/lib/ai/responses/web-search';

const prev = process.env.RESPONSES_ENABLE_WEB_SEARCH;

describe('web_search mapping and parsing (feature-flagged)', () => {
  beforeAll(() => {
    process.env.RESPONSES_ENABLE_WEB_SEARCH = 'true';
  });
  afterAll(() => {
    process.env.RESPONSES_ENABLE_WEB_SEARCH = prev;
  });

  it('includes web_search tool in payload when flag is on', () => {
    const req: ResponseRequest = {
      model: 'gpt-4o',
      input: 'Search news',
      tools: [{ type: 'web_search', config: { engine: 'bing', topK: 5 } }],
    };
    const payload = ResponsesAPIClient.buildOpenAIRequest(req) as any;
    expect(payload.tools).toBeDefined();
    expect(payload.tools.some((t: any) => t.type === 'web_search')).toBe(true);
  });

  it('parses web search annotations and results', () => {
    const mockResponse = {
      id: 'resp_ws',
      output: [
        {
          type: 'annotation',
          annotation: {
            source: 'web_search',
            url: 'https://example.com/a',
            title: 'Example A',
            snippet: 'Something...',
            score: 0.8,
            engine: 'bing',
            metadata: { rank: 1 },
          },
        },
        {
          type: 'tool_result',
          tool_name: 'web_search',
          results: [
            {
              url: 'https://example.com/a',
              title: 'Example A',
              snippet: 'Something...',
              score: 0.8,
              engine: 'bing',
              metadata: { rank: 1 },
            },
            {
              url: 'https://example.com/b',
              title: 'Example B',
              snippet: 'Else...',
              score: 0.7,
              engine: 'bing',
              metadata: { rank: 2 },
            },
          ],
        },
      ],
    };

    const { annotations, toolResults } = parseWebSearch(mockResponse);
    expect(annotations.length).toBe(1);
    expect(annotations[0].type).toBe('web_source');
    expect((annotations[0].data as any).url).toBe('https://example.com/a');

    expect(toolResults.length).toBe(1);
    expect(toolResults[0].type).toBe('web_search');
    expect(toolResults[0].results as any[]).toHaveLength(2);
  });
});
