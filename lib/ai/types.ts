import { z } from 'zod';
import type { getWeather } from '@/lib/ai/tools/get-weather';
import type { updateDocument } from '@/lib/ai/tools/update-document';
import type { requestSuggestions } from '@/lib/ai/tools/request-suggestions';
import type { readDocument } from '@/lib/ai/tools/read-document';
import type { generateImage } from '@/lib/ai/tools/generate-image';
import type { stockChart } from '@/lib/ai/tools/stock-chart';
import type { retrieve } from '@/lib/ai/tools/retrieve';
import type { InferUITool, UIMessage, UIMessageStreamWriter } from 'ai';

import type { ArtifactKind } from '../artifacts/artifact-kind';
import type { Suggestion } from '@/lib/db/schema';
import type { createDocumentTool as createDocument } from './tools/create-document';
import type { ModelId } from './model-id';

export const toolNameSchema = z.enum([
  'getWeather',
  'createDocument',
  'updateDocument',
  'requestSuggestions',
  'readDocument',
  'retrieve',
  'stockChart',
  'generateImage',
]);

const _ = toolNameSchema.options satisfies ToolName[];

type ToolNameInternal = z.infer<typeof toolNameSchema>;

export const frontendToolsSchema = z.enum([
  'generateImage',
  'createDocument',
]);

const __ = frontendToolsSchema.options satisfies ToolNameInternal[];

export type UiToolName = z.infer<typeof frontendToolsSchema>;
export const messageMetadataSchema = z.object({
  createdAt: z.date(),
  parentMessageId: z.string().nullable(),
  selectedModel: z.custom<ModelId>((val) => typeof val === 'string'),
  isPartial: z.boolean().optional(),
  selectedTool: frontendToolsSchema.optional(),
});

export type MessageMetadata = z.infer<typeof messageMetadataSchema>;

type weatherTool = InferUITool<typeof getWeather>;
type createDocumentTool = InferUITool<ReturnType<typeof createDocument>>;
type updateDocumentTool = InferUITool<ReturnType<typeof updateDocument>>;
type requestSuggestionsTool = InferUITool<
  ReturnType<typeof requestSuggestions>
>;
type readDocumentTool = InferUITool<ReturnType<typeof readDocument>>;
type generateImageTool = InferUITool<ReturnType<typeof generateImage>>;
type stockChartTool = InferUITool<typeof stockChart>;
type retrieveTool = InferUITool<typeof retrieve>;


export type ChatTools = {
  getWeather: weatherTool;
  createDocument: createDocumentTool;
  updateDocument: updateDocumentTool;
  requestSuggestions: requestSuggestionsTool;
  readDocument: readDocumentTool;
  generateImage: generateImageTool;
  stockChart: stockChartTool;
  retrieve: retrieveTool;
};

export type CustomUIDataTypes = {
  textDelta: string;
  imageDelta: string;
  sheetDelta: string;
  codeDelta: string;
  suggestion: Suggestion;
  appendMessage: string;
  id: string;
  messageId: string;
  title: string;
  kind: ArtifactKind;
  clear: null;
  finish: null;
};

export type ChatMessage = Omit<
  UIMessage<MessageMetadata, CustomUIDataTypes, ChatTools>,
  'metadata'
> & {
  metadata: MessageMetadata;
};

export type ToolName = keyof ChatTools;

export type StreamWriter = UIMessageStreamWriter<ChatMessage>;

export interface Attachment {
  name: string;
  url: string;
  contentType: string;
}
