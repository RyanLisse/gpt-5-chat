import OpenAI from 'openai';
import { parseFileSearchCitations } from './file-search';
import { redactSensitiveData } from './redaction';
import type {
  ConversationState,
  ResponseRequest,
  ResponseResult,
  Tool,
} from './types';
import { parseWebSearch } from './web-search';

export type ResponsesAPIConfig = {
  openai?: {
    apiKey?: string;
    baseURL?: string;
  };
  // Optional injected OpenAI-like client for testing
  openaiClient?: { responses: { create: (payload: any) => Promise<any> } };
  // Testing hooks: override sleep and random for deterministic, no-delay retries
  sleep?: (ms: number) => Promise<void>;
  random?: () => number;
  // Optional tracing wrapper; when provided, all API calls go through it
  traceWrapper?: <TReturn>(
    name: string,
    fn: () => Promise<TReturn>,
  ) => Promise<TReturn>;
};

export class ResponsesAPIClient {
  private readonly openai: {
    responses: { create: (payload: any) => Promise<any> };
  } | null;
  private readonly config: ResponsesAPIConfig;

  constructor(config: ResponsesAPIConfig = {}) {
    this.config = config;
    if (config.openaiClient) {
      this.openai = config.openaiClient;
    } else {
      const apiKey = config.openai?.apiKey ?? process.env.OPENAI_API_KEY;
      const baseURL = config.openai?.baseURL ?? process.env.OPENAI_BASE_URL;
      this.openai = apiKey ? (new OpenAI({ apiKey, baseURL }) as any) : null;
    }
  }

  static buildOpenAIRequest(req: ResponseRequest) {
    const input = Array.isArray(req.input)
      ? req.input.map((item) => {
          if (item.type === 'text') {
            // If content is explicitly present, treat as a full message item.
            // If content is missing (edge case), emit a plain text item per tests.
            const hasContent = 'content' in (item as any);
            const text = String((item as any).content ?? '');
            if (hasContent) {
              return {
                type: 'message',
                text,
                role: 'user',
                ...(item.metadata ? { metadata: item.metadata } : {}),
              } as const;
            }
            return { type: 'text', text, role: 'user' } as const;
          }
          if (item.type === 'image') {
            return {
              type: 'input_image',
              image: {
                data: item.content,
                ...(item.metadata ? { metadata: item.metadata } : {}),
              },
            } as const;
          }
          if (item.type === 'audio') {
            return {
              type: 'input_audio',
              audio: {
                data: item.content,
                ...(item.metadata ? { metadata: item.metadata } : {}),
              },
            } as const;
          }
          // Unknown input type: fall back to a plain text item per tests.
          return {
            type: 'text',
            text: String((item as any).content ?? ''),
            role: 'user',
          } as const;
        })
      : [{ type: 'message', text: req.input, role: 'user' }];

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
      throw new Error(
        'OpenAI client not configured. Set OPENAI_API_KEY or pass via constructor.',
      );
    }

    const payload = ResponsesAPIClient.buildOpenAIRequest(request);
    const client = this.openai; // local narrow for lints

    // Simple exponential backoff with jitter for transient errors
    const sleep =
      this.config.sleep ??
      ((ms: number) => new Promise((r) => setTimeout(r, ms)));
    const isRetryable = (err: any) => {
      const status = err?.status ?? err?.response?.status;
      const message = String(err?.message || '').toLowerCase();
      // Retry on common transient/network/rate-limit/server errors
      return (
        status === 408 ||
        status === 409 ||
        status === 429 ||
        (status >= 500 && status < 600) ||
        message.includes('timeout') ||
        message.includes('timed out') ||
        message.includes('econnreset') ||
        message.includes('network') ||
        message.includes('rate')
      );
    };

    const maxAttempts = 5;
    let res: any;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const call = () => client.responses.create(payload as any);
        res = this.config.traceWrapper
          ? await this.config.traceWrapper('openai.responses.create', call)
          : await call();
        break; // success
      } catch (err) {
        if (!isRetryable(err) || attempt === maxAttempts) {
          throw err;
        }
        // Exponential backoff with jitter (base 200ms)
        const backoff = Math.min(200 * 2 ** (attempt - 1), 5000);
        const rng = this.config.random ?? Math.random;
        const jitter = Math.floor(rng() * 100);
        await sleep(backoff + jitter);
      }
    }

    const outputText =
      res?.output
        ?.filter((o: any) => o.type === 'output_text')
        .map((o: any) => o.text)
        .join('') || '';

    const conversationState: ConversationState = {
      conversationId: res.id,
      previousResponseId: res.id,
    };

    const { annotations: fsAnn, toolResults: fsTools } =
      parseFileSearchCitations(res);
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
      annotations: annotations.map((a) => ({
        ...a,
        data: redactSensitiveData(a.data ?? {}),
      })),
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
      out.push({
        type: 'file_search',
        ...('config' in t ? { config: (t as any).config } : {}),
      });
    }
    if (t.type === 'web_search') {
      // Feature-flagged; default OFF
      if (process.env.RESPONSES_ENABLE_WEB_SEARCH === 'true') {
        const cfg: any = (t as any).config;
        const hasNonEmptyConfig =
          cfg && typeof cfg === 'object' && Object.keys(cfg).length > 0;
        out.push({
          type: 'web_search',
          ...(hasNonEmptyConfig ? { config: cfg } : {}),
        });
      }
    }
    // function tool mapping will be added in a later slice if needed
  }
  return out;
}
