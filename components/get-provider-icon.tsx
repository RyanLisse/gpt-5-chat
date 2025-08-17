'use client';
import {
  Alibaba,
  Anthropic,
  Aws,
  Cohere,
  DeepSeek,
  Gemini,
  Meta,
  Mistral,
  Moonshot,
  OpenAI,
  Perplexity,
  Vercel,
  XAI,
  ZAI,
} from '@lobehub/icons';
import type { ProviderId } from '@/providers/models-generated';

const PROVIDER_ICON_MAP = {
  openai: OpenAI,
  anthropic: Anthropic,
  xai: XAI,
  google: Gemini,
  meta: Meta,
  mistral: Mistral,
  alibaba: Alibaba,
  amazon: Aws,
  cohere: Cohere,
  deepseek: DeepSeek,
  perplexity: Perplexity,
  vercel: Vercel,
  inception: OpenAI, // Using OpenAI as fallback
  moonshotai: Moonshot,
  morph: OpenAI, // Using OpenAI as fallback
  zai: ZAI,
} as const;

export function getProviderIcon(provider: ProviderId, size = 16) {
  const iconProps = { size };
  const IconComponent = PROVIDER_ICON_MAP[provider] || OpenAI;
  return <IconComponent {...iconProps} />;
}
