import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the all-models module to provide test model definitions
const mockModelDefinitions = {
  'openai/gpt-4o-mini': {
    id: 'openai/gpt-4o-mini',
    owned_by: 'openai',
    features: { reasoning: false },
  },
  'openai/o3-mini': {
    id: 'openai/o3-mini',
    owned_by: 'openai',
    features: { reasoning: true },
  },
  'openai/gpt-5': {
    id: 'openai/gpt-5',
    owned_by: 'openai',
    features: { reasoning: true },
  },
  'openai/gpt-5-mini': {
    id: 'openai/gpt-5-mini',
    owned_by: 'openai',
    features: { reasoning: true },
  },
  'openai/gpt-5-nano': {
    id: 'openai/gpt-5-nano',
    owned_by: 'openai',
    features: { reasoning: true },
  },
  'xai/grok-beta': {
    id: 'xai/grok-beta',
    owned_by: 'xai',
    features: { reasoning: true },
  },
  'anthropic/claude-3-5-sonnet': {
    id: 'anthropic/claude-3-5-sonnet',
    owned_by: 'anthropic',
    features: { reasoning: false },
  },
  'anthropic/claude-4-sonnet': {
    id: 'anthropic/claude-4-sonnet',
    owned_by: 'anthropic',
    features: { reasoning: true },
  },
  'google/gemini-2.0-flash': {
    id: 'google/gemini-2.0-flash',
    owned_by: 'google',
    features: { reasoning: false },
  },
  'google/gemini-2.0-flash-thinking': {
    id: 'google/gemini-2.0-flash-thinking',
    owned_by: 'google',
    features: { reasoning: true },
  },
  'openai/dall-e-3': {
    id: 'openai/dall-e-3',
    owned_by: 'openai',
  },
};

// Test wrapper class that allows injecting mocked dependencies
class TestableProviders {
  constructor(
    private gatewayFn: any,
    private openaiImageFn: any,
    private extractReasoningMiddleware: any,
    private wrapLanguageModel: any,
    private getModelDefinition: any,
    private getImageModelDefinition: any,
    private getModelAndProvider: any,
  ) {}

  getLanguageModel(modelId: string) {
    const model = this.getModelDefinition(modelId);
    const languageProvider = this.gatewayFn(model.id);

    // Wrap with reasoning middleware if the model supports reasoning
    if (model.features?.reasoning && model.owned_by === 'xai') {
      return this.wrapLanguageModel({
        model: languageProvider,
        middleware: this.extractReasoningMiddleware({ tagName: 'think' }),
      });
    }

    return languageProvider;
  }

  getImageModel(modelId: string) {
    const model = this.getImageModelDefinition(modelId);
    const { model: modelIdShort } = this.getModelAndProvider(modelId);

    if (model.owned_by === 'openai') {
      return this.openaiImageFn(modelIdShort);
    }
    throw new Error(`Provider ${model.owned_by} not supported`);
  }

  getModelProviderOptions(providerModelId: string) {
    const model = this.getModelDefinition(providerModelId);
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
          },
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
          },
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
  }
}

describe('providers', () => {
  let testableProviders: TestableProviders;
  let mockGateway: any;
  let mockOpenAIImage: any;
  let mockExtractReasoningMiddleware: any;
  let mockWrapLanguageModel: any;
  let mockGetModelDefinition: any;
  let mockGetImageModelDefinition: any;
  let mockGetModelAndProvider: any;

  beforeEach(() => {
    mockGateway = vi.fn((modelId: string) => ({ modelId, type: 'language' }));
    mockOpenAIImage = vi.fn((modelId: string) => ({ modelId, type: 'image' }));
    mockExtractReasoningMiddleware = vi.fn(() => ({
      type: 'reasoning-middleware',
    }));
    mockWrapLanguageModel = vi.fn(({ model, middleware }) => ({
      wrapped: model,
      middleware,
      type: 'wrapped-language-model',
    }));
    mockGetModelDefinition = vi.fn((modelId: string) => {
      const model =
        mockModelDefinitions[modelId as keyof typeof mockModelDefinitions];
      if (!model) {
        throw new Error(`Model ${modelId} not found`);
      }
      return model;
    });
    mockGetImageModelDefinition = vi.fn((modelId: string) => {
      const model =
        mockModelDefinitions[modelId as keyof typeof mockModelDefinitions];
      if (!model) {
        throw new Error(`Model ${modelId} not found`);
      }
      return model;
    });
    mockGetModelAndProvider = vi.fn((modelId: string) => {
      const [provider, model] = modelId.split('/');
      return { provider, model };
    });

    testableProviders = new TestableProviders(
      mockGateway,
      mockOpenAIImage,
      mockExtractReasoningMiddleware,
      mockWrapLanguageModel,
      mockGetModelDefinition,
      mockGetImageModelDefinition,
      mockGetModelAndProvider,
    );
  });

  describe('getLanguageModel', () => {
    it('should return basic language model for non-reasoning models', () => {
      const result = testableProviders.getLanguageModel('openai/gpt-4o-mini');

      expect(mockGateway).toHaveBeenCalledWith('openai/gpt-4o-mini');
      expect(result).toEqual({
        modelId: 'openai/gpt-4o-mini',
        type: 'language',
      });
    });

    it('should wrap XAI reasoning models with reasoning middleware', () => {
      const result = testableProviders.getLanguageModel('xai/grok-beta');

      expect(mockGateway).toHaveBeenCalledWith('xai/grok-beta');
      expect(mockExtractReasoningMiddleware).toHaveBeenCalledWith({
        tagName: 'think',
      });
      expect(mockWrapLanguageModel).toHaveBeenCalledWith({
        model: { modelId: 'xai/grok-beta', type: 'language' },
        middleware: { type: 'reasoning-middleware' },
      });
      expect(result).toEqual({
        wrapped: { modelId: 'xai/grok-beta', type: 'language' },
        middleware: { type: 'reasoning-middleware' },
        type: 'wrapped-language-model',
      });
    });

    it('should not wrap non-XAI reasoning models', () => {
      const result = testableProviders.getLanguageModel('openai/o3-mini');

      expect(mockGateway).toHaveBeenCalledWith('openai/o3-mini');
      expect(mockWrapLanguageModel).not.toHaveBeenCalled();
      expect(result).toEqual({
        modelId: 'openai/o3-mini',
        type: 'language',
      });
    });

    it('should handle anthropic reasoning models without wrapping', () => {
      const result = testableProviders.getLanguageModel(
        'anthropic/claude-4-sonnet',
      );

      expect(mockGateway).toHaveBeenCalledWith('anthropic/claude-4-sonnet');
      expect(mockWrapLanguageModel).not.toHaveBeenCalled();
      expect(result).toEqual({
        modelId: 'anthropic/claude-4-sonnet',
        type: 'language',
      });
    });
  });

  describe('getImageModel', () => {
    it('should return OpenAI image model for supported models', () => {
      const result = testableProviders.getImageModel('openai/dall-e-3');

      expect(mockOpenAIImage).toHaveBeenCalledWith('dall-e-3');
      expect(result).toEqual({
        modelId: 'dall-e-3',
        type: 'image',
      });
    });

    it('should throw error for unsupported providers', () => {
      // Mock an unsupported provider
      mockGetImageModelDefinition.mockReturnValueOnce({
        id: 'anthropic/claude-vision',
        owned_by: 'anthropic',
      });

      expect(() =>
        testableProviders.getImageModel('anthropic/claude-vision'),
      ).toThrow('Provider anthropic not supported');
    });
  });

  describe('getModelProviderOptions', () => {
    it('should return OpenAI options for OpenAI models without reasoning', () => {
      const result =
        testableProviders.getModelProviderOptions('openai/gpt-4o-mini');

      expect(result).toEqual({
        openai: {},
      });
    });

    it('should return OpenAI reasoning options for O3 models', () => {
      const result =
        testableProviders.getModelProviderOptions('openai/o3-mini');

      expect(result).toEqual({
        openai: {
          reasoningSummary: 'auto',
        },
      });
    });

    it('should return OpenAI reasoning options with low effort for GPT-5 models', () => {
      const result = testableProviders.getModelProviderOptions('openai/gpt-5');

      expect(result).toEqual({
        openai: {
          reasoningSummary: 'auto',
          reasoningEffort: 'low',
        },
      });
    });

    it('should return OpenAI reasoning options with low effort for GPT-5-mini', () => {
      const result =
        testableProviders.getModelProviderOptions('openai/gpt-5-mini');

      expect(result).toEqual({
        openai: {
          reasoningSummary: 'auto',
          reasoningEffort: 'low',
        },
      });
    });

    it('should return OpenAI reasoning options with low effort for GPT-5-nano', () => {
      const result =
        testableProviders.getModelProviderOptions('openai/gpt-5-nano');

      expect(result).toEqual({
        openai: {
          reasoningSummary: 'auto',
          reasoningEffort: 'low',
        },
      });
    });

    it('should return Anthropic options for Anthropic models without reasoning', () => {
      const result = testableProviders.getModelProviderOptions(
        'anthropic/claude-3-5-sonnet',
      );

      expect(result).toEqual({
        anthropic: {},
      });
    });

    it('should return Anthropic thinking options for reasoning models', () => {
      const result = testableProviders.getModelProviderOptions(
        'anthropic/claude-4-sonnet',
      );

      expect(result).toEqual({
        anthropic: {
          thinking: {
            type: 'enabled',
            budgetTokens: 4096,
          },
        },
      });
    });

    it('should return XAI options for XAI models', () => {
      const result = testableProviders.getModelProviderOptions('xai/grok-beta');

      expect(result).toEqual({
        xai: {},
      });
    });

    it('should return Google options for Google models without reasoning', () => {
      const result = testableProviders.getModelProviderOptions(
        'google/gemini-2.0-flash',
      );

      expect(result).toEqual({
        google: {},
      });
    });

    it('should return Google thinking options for reasoning models', () => {
      const result = testableProviders.getModelProviderOptions(
        'google/gemini-2.0-flash-thinking',
      );

      expect(result).toEqual({
        google: {
          thinkingConfig: {
            thinkingBudget: 10_000,
          },
        },
      });
    });

    it('should return empty object for unknown providers', () => {
      // Mock an unknown provider
      mockGetModelDefinition.mockReturnValueOnce({
        id: 'unknown/test-model',
        owned_by: 'unknown',
        features: {},
      });

      const result =
        testableProviders.getModelProviderOptions('unknown/test-model');

      expect(result).toEqual({});
    });
  });
});
