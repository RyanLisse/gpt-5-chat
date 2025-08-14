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
  userId?: string;
  contextMetadata?: {
    turnCount: number;
    lastActivity: string;
    totalTokens: number;
    relevanceScore?: number;
  };
  createdAt?: string;
  updatedAt?: string;
  version?: number;
};

// AGENT 2: Interface Definitions for London School TDD
export interface IPersistenceProvider {
  saveConversation(conversationId: string, state: ConversationState): Promise<void>;
  getConversation(conversationId: string): Promise<ConversationState | null>;
  deleteConversation(conversationId: string): Promise<void>;
  cleanupExpiredConversations(olderThanHours: number): Promise<number>;
}

export interface IContextManager {
  optimizeContext(metadata: ContextOptimizationInput): Promise<ContextOptimizationResult>;
  truncateContext(conversationId: string, maxTokens: number): Promise<ContextTruncationResult>;
  calculateRelevanceScore(conversationId: string): Promise<number>;
  summarizeContext(conversationId: string): Promise<string>;
}

export type ContextOptimizationInput = {
  conversationId?: string;
  turnCount: number;
  totalTokens: number;
  maxTokens: number;
  lastActivity?: string;
};

export type ContextOptimizationResult = {
  shouldTruncate: boolean;
  relevanceScore: number;
  recommendedSummary?: string;
  tokensToRemove?: number;
};

export type ContextTruncationResult = {
  tokensRemoved: number;
  turnsRemoved: number;
  summaryCreated?: string;
};

export type ConversationResponse = {
  id: string;
  content: string;
  metadata?: Record<string, unknown>;
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
