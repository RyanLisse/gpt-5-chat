import type { ModelId } from '../ai/model-id';
import type { ToolName } from '../ai/types';
import type { DBMessage } from '../db/schema';
import type { UIChat } from './uiChat';

export type AnonymousSession = {
  id: string;
  createdAt: Date;
};

// Anonymous chat structure matching the DB chat structure
export interface AnonymousChat extends UIChat {}

// Anonymous message structure matching the DB message structure
export interface AnonymousMessage extends DBMessage {}

export const ANONYMOUS_LIMITS = {
  AVAILABLE_MODELS: [
    'google/gemini-2.0-flash',
    'openai/gpt-5-mini',
    'openai/gpt-5-nano',
    'openai/gpt-4o-mini',
  ] as const satisfies ModelId[],
  AVAILABLE_TOOLS: ['createDocument', 'updateDocument'] satisfies ToolName[],
  SESSION_DURATION: 2_147_483_647, // Max session time
  // Rate limiting for anonymous users based on IP
  RATE_LIMIT: {
    REQUESTS_PER_MINUTE: process.env.NODE_ENV === 'production' ? 5 : 60,
    REQUESTS_PER_MONTH: process.env.NODE_ENV === 'production' ? 100 : 10_000,
  },
} as const;
