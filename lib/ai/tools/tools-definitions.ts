import type { ToolName } from '@/lib/ai/types';

// Central list of available tool identifiers used across the app and tests
export const allTools: ToolName[] = [
  'generateImage',
  'createDocument',
  'updateDocument',
  'getWeather',
  'requestSuggestions',
  'retrieve',
  'readDocument',
  'stockChart',
];
