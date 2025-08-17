import { DocumentToolCall, DocumentToolResult } from '../document';
import { DocumentPreview } from '../document-preview';
import { useLastArtifact } from './use-last-artifact';

type DocumentToolPartProps = {
  part: Extract<
    import('@/lib/ai/types').ChatMessage['parts'][number],
    {
      type:
        | 'tool-createDocument'
        | 'tool-updateDocument'
        | 'tool-requestSuggestions';
    }
  >;
  messageId: string;
  isReadonly: boolean;
};

// Helper function to render error display
function renderError(toolCallId: string, error: unknown) {
  return (
    <div className="rounded border p-2 text-red-500" key={toolCallId}>
      Error: {String(error)}
    </div>
  );
}

// Helper function to handle input-available state for different tool types
function renderInputAvailable(
  type: string,
  toolCallId: string,
  part: any,
  isReadonly: boolean,
  messageId: string,
) {
  const commonProps = { isReadonly, messageId };

  if (type === 'tool-createDocument') {
    return (
      <div key={toolCallId}>
        <DocumentPreview args={part.input} {...commonProps} />
      </div>
    );
  }

  if (type === 'tool-updateDocument') {
    return (
      <div key={toolCallId}>
        <DocumentToolCall
          args={{ title: part.input.description }}
          isReadonly={isReadonly}
          type="update"
        />
      </div>
    );
  }

  if (type === 'tool-requestSuggestions') {
    return (
      <div key={toolCallId}>
        <DocumentToolCall
          args={{ title: '' }}
          isReadonly={isReadonly}
          type="request-suggestions"
        />
      </div>
    );
  }

  return null;
}

// Helper function to handle output-available state
function renderOutputAvailable(
  type: string,
  toolCallId: string,
  part: any,
  isReadonly: boolean,
  messageId: string,
  checkIsLastArtifact: (id: string) => boolean,
) {
  const { output } = part;

  if ('error' in output) {
    return renderError(toolCallId, output.error);
  }

  const commonProps = { isReadonly, messageId, result: output };
  const shouldShowFullPreview = checkIsLastArtifact(toolCallId);

  if (type === 'tool-createDocument' || type === 'tool-updateDocument') {
    const toolType = type === 'tool-createDocument' ? 'create' : 'update';
    return (
      <div key={toolCallId}>
        {shouldShowFullPreview ? (
          <DocumentPreview args={part.input} {...commonProps} type={toolType} />
        ) : (
          <DocumentToolResult {...commonProps} type={toolType} />
        )}
      </div>
    );
  }

  if (type === 'tool-requestSuggestions') {
    return (
      <div key={toolCallId}>
        <DocumentToolResult {...commonProps} type="request-suggestions" />
      </div>
    );
  }

  return null;
}

export function DocumentToolPart({
  part,
  messageId,
  isReadonly,
}: DocumentToolPartProps) {
  const { checkIsLastArtifact } = useLastArtifact();
  const { toolCallId, state, type } = part;

  // Handle input-available state for all tool types
  if (state === 'input-available') {
    return renderInputAvailable(type, toolCallId, part, isReadonly, messageId);
  }

  // Handle output-available state for all tool types
  if (state === 'output-available') {
    return renderOutputAvailable(
      type,
      toolCallId,
      part,
      isReadonly,
      messageId,
      checkIsLastArtifact,
    );
  }

  return null;
}
