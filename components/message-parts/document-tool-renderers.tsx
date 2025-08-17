import { DocumentToolCall, DocumentToolResult } from '../document';
import { DocumentPreview } from '../document-preview';
import { useLastArtifact } from './use-last-artifact';

type BaseDocumentToolProps = {
  toolCallId: string;
  messageId: string;
  isReadonly: boolean;
};

type ErrorDisplayProps = {
  toolCallId: string;
  error: unknown;
};

function ErrorDisplay({ toolCallId, error }: ErrorDisplayProps) {
  return (
    <div className="rounded border p-2 text-red-500" key={toolCallId}>
      Error: {String(error)}
    </div>
  );
}

type CreateDocumentInputProps = BaseDocumentToolProps & {
  input: any;
};

export function CreateDocumentInput({
  toolCallId,
  input,
  messageId,
  isReadonly,
}: CreateDocumentInputProps) {
  return (
    <div key={toolCallId}>
      <DocumentPreview
        args={input}
        isReadonly={isReadonly}
        messageId={messageId}
      />
    </div>
  );
}

type CreateDocumentOutputProps = BaseDocumentToolProps & {
  input: any;
  output: any;
};

export function CreateDocumentOutput({
  toolCallId,
  input,
  output,
  messageId,
  isReadonly,
}: CreateDocumentOutputProps) {
  const { checkIsLastArtifact } = useLastArtifact();

  if ('error' in output) {
    return <ErrorDisplay error={output.error} toolCallId={toolCallId} />;
  }

  const shouldShowFullPreview = checkIsLastArtifact(toolCallId);

  return (
    <div key={toolCallId}>
      {shouldShowFullPreview ? (
        <DocumentPreview
          args={input}
          isReadonly={isReadonly}
          messageId={messageId}
          result={output}
          type="create"
        />
      ) : (
        <DocumentToolResult
          isReadonly={isReadonly}
          messageId={messageId}
          result={output}
          type="create"
        />
      )}
    </div>
  );
}

type UpdateDocumentInputProps = BaseDocumentToolProps & {
  input: { description: string };
};

export function UpdateDocumentInput({
  toolCallId,
  input,
  isReadonly,
}: UpdateDocumentInputProps) {
  return (
    <div key={toolCallId}>
      <DocumentToolCall
        args={{ title: input.description }}
        isReadonly={isReadonly}
        type="update"
      />
    </div>
  );
}

type UpdateDocumentOutputProps = BaseDocumentToolProps & {
  input: any;
  output: any;
};

export function UpdateDocumentOutput({
  toolCallId,
  input,
  output,
  messageId,
  isReadonly,
}: UpdateDocumentOutputProps) {
  const { checkIsLastArtifact } = useLastArtifact();

  if ('error' in output) {
    return <ErrorDisplay error={output.error} toolCallId={toolCallId} />;
  }

  const shouldShowFullPreview = checkIsLastArtifact(toolCallId);

  return (
    <div key={toolCallId}>
      {shouldShowFullPreview ? (
        <DocumentPreview
          args={input}
          isReadonly={isReadonly}
          messageId={messageId}
          result={output}
          type="update"
        />
      ) : (
        <DocumentToolResult
          isReadonly={isReadonly}
          messageId={messageId}
          result={output}
          type="update"
        />
      )}
    </div>
  );
}

export function RequestSuggestionsInput({
  toolCallId,
  isReadonly,
}: BaseDocumentToolProps) {
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

type RequestSuggestionsOutputProps = BaseDocumentToolProps & {
  output: any;
};

export function RequestSuggestionsOutput({
  toolCallId,
  output,
  messageId,
  isReadonly,
}: RequestSuggestionsOutputProps) {
  if ('error' in output) {
    return <ErrorDisplay error={output.error} toolCallId={toolCallId} />;
  }

  return (
    <div key={toolCallId}>
      <DocumentToolResult
        isReadonly={isReadonly}
        messageId={messageId}
        result={output}
        type="request-suggestions"
      />
    </div>
  );
}
