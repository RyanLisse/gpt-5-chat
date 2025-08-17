import type { ChatMessage, ToolName } from '@/lib/ai/types';

export function addExplicitToolRequestToMessages(
  messages: ChatMessage[],
  _activeTools: ToolName[],
  explicitlyRequestedTools: ToolName[] | null,
) {
  const _lastAssistantMessage = messages.findLast(
    (message) => message.role === 'assistant',
  );

  const lastMessage = messages.at(-1);
  if (!lastMessage) {
    return;
  }
  let toolsToRequest: ToolName[] = [];

  if (explicitlyRequestedTools) {
    toolsToRequest = explicitlyRequestedTools;
  }

  if (toolsToRequest.length > 0 && lastMessage) {
    lastMessage.parts.push({
      type: 'text',
      text: `I want to use the tools ${toolsToRequest.join(', or ')})`,
    });
  }
}
