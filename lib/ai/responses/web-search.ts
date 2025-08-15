import type { Annotation, Tool, ToolResult } from './types';

export type WebSearchResult = {
  url: string;
  title?: string;
  snippet?: string;
  score?: number;
  source?: string;
  metadata?: Record<string, unknown>;
};

export function webSearchToolEnabled(tools?: Tool[]) {
  return Boolean(tools?.some((t) => t.type === 'web_search'));
}

export function parseWebSearch(response: any): {
  annotations: Annotation[];
  toolResults: ToolResult[];
} {
  const annotations: Annotation[] = [];
  const toolResults: ToolResult[] = [];

  const outputs: any[] = Array.isArray(response?.output) ? response.output : [];

  for (const item of outputs) {
    if (
      item.type === 'annotation' &&
      item.annotation?.source === 'web_search'
    ) {
      annotations.push({
        type: 'web_source',
        data: {
          url: item.annotation.url,
          title: item.annotation.title,
          snippet: item.annotation.snippet,
          score: item.annotation.score,
          source: item.annotation.engine,
          metadata: item.annotation.metadata,
        },
      });
    }

    if (item.type === 'tool_result' && item.tool_name === 'web_search') {
      const results: WebSearchResult[] = Array.isArray(item.results)
        ? item.results.map((r: any) => ({
            url: r.url,
            title: r.title,
            snippet: r.snippet,
            score: r.score,
            source: r.engine,
            metadata: r.metadata,
          }))
        : [];
      toolResults.push({ type: 'web_search', results });
    }
  }

  return { annotations, toolResults };
}
