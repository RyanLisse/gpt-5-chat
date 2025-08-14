import OpenAI from 'openai';
import type {
  ResponseRequest,
  ResponseResult,
  ConversationState,
  Tool,
} from './types';
import { parseFileSearchCitations } from './file-search';
import { parseWebSearch } from './web-search';
import { redactSensitiveData } from './redaction';

export type ResponsesAPIConfig = {
  openai?: {
    apiKey?: string;
    baseURL?: string;
  };
  // Optional tracing wrapper; when provided, all API calls go through it
  traceWrapper?: <TReturn>(name: string, fn: () => Promise<TReturn>) => Promise<TReturn>;
};

export class ResponsesAPIClient {
  private openai: OpenAI | null;
  private config: ResponsesAPIConfig;

  constructor(config: ResponsesAPIConfig = {}) {
    this.config = config;
    const apiKey = config.openai?.apiKey ?? process.env.OPENAI_API_KEY;
    const baseURL = config.openai?.baseURL ?? process.env.OPENAI_BASE_URL;

    this.openai = apiKey
      ? new OpenAI({ apiKey, baseURL })
      : null;
  }

  static buildOpenAIRequest(req: ResponseRequest) {
    const input = Array.isArray(req.input)
      ? req.input.map((item) => {
          if (item.type === 'text')
            return { type: 'text', text: item.content, ...(item.metadata ? { metadata: item.metadata } : {}) } as const;
          if (item.type === 'image')
            return { type: 'input_image', image: { data: item.content, ...(item.metadata ? { metadata: item.metadata } : {}) } } as const;
          if (item.type === 'audio')
            return { type: 'input_audio', audio: { data: item.content, ...(item.metadata ? { metadata: item.metadata } : {}) } } as const;
          return { type: 'text', text: String((item as any).content ?? '') } as const;
        })
      : [{ type: 'text', text: req.input }];

    // Map tools (Slice 2: support file_search minimal config)
    const tools = mapTools(req.tools);

    const payload = {
      model: req.model,
      input,
      metadata: redactSensitiveData(req.metadata ?? {}),
      store: req.store ?? false,
      // previous_response_id enables stateful conversations when we add Slice 3
      previous_response_id: req.previousResponseId,
      ...(tools.length ? { tools } : {}),
    } as const;

    return payload;
  }

  async createResponse(request: ResponseRequest): Promise<ResponseResult> {
    if (!this.openai) {
      throw new Error('OpenAI client not configured. Set OPENAI_API_KEY or pass via constructor.');
    }

    const payload = ResponsesAPIClient.buildOpenAIRequest(request);
    const client = this.openai; // local narrow for lints
    const call = () => client.responses.create(payload as any);
    const res = this.config.traceWrapper
      ? await this.config.traceWrapper('openai.responses.create', call)
      : await call();

    const outputText =
      (res?.output?.
        filter((o: any) => o.type === 'output_text')
        .map((o: any) => o.text)
        .join('')) || '';

    const conversationState: ConversationState = {
      conversationId: res.id,
      previousResponseId: res.id,
    };

    const { annotations: fsAnn, toolResults: fsTools } = parseFileSearchCitations(res);
    let annotations = fsAnn;
    let toolResults = fsTools;
    if (process.env.RESPONSES_ENABLE_WEB_SEARCH === 'true') {
      const { annotations: wsAnn, toolResults: wsTools } = parseWebSearch(res);
      annotations = [...annotations, ...wsAnn];
      toolResults = [...toolResults, ...wsTools];
    }

    return {
      id: res.id,
      outputText,
      annotations: annotations.map((a) => ({ ...a, data: redactSensitiveData(a.data ?? {}) })),
      toolResults,
      metadata: res as any,
      conversationState,
    };
  }

  async *streamResponse(_request: ResponseRequest) {
    // Slice 1 placeholder: valid async generator with no emitted chunks
    // Using yield* on an empty async generator to satisfy lint rules
    async function* empty() {}
    yield* empty();
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
    if (t.type === 'web_search') {
      // Feature-flagged; default OFF
      if (process.env.RESPONSES_ENABLE_WEB_SEARCH === 'true') {
        out.push({ type: 'web_search', ...('config' in t ? { config: (t as any).config } : {}) });
      }
    }
    // function tool mapping will be added in a later slice if needed
  }
  return out;
}
