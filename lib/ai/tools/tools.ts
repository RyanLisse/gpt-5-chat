import type { FileUIPart, ModelMessage } from 'ai';
import type { Session } from 'next-auth';
import type { ModelId } from '@/lib/ai/model-id';
import { createDocumentTool } from '@/lib/ai/tools/create-document';
import { generateImage } from '@/lib/ai/tools/generate-image';
import { getWeather } from '@/lib/ai/tools/get-weather';
import { readDocument } from '@/lib/ai/tools/read-document';
import { requestSuggestions } from '@/lib/ai/tools/request-suggestions';
import { retrieve } from '@/lib/ai/tools/retrieve';
import { stockChart } from '@/lib/ai/tools/stock-chart';
import { updateDocument } from '@/lib/ai/tools/update-document';
import type { StreamWriter } from '../types';

export function getTools({
  dataStream,
  session,
  messageId,
  selectedModel,
  attachments = [],
  lastGeneratedImage = null,
  contextForLLM,
}: {
  dataStream: StreamWriter;
  session: Session;
  messageId: string;
  selectedModel: ModelId;
  attachments: FileUIPart[];
  lastGeneratedImage: { imageUrl: string; name: string } | null;
  contextForLLM: ModelMessage[];
}) {
  return {
    getWeather,
    createDocument: createDocumentTool({
      session,
      dataStream,
      contextForLLM,
      messageId,
      selectedModel,
    }),
    updateDocument: updateDocument({
      session,
      dataStream,
      messageId,
      selectedModel,
    }),
    requestSuggestions: requestSuggestions({
      session,
      dataStream,
    }),
    readDocument: readDocument({
      session,
      dataStream,
    }),
    // reasonSearch: createReasonSearch({
    //   session,
    //   dataStream,
    // }),
    retrieve,
    stockChart,
    generateImage: generateImage({ attachments, lastGeneratedImage }),
  };
}
