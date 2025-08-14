export type StreamingOptions = {
  enabled?: boolean;
};

export type InputMetadata = Record<string, string | number | boolean>;

export type ResponseMetadata = Record<string, unknown>;

export type Annotation = {
  type: string;
  data?: Record<string, unknown>;
};

export type ToolResult = {
  type: string;
  results?: unknown[];
};

export type ConversationState = {
  conversationId: string;
  previousResponseId?: string | null;
};

export type ResponseChunk = {
  type: 'text' | 'tool_invocation' | 'annotation';
  data: unknown;
};

export type MultimodalInput =
  | { type: 'text'; content: string; metadata?: InputMetadata }
  | { type: 'image'; content: ArrayBuffer; metadata?: InputMetadata }
  | { type: 'audio'; content: ArrayBuffer; metadata?: InputMetadata };

export type Tool =
  | { type: 'file_search'; config: Record<string, unknown> }
  | { type: 'web_search'; config: Record<string, unknown> }
  | { type: 'function'; config: Record<string, unknown> };

export type ResponseRequest = {
  model: string;
  input: string | MultimodalInput[];
  tools?: Tool[];
  previousResponseId?: string;
  store?: boolean;
  metadata?: Record<string, string>;
  streamingOptions?: StreamingOptions;
};

export type ResponseResult = {
  id: string;
  outputText: string;
  annotations: Annotation[];
  toolResults: ToolResult[];
  metadata: ResponseMetadata;
  conversationState: ConversationState;
};
