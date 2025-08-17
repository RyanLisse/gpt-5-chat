import { convertToModelMessages } from 'ai';
import type { NextRequest } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { generateTitleFromUserMessage } from '@/app/(chat)/actions';
import { getModelDefinition, type ModelDefinition } from '@/lib/ai/all-models';

// Removed getTools: not used with Responses API path
import { allTools } from '@/lib/ai/tools/tools-definitions';
import type { ChatMessage, ToolName } from '@/lib/ai/types';
// Removed systemPrompt: not used with Responses API path
import {
  getChatById,
  getMessageById,
  getUserById,
  saveChat,
  saveMessage,
} from '@/lib/db/queries-with-cache';
import { generateUUID } from '@/lib/utils';
import { replaceFilePartUrlByBinaryDataInMessages } from '@/lib/utils/download-assets';

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
import { ANONYMOUS_LIMITS } from '@/lib/types/anonymous';
// Removed markdownJoinerTransform: not used with Responses API path
import { checkAnonymousRateLimit, getClientIP } from '@/lib/utils/rate-limit';
import { addExplicitToolRequestToMessages } from './add-explicit-tool-request-to-messages';
import { filterReasoningParts } from './filter-reasoning-parts';
import { getThreadUpToMessageId } from './get-thread-up-to-message-id';

// Constants
const MAX_INPUT_TOKENS = 50_000;
const MAX_RECENT_MESSAGES = 5;
const HTTP_STATUS = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  RATE_LIMITED: 429,
} as const;

// Create shared Redis clients for resumable stream and cleanup
let redisPublisher: any = null;

if (process.env.REDIS_URL) {
  (async () => {
    const redis = await import('redis');
    redisPublisher = redis.createClient({ url: process.env.REDIS_URL });
    await redisPublisher.connect();
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
  headers?: Record<string, string>;
  error?: Response;
};

function createRateLimitErrorResponse(
  error: string,
  type: string,
  status: number,
  headers?: Record<string, string>,
): Response {
  return new Response(JSON.stringify({ error, type }), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...(headers || {}),
    },
  });
}

// Removed model restriction for anonymous users

async function handleAnonymousRateLimit(
  request: NextRequest,
  _selectedModelId: ModelId,
): Promise<RateLimitResult> {
  const clientIP = getClientIP(request);
  const rateLimitResult = await checkAnonymousRateLimit(
    clientIP,
    redisPublisher,
  );

  if (!rateLimitResult.success) {
    return {
      success: false,
      error: createRateLimitErrorResponse(
        rateLimitResult.error || 'Rate limit exceeded',
        'RATE_LIMIT_EXCEEDED',
        HTTP_STATUS.RATE_LIMITED,
        rateLimitResult.headers,
      ),
    };
  }

  return { success: true, headers: rateLimitResult.headers };
}

type ValidationResult = {
  valid: boolean;
  chatId: string;
  userMessage: ChatMessage;
  selectedModelId: ModelId;
  modelDefinition: ModelDefinition;
  error?: Response;
};

function validateRequest(body: any): ValidationResult {
  const { id: chatId, message: userMessage } = body;

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

type DatabaseOperationsOptions = {
  chatId: string;
  userMessage: ChatMessage;
  userId: string;
  selectedModelId: ModelId;
  selectedTool: string | null;
};

async function handleDatabaseOperations(
  options: DatabaseOperationsOptions,
): Promise<DatabaseResult> {
  const { chatId, userMessage, userId, selectedModelId, selectedTool } =
    options;

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
  activeTools: ToolName[];
  error?: Response;
};

type CreditManagementOptions = {
  userMessage: ChatMessage;
  isAnonymous: boolean;
  userId: string | null;
  modelDefinition: ModelDefinition;
  selectedModelId: ModelId;
};

function getExplicitlyRequestedTools(
  selectedTool: string | null,
): ToolName[] | null {
  if (selectedTool === 'generateImage') {
    return ['generateImage'];
  }
  if (selectedTool === 'createDocument') {
    return ['createDocument', 'updateDocument'];
  }
  return null;
}

function calculateActiveTools(
  isAnonymous: boolean,
  modelDefinition: ModelDefinition,
  explicitlyRequestedTools: ToolName[] | null,
): { activeTools: ToolName[]; error?: string } {
  const availableTools = isAnonymous
    ? ANONYMOUS_LIMITS.AVAILABLE_TOOLS
    : allTools;
  let activeTools: ToolName[] = [...availableTools];

  if (!modelDefinition.features) {
    activeTools = [];
  }

  if (explicitlyRequestedTools?.length) {
    const hasRequestedTool = activeTools.some((tool: ToolName) =>
      explicitlyRequestedTools.includes(tool),
    );

    if (!hasRequestedTool) {
      return {
        activeTools: [],
        error: `Requested tool not available: ${explicitlyRequestedTools}.`,
      };
    }
    activeTools = explicitlyRequestedTools;
  }

  return { activeTools };
}

function handleCreditManagement(
  options: CreditManagementOptions,
): CreditManagementResult {
  const { userMessage, isAnonymous, modelDefinition } = options;

  const selectedTool = userMessage.metadata.selectedTool || null;
  const explicitlyRequestedTools = getExplicitlyRequestedTools(selectedTool);

  const toolResult = calculateActiveTools(
    isAnonymous,
    modelDefinition,
    explicitlyRequestedTools,
  );

  if (toolResult.error) {
    return {
      success: false,
      activeTools: [],
      error: new Response(toolResult.error, { status: HTTP_STATUS.FORBIDDEN }),
    };
  }

  return {
    success: true,
    activeTools: toolResult.activeTools,
  };
}

type AIProcessingResult = {
  success: boolean;
  assistantMessage?: any;
  error?: Response;
};

function validateInputTokens(userMessage: ChatMessage): {
  valid: boolean;
  error?: Response;
} {
  const totalTokens = calculateMessagesTokens(
    convertToModelMessages([userMessage]),
  );

  if (totalTokens > MAX_INPUT_TOKENS) {
    const error = new ChatSDKError(
      'input_too_long:chat',
      `Message too long: ${totalTokens} tokens (max: ${MAX_INPUT_TOKENS})`,
    );
    return { valid: false, error: error.toResponse() };
  }

  return { valid: true };
}

type MessageContextOptions = {
  chatId: string;
  userMessage: ChatMessage;
  anonymousPreviousMessages: ChatMessage[];
  isAnonymous: boolean;
  activeTools: ToolName[];
  explicitlyRequestedTools: ToolName[];
};

async function prepareMessageContext(
  options: MessageContextOptions,
): Promise<any[]> {
  const {
    chatId,
    userMessage,
    anonymousPreviousMessages,
    isAnonymous,
    activeTools,
    explicitlyRequestedTools,
  } = options;

  const messageThreadToParent = isAnonymous
    ? anonymousPreviousMessages
    : await getThreadUpToMessageId(
        chatId,
        userMessage.metadata.parentMessageId,
      );

  const messages = [...messageThreadToParent, userMessage].slice(
    -MAX_RECENT_MESSAGES,
  );

  addExplicitToolRequestToMessages(
    messages,
    activeTools,
    explicitlyRequestedTools,
  );

  const messagesWithoutReasoning = filterReasoningParts(
    messages.slice(-MAX_RECENT_MESSAGES),
  );
  const modelMessages = convertToModelMessages(messagesWithoutReasoning);

  return await replaceFilePartUrlByBinaryDataInMessages(modelMessages);
}

async function createAIResponse(
  chatId: string,
  userId: string | null,
  selectedModelId: ModelId,
  contextForLLM: any[],
): Promise<{ response: any; convManager: any; messageId: string }> {
  const messageId = generateUUID();
  const { convManager, previousResponseId } = await initializeConversationState(
    chatId,
    userId,
  );

  const selectedOrDefaultModel = (selectedModelId ??
    'openai/gpt-5-mini') as ModelId;
  const { inputs, textInput } = buildMultimodalInputs(contextForLLM);

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

  const response = await client.createResponse(req);

  return { response, convManager, messageId };
}

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
  const tokenValidation = validateInputTokens(userMessage);
  if (!tokenValidation.valid) {
    return { success: false, error: tokenValidation.error };
  }

  const contextForLLM = await prepareMessageContext({
    chatId,
    userMessage,
    anonymousPreviousMessages,
    isAnonymous,
    activeTools,
    explicitlyRequestedTools,
  });

  const { response, convManager, messageId } = await createAIResponse(
    chatId,
    isAnonymous ? null : userId,
    selectedModelId,
    contextForLLM,
  );

  if (convManager && !isAnonymous) {
    await convManager.updateConversationWithResponse(chatId, {
      id: response.id,
      content: response.outputText,
      metadata: {},
    });
  }

  const selectedOrDefaultModel = (selectedModelId ??
    'openai/gpt-5-mini') as ModelId;
  const assistantMessage = buildAssistantMessage({
    res: response,
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
  isAnonymous: boolean,
): Promise<Response> {
  // Persist assistant message for authenticated users
  if (!isAnonymous) {
    await saveMessage({ _message: assistantMessage });
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
}

async function processAuthenticatedUser(
  chatId: string,
  userMessage: ChatMessage,
  userId: string,
  selectedModelId: ModelId,
): Promise<{ success: boolean; error?: Response }> {
  const dbResult = await handleDatabaseOperations({
    chatId,
    userMessage,
    userId,
    selectedModelId,
    selectedTool: userMessage.metadata.selectedTool ?? null,
  });

  return dbResult.success
    ? { success: true }
    : { success: false, error: dbResult.error };
}

async function processAnonymousUser(
  request: NextRequest,
  selectedModelId: ModelId,
): Promise<{
  success: boolean;
  headers?: Record<string, string>;
  error?: Response;
}> {
  const rateLimitResult = await handleAnonymousRateLimit(
    request,
    selectedModelId,
  );

  if (!rateLimitResult.success) {
    return { success: false, error: rateLimitResult.error };
  }

  return { success: true, headers: rateLimitResult.headers };
}

async function processRequestValidationAndAuth(
  _request: NextRequest,
  body: any,
): Promise<{
  success: boolean;
  data?: {
    chatId: string;
    userMessage: ChatMessage;
    selectedModelId: ModelId;
    modelDefinition: ModelDefinition;
    userId: string | null;
    isAnonymous: boolean;
  };
  error?: Response;
}> {
  const validation = validateRequest(body);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }
  const { chatId, userMessage, selectedModelId, modelDefinition } = validation;

  const session = await auth();
  const authResult = await handleAuthentication(session);
  if (authResult.error) {
    return { success: false, error: authResult.error };
  }
  const { userId, isAnonymous } = authResult;

  return {
    success: true,
    data: {
      chatId,
      userMessage,
      selectedModelId,
      modelDefinition,
      userId,
      isAnonymous,
    },
  };
}

type UserProcessingOptions = {
  request: NextRequest;
  isAnonymous: boolean;
  userId: string | null;
  chatId: string;
  userMessage: ChatMessage;
  selectedModelId: ModelId;
};

async function handleUserProcessing(options: UserProcessingOptions): Promise<{
  success: boolean;
  headers?: Record<string, string>;
  error?: Response;
}> {
  const { request, isAnonymous, userId, chatId, userMessage, selectedModelId } =
    options;

  if (isAnonymous) {
    return await processAnonymousUser(request, selectedModelId);
  }

  if (userId) {
    const authUserResult = await processAuthenticatedUser(
      chatId,
      userMessage,
      userId,
      selectedModelId,
    );
    return authUserResult.success
      ? { success: true }
      : { success: false, error: authUserResult.error };
  }

  return { success: true };
}

async function processAIAndFinalize({
  chatId,
  userMessage,
  anonymousPreviousMessages,
  isAnonymous,
  userId,
  selectedModelId,
  modelDefinition,
}: {
  chatId: string;
  userMessage: ChatMessage;
  anonymousPreviousMessages: ChatMessage[];
  isAnonymous: boolean;
  userId: string | null;
  selectedModelId: ModelId;
  modelDefinition: ModelDefinition;
}): Promise<Response> {
  const creditResult = handleCreditManagement({
    userMessage,
    isAnonymous,
    userId,
    modelDefinition,
    selectedModelId,
  });
  if (!creditResult.success) {
    return (
      creditResult.error ||
      new Response('Tool selection failed', { status: HTTP_STATUS.FORBIDDEN })
    );
  }

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
    return (
      aiResult.error ||
      new Response('AI processing failed', { status: HTTP_STATUS.BAD_REQUEST })
    );
  }

  return await finalizeResponse(aiResult.assistantMessage, isAnonymous);
}

// Removed unused callOpenAI helper; Responses API path handles model calls

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 1) Validate request and resolve auth (guest allowed)
    const validation = await processRequestValidationAndAuth(request, body);
    if (!validation.success) {
      return validation.error as Response;
    }
    const data = validation.data;
    if (!data) {
      return new Response('Invalid request payload', { status: 400 });
    }
    const { chatId, userMessage, selectedModelId, modelDefinition, userId, isAnonymous } = data;

    // 2) Per-IP rate limit for guests
    const userProcessing = await handleUserProcessing({
      request,
      isAnonymous,
      userId,
      chatId,
      userMessage,
      selectedModelId,
    });
    if (!userProcessing.success) {
      return userProcessing.error as Response;
    }

    // 3) AI processing and finalize response
    const anonymousPreviousMessages: ChatMessage[] = Array.isArray(
      body?.previousMessages || [],
    )
      ? (body.previousMessages as ChatMessage[])
      : [];

    const response = await processAIAndFinalize({
      chatId,
      userMessage,
      anonymousPreviousMessages,
      isAnonymous,
      userId,
      selectedModelId,
      modelDefinition,
    });

    // 4) Attach rate limit headers when available
    const headers = new Headers(response.headers);
    if (userProcessing.headers) {
      for (const [k, v] of Object.entries(userProcessing.headers)) {
        headers.set(k, v);
      }
    }

    return new Response(response.body, { status: response.status, headers });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new Response(`An error occurred: ${message}`, { status: 500 });
  }
}

// DELETE moved to tRPC chat.deleteChat mutation
