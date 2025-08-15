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
import {
  buildAssistantMessage,
  buildMultimodalInputs,
  buildSSEFromMessage,
  initializeConversationState,
} from '@/lib/ai/responses/http-helpers';
import type { ResponseRequest } from '@/lib/ai/responses/types';
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
import { addExplicitToolRequestToMessages } from './add-explicit-tool-request-to-messages';
import { filterReasoningParts } from './filter-reasoning-parts';
import { getCreditReservation } from './get-credit-reservation';
import { getRecentGeneratedImage } from './get-recent-generated-image';
import { getThreadUpToMessageId } from './get-thread-up-to-message-id';

// Constants
const MAX_INPUT_TOKENS = 50_000;
const REQUEST_TIMEOUT_MS = 290_000; // 290 seconds
const MAX_RECENT_MESSAGES = 5;
const HTTP_STATUS = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  PAYMENT_REQUIRED: 402,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  RATE_LIMITED: 429,
} as const;

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

type AuthResult = {
  userId: string | null;
  isAnonymous: boolean;
  user?: any;
  error?: Response;
};

async function handleAuthentication(session: any): Promise<AuthResult> {
  const userId = session?.user?.id || null;
  const isAnonymous = userId === null;

  if (userId) {
    const user = await getUserById({ userId });
    if (!user) {
      return {
        userId,
        isAnonymous,
        error: new Response('User not found', {
          status: HTTP_STATUS.NOT_FOUND,
        }),
      };
    }
    return { userId, isAnonymous, user };
  }

  return { userId, isAnonymous };
}

type RateLimitResult = {
  success: boolean;
  anonymousSession?: AnonymousSession;
  error?: Response;
};

async function handleAnonymousRateLimit(
  request: NextRequest,
  selectedModelId: ModelId,
): Promise<RateLimitResult> {
  const clientIP = getClientIP(request);
  const rateLimitResult = await checkAnonymousRateLimit(
    clientIP,
    redisPublisher,
  );

  if (!rateLimitResult.success) {
    return {
      success: false,
      error: new Response(
        JSON.stringify({
          error: rateLimitResult.error,
          type: 'RATE_LIMIT_EXCEEDED',
        }),
        {
          status: HTTP_STATUS.RATE_LIMITED,
          headers: {
            'Content-Type': 'application/json',
            ...(rateLimitResult.headers || {}),
          },
        },
      ),
    };
  }

  let anonymousSession = await getAnonymousSession();
  if (!anonymousSession) {
    anonymousSession = await createAnonymousSession();
  }

  if (anonymousSession.remainingCredits <= 0) {
    return {
      success: false,
      error: new Response(
        JSON.stringify({
          error: `You've used all ${ANONYMOUS_LIMITS.CREDITS} free messages. Sign up to continue chatting with unlimited access!`,
          type: 'ANONYMOUS_LIMIT_EXCEEDED',
          maxMessages: ANONYMOUS_LIMITS.CREDITS,
          suggestion:
            'Create an account to get unlimited messages and access to more AI models',
        }),
        {
          status: HTTP_STATUS.PAYMENT_REQUIRED,
          headers: {
            'Content-Type': 'application/json',
            ...(rateLimitResult.headers || {}),
          },
        },
      ),
    };
  }

  if (!ANONYMOUS_LIMITS.AVAILABLE_MODELS.includes(selectedModelId as any)) {
    return {
      success: false,
      error: new Response(
        JSON.stringify({
          error: 'Model not available for anonymous users',
          availableModels: ANONYMOUS_LIMITS.AVAILABLE_MODELS,
        }),
        {
          status: HTTP_STATUS.FORBIDDEN,
          headers: {
            'Content-Type': 'application/json',
            ...(rateLimitResult.headers || {}),
          },
        },
      ),
    };
  }

  return { success: true, anonymousSession };
}

type ValidationResult = {
  valid: boolean;
  chatId: string;
  userMessage: ChatMessage;
  selectedModelId: ModelId;
  modelDefinition: ModelDefinition;
  error?: Response;
};

async function validateRequest(
  request: NextRequest,
): Promise<ValidationResult> {
  const { id: chatId, message: userMessage } = await request.json();

  if (!userMessage) {
    return {
      valid: false,
      chatId,
      userMessage,
      selectedModelId: '' as ModelId,
      modelDefinition: {} as ModelDefinition,
      error: new Response('No user message found', {
        status: HTTP_STATUS.BAD_REQUEST,
      }),
    };
  }

  const selectedModelId = userMessage.metadata?.selectedModel as ModelId;
  if (!selectedModelId) {
    return {
      valid: false,
      chatId,
      userMessage,
      selectedModelId,
      modelDefinition: {} as ModelDefinition,
      error: new Response('No selectedModel in user message metadata', {
        status: HTTP_STATUS.BAD_REQUEST,
      }),
    };
  }

  let modelDefinition: ModelDefinition;
  try {
    modelDefinition = getModelDefinition(selectedModelId);
  } catch (_error) {
    return {
      valid: false,
      chatId,
      userMessage,
      selectedModelId,
      modelDefinition: {} as ModelDefinition,
      error: new Response('Model not found', { status: HTTP_STATUS.NOT_FOUND }),
    };
  }

  return {
    valid: true,
    chatId,
    userMessage,
    selectedModelId,
    modelDefinition,
  };
}

type DatabaseResult = {
  success: boolean;
  error?: Response;
};

async function handleDatabaseOperations(
  chatId: string,
  userMessage: ChatMessage,
  userId: string,
  selectedModelId: ModelId,
  selectedTool: string | null,
): Promise<DatabaseResult> {
  const chat = await getChatById({ id: chatId });

  if (chat && chat.userId !== userId) {
    return {
      success: false,
      error: new Response('Unauthorized', { status: HTTP_STATUS.UNAUTHORIZED }),
    };
  }

  if (!chat) {
    const title = await generateTitleFromUserMessage({ message: userMessage });
    await saveChat({ id: chatId, userId, title });
  }

  const [existentMessage] = await getMessageById({ id: userMessage.id });

  if (existentMessage && existentMessage.chatId !== chatId) {
    return {
      success: false,
      error: new Response('Unauthorized', { status: HTTP_STATUS.UNAUTHORIZED }),
    };
  }

  if (!existentMessage) {
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

  return { success: true };
}

type CreditManagementResult = {
  success: boolean;
  reservation?: CreditReservation;
  anonymousSession?: AnonymousSession;
  activeTools: ToolName[];
  error?: Response;
};

async function handleCreditManagement(
  userMessage: ChatMessage,
  isAnonymous: boolean,
  userId: string | null,
  anonymousSession: AnonymousSession | null,
  modelDefinition: ModelDefinition,
  selectedModelId: ModelId,
): Promise<CreditManagementResult> {
  const selectedTool = userMessage.metadata.selectedTool || null;

  let explicitlyRequestedTools: ToolName[] | null = null;
  if (selectedTool === 'generateImage') {
    explicitlyRequestedTools = ['generateImage'];
  } else if (selectedTool === 'createDocument') {
    explicitlyRequestedTools = ['createDocument', 'updateDocument'];
  }

  const baseModelCost = getBaseModelCostByModelId(selectedModelId);
  let reservation: CreditReservation | null = null;

  if (!isAnonymous && userId) {
    const { reservation: res, error: creditError } = await getCreditReservation(
      userId,
      baseModelCost,
    );
    if (creditError) {
      return {
        success: false,
        activeTools: [],
        error: new Response(creditError, {
          status: HTTP_STATUS.PAYMENT_REQUIRED,
        }),
      };
    }
    reservation = res;
  } else if (anonymousSession) {
    anonymousSession.remainingCredits -= baseModelCost;
    await setAnonymousSession(anonymousSession);
  }

  const availableTools = isAnonymous
    ? ANONYMOUS_LIMITS.AVAILABLE_TOOLS
    : allTools;
  let budget = 0;
  if (isAnonymous) {
    budget = ANONYMOUS_LIMITS.CREDITS;
  } else if (reservation) {
    budget = reservation.budget - baseModelCost;
  }

  let activeTools: ToolName[] = filterAffordableTools(availableTools, budget);

  if (!modelDefinition.features) {
    activeTools = [];
  }

  if (explicitlyRequestedTools?.length && explicitlyRequestedTools.length > 0) {
    if (
      !activeTools.some((tool: ToolName) =>
        explicitlyRequestedTools?.includes(tool),
      )
    ) {
      return {
        success: false,
        activeTools: [],
        error: new Response(
          `Insufficient budget for requested tool: ${explicitlyRequestedTools}.`,
          { status: HTTP_STATUS.PAYMENT_REQUIRED },
        ),
      };
    }
    activeTools = explicitlyRequestedTools;
  }

  return {
    success: true,
    reservation: reservation || undefined,
    anonymousSession: anonymousSession || undefined,
    activeTools,
  };
}

type AIProcessingResult = {
  success: boolean;
  assistantMessage?: any;
  error?: Response;
};

async function processAIRequest({
  chatId,
  userMessage,
  anonymousPreviousMessages,
  isAnonymous,
  userId,
  selectedModelId,
  activeTools,
  explicitlyRequestedTools,
}: {
  chatId: string;
  userMessage: ChatMessage;
  anonymousPreviousMessages: ChatMessage[];
  isAnonymous: boolean;
  userId: string | null;
  selectedModelId: ModelId;
  activeTools: ToolName[];
  explicitlyRequestedTools: ToolName[];
}): Promise<AIProcessingResult> {
  // Validate input token limit
  const totalTokens = calculateMessagesTokens(
    convertToModelMessages([userMessage]),
  );
  if (totalTokens > MAX_INPUT_TOKENS) {
    const error = new ChatSDKError(
      'input_too_long:chat',
      `Message too long: ${totalTokens} tokens (max: ${MAX_INPUT_TOKENS})`,
    );
    return { success: false, error: error.toResponse() };
  }

  const messageThreadToParent = isAnonymous
    ? anonymousPreviousMessages
    : await getThreadUpToMessageId(
        chatId,
        userMessage.metadata.parentMessageId,
      );

  const messages = [...messageThreadToParent, userMessage].slice(
    -MAX_RECENT_MESSAGES,
  );

  const _lastGeneratedImage = getRecentGeneratedImage(messages);
  addExplicitToolRequestToMessages(
    messages,
    activeTools,
    explicitlyRequestedTools,
  );

  const messagesWithoutReasoning = filterReasoningParts(
    messages.slice(-MAX_RECENT_MESSAGES),
  );
  const modelMessages = convertToModelMessages(messagesWithoutReasoning);
  const contextForLLM =
    await replaceFilePartUrlByBinaryDataInMessages(modelMessages);

  const messageId = generateUUID();
  const { convManager, previousResponseId } = await initializeConversationState(
    chatId,
    isAnonymous ? null : userId,
  );

  const selectedOrDefaultModel = (selectedModelId ??
    'openai/gpt-5-mini') as ModelId;
  const { inputs, textInput } = buildMultimodalInputs(contextForLLM as any[]);

  const client = createResponsesClient({
    openai: {
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: process.env.OPENAI_BASE_URL,
    },
  });

  const req: ResponseRequest = {
    model: selectedOrDefaultModel.replace('openai/', ''),
    input: inputs.length > 0 ? inputs : textInput,
    tools: [{ type: 'file_search', config: {} }],
    previousResponseId,
    store: false,
    metadata: {
      chatId,
      userId: userId || 'anonymous',
    },
  };

  const res = await client.createResponse(req);

  if (convManager && !isAnonymous) {
    await convManager.updateConversationWithResponse(chatId, {
      id: res.id,
      content: res.outputText,
      metadata: {},
    });
  }

  const assistantMessage = buildAssistantMessage({
    res,
    messageId,
    chatId,
    userMessage,
    selectedModel: selectedOrDefaultModel,
  });

  return { success: true, assistantMessage };
}

function getExplicitTools(selectedTool: string | null): ToolName[] {
  if (selectedTool === 'generateImage') {
    return ['generateImage'];
  }
  if (selectedTool === 'createDocument') {
    return ['createDocument', 'updateDocument'];
  }
  return [];
}

async function finalizeResponse(
  assistantMessage: any,
  reservation: CreditReservation | null,
  isAnonymous: boolean,
  baseModelCost: number,
): Promise<Response> {
  // Create AbortController with timeout for credit cleanup
  const abortController = new AbortController();
  const timeoutId = setTimeout(async () => {
    if (reservation) {
      await reservation.cleanup();
    }
    abortController.abort();
  }, REQUEST_TIMEOUT_MS);

  try {
    // Persist assistant message for authenticated users
    if (!isAnonymous) {
      await saveMessage({ _message: assistantMessage });
    }

    // Finalize credits: add tool cost if defined
    const toolCost = 0; // No per-call tool costing implemented for file_search
    const actualCost = baseModelCost + toolCost;
    if (reservation) {
      await reservation.finalize(actualCost);
    }

    // Return as single-event SSE for client compatibility
    const body = buildSSEFromMessage(assistantMessage);

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
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { prevMessages: anonymousPreviousMessages } = await request.json();

    // Validate request and extract data
    const validation = await validateRequest(request);
    if (!validation.valid) {
      return validation.error;
    }
    const { chatId, userMessage, selectedModelId, modelDefinition } =
      validation;

    // Handle authentication
    const session = await auth();
    const authResult = await handleAuthentication(session);
    if (authResult.error) {
      return authResult.error;
    }
    const { userId, isAnonymous } = authResult;

    // Handle anonymous rate limiting
    let anonymousSession: AnonymousSession | null = null;
    if (isAnonymous) {
      const rateLimitResult = await handleAnonymousRateLimit(
        request,
        selectedModelId,
      );
      if (!rateLimitResult.success) {
        return rateLimitResult.error;
      }
      anonymousSession = rateLimitResult.anonymousSession || null;
    }

    // Handle database operations for authenticated users
    if (!isAnonymous && userId) {
      const dbResult = await handleDatabaseOperations(
        chatId,
        userMessage,
        userId,
        selectedModelId,
        userMessage.metadata.selectedTool ?? null,
      );
      if (!dbResult.success) {
        return dbResult.error;
      }
    }

    // Handle credit management and tool configuration
    const creditResult = await handleCreditManagement(
      userMessage,
      isAnonymous,
      userId,
      anonymousSession,
      modelDefinition,
      selectedModelId,
    );
    if (!creditResult.success) {
      return creditResult.error;
    }

    // Process AI request and get response
    const explicitlyRequestedTools = getExplicitTools(
      userMessage.metadata.selectedTool ?? null,
    );
    const aiResult = await processAIRequest({
      chatId,
      userMessage,
      anonymousPreviousMessages,
      isAnonymous,
      userId,
      selectedModelId,
      activeTools: creditResult.activeTools,
      explicitlyRequestedTools,
    });
    if (!aiResult.success) {
      return aiResult.error;
    }

    // Finalize processing
    return await finalizeResponse(
      aiResult.assistantMessage,
      creditResult.reservation ?? null,
      isAnonymous,
      getBaseModelCostByModelId(selectedModelId),
    );
  } catch (_error) {
    return new Response('An error occurred while processing your request!', {
      status: HTTP_STATUS.NOT_FOUND,
    });
  }
}

// DELETE moved to tRPC chat.deleteChat mutation
