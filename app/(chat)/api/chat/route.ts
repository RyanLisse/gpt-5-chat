import { convertToModelMessages } from 'ai';
import type { NextRequest } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { getModelDefinition, type ModelDefinition } from '@/lib/ai/all-models';
// Removed getTools: not used with Responses API path
import { allTools } from '@/lib/ai/tools/tools-definitions';
import type { ChatMessage, ToolName } from '@/lib/ai/types';
// Removed getLanguageModel/getModelProviderOptions: not used with Responses API path
import type { CreditReservation } from '@/lib/credits/credit-reservation';
import {
  filterAffordableTools,
  getBaseModelCostByModelId,
} from '@/lib/credits/credits-utils';
// Removed systemPrompt: not used with Responses API path
import {
  getChatById,
  getMessageById,
  getUserById,
  saveChat,
  saveMessage,
} from '@/lib/db/queries';
import { generateUUID } from '@/lib/utils';
import { replaceFilePartUrlByBinaryDataInMessages } from '@/lib/utils/download-assets';
import { generateTitleFromUserMessage } from '../../actions';

// Removed resumable-stream imports: streaming disabled for Responses API MVP

import { ChatSDKError } from '@/lib/ai/errors';
import type { ModelId } from '@/lib/ai/model-id';
import { createResponsesClient } from '@/lib/ai/responses/client';
import type {
  ResponseRequest,
  Annotation as ResponsesAnnotation,
} from '@/lib/ai/responses/types';
import { calculateMessagesTokens } from '@/lib/ai/token-utils';
// 'after' was only used for resumable streams; not needed in Responses API path
import {
  createAnonymousSession,
  getAnonymousSession,
  setAnonymousSession,
} from '@/lib/anonymous-session-server';
import type { AnonymousSession } from '@/lib/types/anonymous';
import { ANONYMOUS_LIMITS } from '@/lib/types/anonymous';
// Removed markdownJoinerTransform: not used with Responses API path
import { checkAnonymousRateLimit, getClientIP } from '@/lib/utils/rate-limit';
import { addExplicitToolRequestToMessages } from './addExplicitToolRequestToMessages';
import { filterReasoningParts } from './filterReasoningParts';
import { getCreditReservation } from './get-credit-reservation';
import { getRecentGeneratedImage } from './get-recent-generated-image';
import { getThreadUpToMessageId } from './get-thread-up-to-message-id';

// Create shared Redis clients for resumable stream and cleanup
let redisPublisher: any = null;
let redisSubscriber: any = null;

if (process.env.REDIS_URL) {
  (async () => {
    const redis = await import('redis');
    redisPublisher = redis.createClient({ url: process.env.REDIS_URL });
    redisSubscriber = redis.createClient({ url: process.env.REDIS_URL });
    await Promise.all([redisPublisher.connect(), redisSubscriber.connect()]);
  })();
}

// Resumable stream context removed in Responses API MVP (non-streaming)

// Moved Redis access functions to separate utility file to avoid Next.js route export conflicts
// Use getRedisSubscriber/getRedisPublisher from @/lib/redis/client instead

export async function POST(request: NextRequest) {
  try {
    const {
      id: chatId,
      message: userMessage,
      prevMessages: anonymousPreviousMessages,
    }: {
      id: string;
      message: ChatMessage;
      prevMessages: ChatMessage[];
    } = await request.json();

    if (!userMessage) {
      return new Response('No user message found', { status: 400 });
    }

    // Extract selectedModel from user message metadata
    const selectedModelId = userMessage.metadata?.selectedModel as ModelId;

    if (!selectedModelId) {
      return new Response('No selectedModel in user message metadata', {
        status: 400,
      });
    }

    const session = await auth();

    const userId = session?.user?.id || null;
    const isAnonymous = userId === null;
    let anonymousSession: AnonymousSession | null = null;

    // Check for anonymous users

    if (userId) {
      // TODO: Consider if checking if user exists is really needed
      const user = await getUserById({ userId });
      if (!user) {
        return new Response('User not found', { status: 404 });
      }
    } else {
      // Apply rate limiting for anonymous users
      const clientIP = getClientIP(request);
      const rateLimitResult = await checkAnonymousRateLimit(
        clientIP,
        redisPublisher,
      );

      if (!rateLimitResult.success) {
        return new Response(
          JSON.stringify({
            error: rateLimitResult.error,
            type: 'RATE_LIMIT_EXCEEDED',
          }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              ...(rateLimitResult.headers || {}),
            },
          },
        );
      }

      anonymousSession = await getAnonymousSession();
      if (!anonymousSession) {
        anonymousSession = await createAnonymousSession();
      }

      // Check message limits
      if (anonymousSession.remainingCredits <= 0) {
        return new Response(
          JSON.stringify({
            error: `You've used all ${ANONYMOUS_LIMITS.CREDITS} free messages. Sign up to continue chatting with unlimited access!`,
            type: 'ANONYMOUS_LIMIT_EXCEEDED',
            maxMessages: ANONYMOUS_LIMITS.CREDITS,
            suggestion:
              'Create an account to get unlimited messages and access to more AI models',
          }),
          {
            status: 402,
            headers: {
              'Content-Type': 'application/json',
              ...(rateLimitResult.headers || {}),
            },
          },
        );
      }

      // Validate model for anonymous users
      if (!ANONYMOUS_LIMITS.AVAILABLE_MODELS.includes(selectedModelId as any)) {
        return new Response(
          JSON.stringify({
            error: 'Model not available for anonymous users',
            availableModels: ANONYMOUS_LIMITS.AVAILABLE_MODELS,
          }),
          {
            status: 403,
            headers: {
              'Content-Type': 'application/json',
              ...(rateLimitResult.headers || {}),
            },
          },
        );
      }
    }

    // Extract selectedTool from user message metadata
    const selectedTool = userMessage.metadata.selectedTool || null;
    let modelDefinition: ModelDefinition;
    try {
      modelDefinition = getModelDefinition(selectedModelId);
    } catch (_error) {
      return new Response('Model not found', { status: 404 });
    }
    // Skip database operations for anonymous users
    if (!isAnonymous) {
      const chat = await getChatById({ id: chatId });

      if (chat && chat.userId !== userId) {
        return new Response('Unauthorized', { status: 401 });
      }

      if (chat) {
        if (chat.userId !== userId) {
          return new Response('Unauthorized', { status: 401 });
        }
      } else {
        const title = await generateTitleFromUserMessage({
          message: userMessage,
        });

        await saveChat({ id: chatId, userId, title });
      }

      const [exsistentMessage] = await getMessageById({ id: userMessage.id });

      if (exsistentMessage && exsistentMessage.chatId !== chatId) {
        return new Response('Unauthorized', { status: 401 });
      }

      if (!exsistentMessage) {
        // If the message does not exist, save it
        await saveMessage({
          _message: {
            id: userMessage.id,
            chatId,
            role: userMessage.role,
            parts: userMessage.parts,
            attachments: [],
            createdAt: new Date(),
            annotations: [],
            isPartial: false,
            parentMessageId: userMessage.metadata?.parentMessageId || null,
            selectedModel: selectedModelId,
            selectedTool,
          },
        });
      }
    }

    let explicitlyRequestedTools: ToolName[] | null = null;
    if (selectedTool === 'generateImage') {
      explicitlyRequestedTools = ['generateImage'];
    } else if (selectedTool === 'createDocument') {
      explicitlyRequestedTools = ['createDocument', 'updateDocument'];
    }

    const baseModelCost = getBaseModelCostByModelId(selectedModelId);

    let reservation: CreditReservation | null = null;

    if (!isAnonymous) {
      const { reservation: res, error: creditError } =
        await getCreditReservation(userId, baseModelCost);

      if (creditError) {
        return new Response(creditError, {
          status: 402,
        });
      }

      reservation = res;
    } else if (anonymousSession) {
      // Increment message count and update session
      anonymousSession.remainingCredits -= baseModelCost;
      await setAnonymousSession(anonymousSession);
    }

    let activeTools: ToolName[] = filterAffordableTools(
      isAnonymous ? ANONYMOUS_LIMITS.AVAILABLE_TOOLS : allTools,
      isAnonymous
        ? ANONYMOUS_LIMITS.CREDITS
        : reservation
          ? reservation.budget - baseModelCost
          : 0,
    );

    // Disable all tools for models with unspecified features
    if (modelDefinition.features) {
    } else {
      activeTools = [];
    }

    if (
      explicitlyRequestedTools &&
      explicitlyRequestedTools.length > 0 &&
      !activeTools.some((tool: ToolName) =>
        explicitlyRequestedTools.includes(tool),
      )
    ) {
      return new Response(
        `Insufficient budget for requested tool: ${explicitlyRequestedTools}.`,
        {
          status: 402,
        },
      );
    } else if (
      explicitlyRequestedTools &&
      explicitlyRequestedTools.length > 0
    ) {
      activeTools = explicitlyRequestedTools;
    }

    // Validate input token limit (50k tokens for user message)
    const totalTokens = calculateMessagesTokens(
      convertToModelMessages([userMessage]),
    );
    const MAX_INPUT_TOKENS = 50_000;

    if (totalTokens > MAX_INPUT_TOKENS) {
      const error = new ChatSDKError(
        'input_too_long:chat',
        `Message too long: ${totalTokens} tokens (max: ${MAX_INPUT_TOKENS})`,
      );
      return error.toResponse();
    }

    const messageThreadToParent = isAnonymous
      ? anonymousPreviousMessages
      : await getThreadUpToMessageId(
          chatId,
          userMessage.metadata.parentMessageId,
        );

    const messages = [...messageThreadToParent, userMessage].slice(-5);

    // Process conversation history
    const _lastGeneratedImage = getRecentGeneratedImage(messages);
    addExplicitToolRequestToMessages(
      messages,
      activeTools,
      explicitlyRequestedTools ?? [],
    );

    // Filter out reasoning parts to ensure compatibility between different models
    const messagesWithoutReasoning = filterReasoningParts(messages.slice(-5));

    // TODO: Do something smarter by truncating the context to a numer of tokens (maybe even based on setting)
    const modelMessages = convertToModelMessages(messagesWithoutReasoning);

    // TODO: remove this when the gateway provider supports URLs
    const contextForLLM =
      await replaceFilePartUrlByBinaryDataInMessages(modelMessages);

    // Create AbortController with 55s timeout for credit cleanup
    const abortController = new AbortController();
    const timeoutId = setTimeout(async () => {
      if (reservation) {
        await reservation.cleanup();
      }
      abortController.abort();
    }, 290_000); // 290 seconds

    // Ensure cleanup on any unhandled errors
    try {
      const messageId = generateUUID();

      // Build Responses API request
      const selectedOrDefaultModel = (selectedModelId ??
        'openai/gpt-5-mini') as ModelId;

      // Concatenate text from recent messages; ignore non-text parts for MVP
      const textInput = contextForLLM
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

      const client = createResponsesClient({
        openai: {
          apiKey: process.env.OPENAI_API_KEY,
          baseURL: process.env.OPENAI_BASE_URL,
        },
      });

      const req: ResponseRequest = {
        model: selectedOrDefaultModel.replace('openai/', ''),
        input: textInput,
        tools: [{ type: 'file_search', config: {} }],
        store: false,
        metadata: {
          chatId,
          userId: userId || 'anonymous',
        },
      };

      const res = await client.createResponse(req);

      // Construct assistant message
      const assistantMessage: ChatMessage = {
        id: messageId,
        chatId,
        role: 'assistant',
        parts: [
          { type: 'text', text: res.outputText },
          ...res.annotations.map(
            (a: ResponsesAnnotation) =>
              ({ type: 'annotation', data: a }) as any,
          ),
        ],
        attachments: [],
        createdAt: new Date(),
        annotations: [],
        isPartial: false,
        parentMessageId: userMessage.id,
        selectedModel: selectedOrDefaultModel,
        selectedTool: 'file_search' as any,
      } as any;

      // Persist assistant message
      if (!isAnonymous) {
        await saveMessage({ _message: assistantMessage as any });
      }

      // Finalize/reserve credits: add tool cost if defined
      const toolCost = 0; // no per-call tool costing implemented for file_search here
      const actualCost = baseModelCost + toolCost;
      if (reservation) {
        await reservation.finalize(actualCost);
      }

      // Return as single-event SSE for client compatibility
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

      return new Response(body, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      });
    } catch (error) {
      clearTimeout(timeoutId);
      if (reservation) {
        await reservation.cleanup();
      }
      if (anonymousSession) {
        anonymousSession.remainingCredits += baseModelCost;
        setAnonymousSession(anonymousSession);
      }
      throw error;
    }
  } catch (_error) {
    return new Response('An error occurred while processing your request!', {
      status: 404,
    });
  }
}

// DELETE moved to tRPC chat.deleteChat mutation
