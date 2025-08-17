// Provider icons using @lobehub/icons - these are already optimized
import { Anthropic, Gemini, Groq, OpenAI, XAI } from '@lobehub/icons';

type ProviderIconProps = {
  size?: number;
  className?: string;
};

export const OpenAIIcon = ({ size = 16 }: ProviderIconProps) => (
  <OpenAI name="openai" size={size} />
);

export const GeminiIcon = ({ size = 16 }: ProviderIconProps) => (
  <Gemini name="gemini" size={size} />
);

export const GroqIcon = ({ size = 16 }: ProviderIconProps) => (
  <Groq name="groq" size={size} />
);

export const XAIIcon = ({ size = 16 }: ProviderIconProps) => (
  <XAI name="xai" size={size} />
);

export const GoogleIcon = ({ size = 16 }: ProviderIconProps) => (
  <Gemini name="google" size={size} />
);

export const AnthropicIcon = ({ size = 16 }: ProviderIconProps) => (
  <Anthropic name="anthropic" size={size} />
);
