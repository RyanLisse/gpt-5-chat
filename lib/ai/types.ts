import type { UIMessage, UIMessageStreamWriter } from 'ai';
import { z } from 'zod';
import type { Suggestion } from '@/lib/db/schema';
import type { ArtifactKind } from '../artifacts/artifact-kind';
import type { ModelId } from './model-id';
export const messageMetadataSchema = z.object({
  createdAt: z.date(),
  parentMessageId: z.string().nullable(),
  selectedModel: z.custom<ModelId>((val) => typeof val === 'string'),
  isPartial: z.boolean().optional(),
  // Optional UI-selected tool for the message (UI-only; may be null/undefined)
  selectedTool: z.custom<UiToolName | null | undefined>(() => true).optional(),
});

export type MessageMetadata = z.infer<typeof messageMetadataSchema>;

// Tool name unions
export type UiToolName = 'generateImage' | 'createDocument';
// Full set of tool names that may appear in streamed parts
export type ToolName =
  | UiToolName
  | 'updateDocument'
  | 'getWeather'
  | 'requestSuggestions'
  | 'retrieve'
  | 'readDocument'
  | 'stockChart';

// Tool map keyed by supported tool names (no payload shape defined yet)
export type ChatTools = Record<ToolName, any>;

export type CustomUIDataTypes = {
  textDelta: string;
  imageDelta: string;
  sheetDelta: string;
  codeDelta: string;
  appendMessage: string;
  id: string;
  messageId: string;
  title: string;
  kind: ArtifactKind;
  clear: null;
  finish: null;
  responseId: string;
  suggestion: Suggestion;
};

export type ChatMessage = Omit<
  UIMessage<MessageMetadata, CustomUIDataTypes, ChatTools>,
  'metadata'
> & {
  metadata: MessageMetadata;
  annotations?: any[]; // Database annotations field for compatibility
};

export type StreamWriter = UIMessageStreamWriter<ChatMessage>;

export type Attachment = {
  name: string;
  url: string;
  contentType: string;
};
