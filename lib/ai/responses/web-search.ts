// Minimal web-search parser implementation for build system compatibility
// Note: This is a placeholder to resolve build dependencies

export interface WebSearchAnnotation {
  type: 'web';
  data: any;
}

export interface WebSearchToolResult {
  type: 'web_search';
  results?: any[];
}

export interface WebSearchParseResult {
  annotations: WebSearchAnnotation[];
  toolResults: WebSearchToolResult[];
}

/**
 * Parse web search results from API response
 * TODO: Implement actual web search parsing logic
 */
export function parseWebSearch(_response: any): WebSearchParseResult {
  // Placeholder implementation for build compatibility
  return {
    annotations: [],
    toolResults: [],
  };
}
