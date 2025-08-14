import OpenAI from 'openai';
import type {
  ResponseRequest,
  ResponseResult,
  ResponseChunk,
  ConversationState,
  Tool,
} from './types';
import { FileSearchService } from './file-search';

export type ResponsesAPIConfig = {
  openai?: {
    apiKey?: string;
    baseURL?: string;
  };
};

export class ResponsesAPIClient {
  private openai: OpenAI | null;

  constructor(config: ResponsesAPIConfig = {}) {
    const apiKey = config.openai?.apiKey ?? process.env.OPENAI_API_KEY;
    const baseURL = config.openai?.baseURL ?? process.env.OPENAI_BASE_URL;

    this.openai = apiKey
      ? new OpenAI({ apiKey, baseURL })
      : null;
  }

  static buildOpenAIRequest(req: ResponseRequest) {
    const input = Array.isArray(req.input)
      ? req.input.map((item) => {
          if (item.type === 'text') return { type: 'text', text: item.content } as const;
          if (item.type === 'image')
            return { type: 'input_image', image: { data: item.content } } as const;
          if (item.type === 'audio')
            return { type: 'input_audio', audio: { data: item.content } } as const;
          return { type: 'text', text: String((item as any).content ?? '') } as const;
        })
      : [{ type: 'text', text: req.input }];

    // Map tools (Slice 2: support file_search minimal config)
    const tools = mapTools(req.tools);

    return {
      model: req.model,
      input,
      metadata: req.metadata,
      store: req.store ?? false,
      // previous_response_id enables stateful conversations when we add Slice 3
      previous_response_id: req.previousResponseId,
      ...(tools.length ? { tools } : {}),
    } as const;
  }

  async createResponse(request: ResponseRequest): Promise<ResponseResult> {
    if (!this.openai) {
      throw new Error('OpenAI client not configured. Set OPENAI_API_KEY or pass via constructor.');
    }

    const payload = ResponsesAPIClient.buildOpenAIRequest(request);
    const res = await this.openai.responses.create(payload as any);

    const outputText =
      (res?.output?.
        filter((o: any) => o.type === 'output_text')
        .map((o: any) => o.text)
        .join('')) || '';

    const conversationState: ConversationState = {
      conversationId: res.id,
      previousResponseId: res.id,
    };

    const { annotations, toolResults } = FileSearchService.parseCitations(res);

    return {
      id: res.id,
      outputText,
      annotations,
      toolResults,
      metadata: res as any,
      conversationState,
    };
  }

  async *streamResponse(_request: ResponseRequest) {
    // Slice 1 placeholder: valid async generator with no data yet
    if (false) {
      yield { type: 'text', data: '' } as unknown as ResponseChunk;
    }
    return;
  }
}

export function createResponsesClient(config?: ResponsesAPIConfig) {
  return new ResponsesAPIClient(config);
}

function mapTools(tools?: Tool[]) {
  const out: any[] = [];
  for (const t of tools ?? []) {
    if (t.type === 'file_search') {
      // Minimal tool declaration; OpenAI will use configured vector stores
      out.push({ type: 'file_search', ...('config' in t ? { config: (t as any).config } : {}) });
    }
    // web_search and function tool mapping will be added in later slices
  }
  return out;
}
