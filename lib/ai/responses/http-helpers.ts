import { DatabasePersistenceProvider } from '@/lib/ai/responses/persistence';
import { ConversationStateManager } from '@/lib/ai/responses/state';
import type {
  MultimodalInput,
  Annotation as ResponsesAnnotation,
} from '@/lib/ai/responses/types';
import type { ChatMessage } from '@/lib/ai/types';

export function toArrayBuffer(data: any): ArrayBuffer | null {
  if (!data) {
    return null;
  }
  if (data instanceof ArrayBuffer) {
    return data;
  }
  if (data instanceof Uint8Array) {
    const buffer = data.buffer;
    if (buffer instanceof ArrayBuffer) {
      return buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
    }
  }
  return null;
}

function extractTextFromContext(contextForLLM: any[]): string {
  return contextForLLM
    .map((m: any) => {
      const content = Array.isArray(m.content)
        ? m.content
        : [{ type: 'text', text: m.content }];
      return content
        .filter((c: any) => c.type === 'text' && typeof c.text === 'string')
        .map((c: any) => c.text)
        .join('\n');
    })
    .join('\n\n');
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

function isAudioMediaType(mt: unknown): mt is string {
  return typeof mt === 'string' && mt.startsWith('audio/');
}

function normalizeParts(m: any): any[] {
  if (typeof m?.content === 'string') {
    return [{ type: 'text', text: m.content }];
  }
  return Array.isArray(m?.content) ? (m.content as any[]) : [];
}

function pushText(inputs: MultimodalInput[], text: unknown) {
  if (isNonEmptyString(text)) {
    const trimmed = text.trim();
    if (trimmed) {
      inputs.push({ type: 'text', content: trimmed });
    }
  }
}

function pushImage(inputs: MultimodalInput[], imageData: unknown) {
  const buf = toArrayBuffer(imageData);
  if (buf) {
    inputs.push({ type: 'image', content: buf });
  }
}

function pushAudioIfApplicable(
  inputs: MultimodalInput[],
  data: unknown,
  mediaType: unknown,
) {
  const buf = toArrayBuffer(data);
  if (buf && isAudioMediaType(mediaType)) {
    inputs.push({ type: 'audio', content: buf });
  }
}

function flattenParts(contextForLLM: any[]): any[] {
  const all: any[] = [];
  for (const m of contextForLLM) {
    const parts = normalizeParts(m);
    for (const p of parts) {
      all.push(p);
    }
  }
  return all;
}

function buildInputsFromContext(contextForLLM: any[]): MultimodalInput[] {
  const inputs: MultimodalInput[] = [];
  const parts = flattenParts(contextForLLM);
  for (const part of parts) {
    switch (part?.type) {
      case 'text': {
        pushText(inputs, part?.text);
        break;
      }
      case 'image': {
        pushImage(inputs, part?.image);
        break;
      }
      case 'file': {
        pushAudioIfApplicable(inputs, part?.data, part?.mediaType);
        break;
      }
      default: {
        // ignore unknown types
        break;
      }
    }
  }
  return inputs;
}

export function buildMultimodalInputs(contextForLLM: any[]): {
  inputs: MultimodalInput[];
  textInput: string;
} {
  const textInput = extractTextFromContext(contextForLLM);
  const inputs = buildInputsFromContext(contextForLLM);
  return { inputs, textInput };
}

export function buildAssistantMessage(params: {
  res: { id: string; outputText: string; annotations: ResponsesAnnotation[] };
  messageId: string;
  chatId: string;
  userMessage: { id: string };
  selectedModel: string;
}): ChatMessage {
  const { res, messageId, chatId, userMessage, selectedModel } = params;
  const assistantMessage: ChatMessage = {
    id: messageId,
    chatId,
    role: 'assistant',
    parts: [
      { type: 'text', text: res.outputText } as any,
      ...res.annotations.map(
        (a: ResponsesAnnotation) => ({ type: 'annotation', data: a }) as any,
      ),
    ],
    attachments: [],
    createdAt: new Date(),
    annotations: [{ type: 'responses', data: { responseId: res.id } }] as any,
    isPartial: false,
    parentMessageId: userMessage.id,
    selectedModel: selectedModel as any,
    selectedTool: 'file_search' as any,
  } as any;

  return assistantMessage;
}

export function buildSSEFromMessage(assistantMessage: ChatMessage) {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      const payload = JSON.stringify({
        type: 'message',
        data: assistantMessage,
      });
      controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
      controller.close();
    },
  });
  return body;
}

export async function initializeConversationState(
  chatId: string,
  userId: string | null,
) {
  let previousResponseId: string | undefined;
  let convManager: ConversationStateManager | null = null;
  if (userId) {
    const persistence = new DatabasePersistenceProvider();
    convManager = new ConversationStateManager(persistence);
    const existing = await convManager.getConversationState(chatId);
    if (existing) {
      previousResponseId = existing.previousResponseId ?? undefined;
    } else {
      const nowIso = new Date().toISOString();
      await convManager.saveConversationState(chatId, {
        conversationId: chatId,
        userId,
        previousResponseId: null,
        contextMetadata: {
          turnCount: 0,
          lastActivity: nowIso,
          totalTokens: 0,
        },
        createdAt: nowIso,
        updatedAt: nowIso,
        version: 1,
      });
    }
  }
  return { convManager, previousResponseId } as const;
}
