import type { ToolName, UiToolName } from '@/lib/ai/types';
import {
  type LucideIcon,
  Images,
  Edit3,
} from 'lucide-react';

export interface ToolDefinition {
  name: string;
  description: string;
  icon: LucideIcon;
  key: ToolName;
}

export const toolDefinitions: Record<UiToolName, ToolDefinition> = {
  generateImage: {
    key: 'generateImage',
    name: 'Create an image',
    description: 'Generate images from text descriptions.',
    icon: Images,
  },
  createDocument: {
    key: 'createDocument',
    name: 'Write or code',
    description: 'Create documents or code (no execution sandbox).',
    icon: Edit3,
  },
};

export const enabledTools: UiToolName[] = [
  'generateImage',
  'createDocument',
];
