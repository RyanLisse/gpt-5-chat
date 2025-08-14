import type { Annotation, Tool, ToolResult } from './types';

export type FileSearchResult = {
  documentId: string;
  filename?: string;
  passage?: string;
  score?: number;
  metadata?: Record<string, unknown>;
};

export function fileSearchToolEnabled(tools?: Tool[]) {
  return Boolean(tools?.some((t) => t.type === 'file_search'));
}

// Parse a mocked OpenAI Responses API output into citations/annotations
export function parseFileSearchCitations(response: any): {
  annotations: Annotation[];
  toolResults: ToolResult[];
} {
  const annotations: Annotation[] = [];
  const toolResults: ToolResult[] = [];

  const outputs: any[] = Array.isArray(response?.output) ? response.output : [];

  for (const item of outputs) {
    if (item.type === 'annotation' && item.annotation?.source === 'file_search') {
      annotations.push({
        type: 'citation',
        data: {
          documentId: item.annotation.document_id,
          passage: item.annotation.passage,
          score: item.annotation.score,
          filename: item.annotation.filename,
          metadata: item.annotation.metadata,
        },
      });
    }

    if (item.type === 'tool_result' && item.tool_name === 'file_search') {
      const results: FileSearchResult[] = Array.isArray(item.results)
        ? item.results.map((r: any) => ({
            documentId: r.document_id,
            filename: r.filename,
            passage: r.passage,
            score: r.score,
            metadata: r.metadata,
          }))
        : [];
      toolResults.push({ type: 'file_search', results });
    }
  }

  return { annotations, toolResults };
}
