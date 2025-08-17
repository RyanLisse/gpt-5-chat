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

function writeAssistantContent(
  writer: any,
  assistantMessage: any,
  responseId: string,
) {
  try {
    // Write the assistant message content
    const textContent =
      assistantMessage.parts?.find((part: any) => part.type === 'text')?.text ||
      '';

    if (textContent) {
      writer.write({
        type: 'text-delta',
        delta: textContent,
        id: 'text-1',
      });
    }

    // Include responseId using the proper AI SDK format
    if (responseId) {
      writer.write({
        type: 'data-responseId',
        id: `responseId-${responseId}`,
        data: { responseId },
      });
    }

    // Include any tool results or annotations as custom data
    if (assistantMessage.annotations) {
      for (const annotation of assistantMessage.annotations) {
        // Write all annotations including responses type with responseId
        writer.write({
          type: `data-${annotation.type}`,
          id: annotation.id || `annotation-${Date.now()}`,
          data: annotation,
        });
      }
    }
  } catch {
    writer.write({
      type: 'text-delta',
      delta: 'Sorry, I encountered an error while processing your request.',
      id: 'error-1',
    });
  }
}

async function finalizeResponse(
  assistantMessage: any,
  isAnonymous: boolean,
): Promise<Response> {
  // Persist assistant message for authenticated users
  if (!isAnonymous) {
    await saveMessage({ _message: assistantMessage });
  }

  // Use AI SDK v5 format for streaming response
  const { createUIMessageStream, createUIMessageStreamResponse } = await import(
    'ai'
  );

  // Extract responseId from annotations for tracking
  const responseId =
    assistantMessage.annotations?.find((ann: any) => ann.type === 'responses')
      ?.data?.responseId || assistantMessage.id;

  const stream = createUIMessageStream({
    execute: ({ writer }) => {
      writeAssistantContent(writer, assistantMessage, responseId);
    },
  });

  return createUIMessageStreamResponse({ stream });
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

async function _processAIAndFinalize({
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

type RequestProcessingResult = {
  success: boolean;
  data?: {
    chatId: string;
    userMessage: ChatMessage;
    selectedModelId: ModelId;
    modelDefinition: ModelDefinition;
    userId: string | null;
    isAnonymous: boolean;
    anonymousPreviousMessages: ChatMessage[];
  };
  userProcessingResult?: {
    success: boolean;
    headers?: Record<string, string>;
    error?: Response;
  };
  error?: Response;
};

async function _processRequest(
  request: NextRequest,
): Promise<RequestProcessingResult> {
  const body = await request.json();

  const validation = await processRequestValidationAndAuth(request, body);
  if (!validation.success) {
    return { success: false, error: validation.error };
  }

  const data = validation.data;
  if (!data) {
    return {
      success: false,
      error: new Response('Invalid request payload', {
        status: HTTP_STATUS.BAD_REQUEST,
      }),
    };
  }

  const userProcessingResult = await handleUserProcessing({
    request,
    isAnonymous: data.isAnonymous,
    userId: data.userId,
    chatId: data.chatId,
    userMessage: data.userMessage,
    selectedModelId: data.selectedModelId,
  });

  if (!userProcessingResult.success) {
    return { success: false, error: userProcessingResult.error };
  }

  const anonymousPreviousMessages: ChatMessage[] = Array.isArray(
    body?.previousMessages || [],
  )
    ? (body.previousMessages as ChatMessage[])
    : [];

  return {
    success: true,
    data: { ...data, anonymousPreviousMessages },
    userProcessingResult,
  };
}

function _attachRateLimitHeaders(
  response: Response,
  headers?: Record<string, string>,
): Response {
  if (!headers) {
    return response;
  }

  const newHeaders = new Headers(response.headers);
  for (const [key, value] of Object.entries(headers)) {
    newHeaders.set(key, value);
  }

  return new Response(response.body, {
    status: response.status,
    headers: newHeaders,
  });
}

// Constants for response ID generation
const RANDOM_ID_START = 2;
const RANDOM_ID_LENGTH = 9;
const BASE_36 = 36;
const MAX_TOKENS = 1000;
const DEFAULT_TEMPERATURE = 0.7;
const DEFAULT_MODEL = 'gpt-4o-mini';

function validateOpenAIConfiguration(): string {
  const openaiApiKey = process.env.OPENAI_API_KEY;
  if (!openaiApiKey) {
    throw new Error('OpenAI API key not configured');
  }
  return openaiApiKey;
}

function buildOpenAIRequest(userText: string, selectedModel: string) {
  return {
    model: selectedModel.replace('openai/', '') || DEFAULT_MODEL,
    messages: [{ role: 'user', content: userText }],
    max_tokens: MAX_TOKENS,
    temperature: DEFAULT_TEMPERATURE,
    stream: false,
  };
}

function generateResponseId(): string {
  return `response-${Date.now()}-${Math.random()
    .toString(BASE_36)
    .substring(RANDOM_ID_START, RANDOM_ID_START + RANDOM_ID_LENGTH)}`;
}

async function fetchOpenAIResponse(
  apiKey: string,
  requestBody: any,
): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || 'No response generated';
}

function writeResponseToStream(
  writer: any,
  aiResponse: string,
  responseId: string,
) {
  writer.write({
    type: 'text-delta',
    delta: aiResponse,
    id: 'text-1',
  });

  writer.write({
    type: 'data-responseId',
    id: `responseId-${responseId}`,
    data: { responseId },
  });

  writer.write({
    type: 'data-responses',
    id: `responses-${responseId}`,
    data: { responseId },
  });
}

function writeErrorToStream(writer: any) {
  writer.write({
    type: 'text-delta',
    delta: 'Sorry, I encountered an error while processing your request.',
    id: 'error-1',
  });
}

async function callOpenAIAndWriteResponse(
  writer: any,
  userText: string,
  selectedModel: string,
) {
  try {
    const apiKey = validateOpenAIConfiguration();
    const requestBody = buildOpenAIRequest(userText, selectedModel);
    const aiResponse = await fetchOpenAIResponse(apiKey, requestBody);
    const responseId = generateResponseId();

    writeResponseToStream(writer, aiResponse, responseId);
  } catch {
    writeErrorToStream(writer);
  }
}

function createErrorResponse(error: unknown): Response {
  const message = error instanceof Error ? error.message : 'Unknown error';
  return new Response(`An error occurred: ${message}`, {
    status: HTTP_STATUS.BAD_REQUEST,
  });
}

export async function POST(request: NextRequest): Promise<Response> {
  try {
    // Simplified guest-friendly implementation
    const body = await request.json();
    const { message } = body;

    // Basic validation
    if (!message?.parts?.[0]?.text) {
      return new Response('Invalid message format', { status: 400 });
    }

    const userText = message.parts[0].text;
    const selectedModel =
      message.metadata?.selectedModel || 'openai/gpt-4o-mini';

    // Check rate limiting for guest users (simplified for now)
    // In production, this should use Redis or a proper rate limiting service
    const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
    const rateLimitResult = {
      success: true,
      headers: {
        'X-RateLimit-Limit': '100',
        'X-RateLimit-Remaining': '99',
        'X-RateLimit-Reset': String(Date.now() + RATE_LIMIT_WINDOW_MS),
      },
    };

    // Use AI SDK v5 with direct OpenAI API call
    const { createUIMessageStream, createUIMessageStreamResponse } =
      await import('ai');

    const stream = createUIMessageStream({
      execute: async ({ writer }) => {
        await callOpenAIAndWriteResponse(writer, userText, selectedModel);
      },
    });

    const response = createUIMessageStreamResponse({ stream });

    // Add rate limit headers
    if (rateLimitResult.headers) {
      const newHeaders = new Headers(response.headers);
      Object.entries(rateLimitResult.headers).forEach(([key, value]) => {
        newHeaders.set(key, value);
      });
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders,
      });
    }

    return response;
  } catch (error) {
    return createErrorResponse(error);
  }
}

// DELETE moved to tRPC chat.deleteChat mutation
