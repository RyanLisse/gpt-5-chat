import { type ToolName, toolNameSchema } from '../types';

export const toolsDefinitions: Record<ToolName, ToolDefinition> = {
  getWeather: {
    name: 'getWeather',
    description: 'Get the weather in a specific location',
    cost: 1,
  },
  createDocument: {
    name: 'createDocument',
    description: 'Create a new document',
    cost: 5,
  },
  updateDocument: {
    name: 'updateDocument',
    description: 'Update a document',
    cost: 5,
  },
  requestSuggestions: {
    name: 'requestSuggestions',
    description: 'Request suggestions for a document',
    cost: 1,
  },
  readDocument: {
    name: 'readDocument',
    description: 'Read the content of a document',
    cost: 1,
  },
  retrieve: {
    name: 'retrieve',
    description: 'Retrieve information from the web',
    cost: 1,
  },
  stockChart: {
    name: 'stockChart',
    description: 'Get the stock chart for a specific stock',
    cost: 1,
  },
  generateImage: {
    name: 'generateImage',
    description: 'Generate images from text descriptions',
    cost: 5,
  },
};

export const allTools = toolNameSchema.options;
export type ToolDefinition = {
  name: string;
  description: string;
  cost: number;
};
