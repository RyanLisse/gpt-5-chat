import type { AnthropicProviderOptions } from '@ai-sdk/anthropic';
import { gateway } from '@ai-sdk/gateway';
import type { GoogleGenerativeAIProviderOptions } from '@ai-sdk/google';
import { type OpenAIResponsesProviderOptions, openai } from '@ai-sdk/openai';
import { extractReasoningMiddleware, wrapLanguageModel } from 'ai';
import { getModelAndProvider } from '../../providers/utils';
import { getImageModelDefinition, getModelDefinition } from './all-models';
import type { ImageModelId, ModelId } from './model-id';

const _telemetryConfig = {
  telemetry: {
    isEnabled: true,
    functionId: 'get-language-model',
  },
};

export const getLanguageModel = (modelId: ModelId) => {
  const model = getModelDefinition(modelId);
  const { model: modelIdShort } = getModelAndProvider(modelId);

  // Use direct provider instead of gateway for debugging
  if (model.owned_by === 'openai') {
    return openai(modelIdShort);
  }

  // Fallback to gateway for other providers
  const languageProvider = gateway(model.id);

  // Wrap with reasoning middleware if the model supports reasoning
  if (model.features?.reasoning && model.owned_by === 'xai') {
    return wrapLanguageModel({
      model: languageProvider,
      middleware: extractReasoningMiddleware({ tagName: 'think' }),
    });
  }

  return languageProvider;
};

export const getImageModel = (modelId: ImageModelId) => {
  const model = getImageModelDefinition(modelId);
  const { model: modelIdShort, provider: _provider } =
    getModelAndProvider(modelId);

  if (model.owned_by === 'openai') {
    return openai.image(modelIdShort);
  }
  throw new Error(`Provider ${model.owned_by} not supported`);
};

const _MODEL_ALIASES = {
  'chat-model': getLanguageModel('openai/gpt-4o-mini'),
  'title-model': getLanguageModel('openai/gpt-4o-mini'),
  'artifact-model': getLanguageModel('openai/gpt-4o-mini'),
  'chat-model-reasoning': getLanguageModel('openai/o3-mini'),
};

export const getModelProviderOptions = (
  providerModelId: ModelId,
):
  | {
      openai: OpenAIResponsesProviderOptions;
    }
  | {
      anthropic: AnthropicProviderOptions;
    }
  | {
      xai: Record<string, never>;
    }
  | {
      google: GoogleGenerativeAIProviderOptions;
    }
  | Record<string, never> => {
  const model = getModelDefinition(providerModelId);
  if (model.owned_by === 'openai') {
    if (model.features?.reasoning) {
      return {
        openai: {
          reasoningSummary: 'auto',
          ...(model.id === 'openai/gpt-5' ||
          model.id === 'openai/gpt-5-mini' ||
          model.id === 'openai/gpt-5-nano'
            ? { reasoningEffort: 'low' }
            : {}),
        } satisfies OpenAIResponsesProviderOptions,
      };
    } else {
      return { openai: {} };
    }
  } else if (model.owned_by === 'anthropic') {
    if (model.features?.reasoning) {
      return {
        anthropic: {
          thinking: {
            type: 'enabled',
            budgetTokens: 4096,
          },
        } satisfies AnthropicProviderOptions,
      };
    } else {
      return { anthropic: {} };
    }
  } else if (model.owned_by === 'xai') {
    return {
      xai: {},
    };
  } else if (model.owned_by === 'google') {
    if (model.features?.reasoning) {
      return {
        google: {
          thinkingConfig: {
            thinkingBudget: 10_000,
          },
        },
      };
    } else {
      return { google: {} };
    }
  } else {
    return {};
  }
};
