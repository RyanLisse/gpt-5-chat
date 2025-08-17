'use client';
import { useSession } from 'next-auth/react';
import { useEffect, useRef } from 'react';
import { useSaveDocument } from '@/hooks/chat-sync-hooks';
import { useArtifact } from '@/hooks/use-artifact';
import type { Suggestion } from '@/lib/db/schema';
import { artifactDefinitions } from './artifact';
import { useDataStream } from './data-stream-provider';

export type DataStreamDelta = {
  type:
    | 'text-delta'
    | 'code-delta'
    | 'sheet-delta'
    | 'image-delta'
    | 'title'
    | 'id'
    | 'message-id'
    | 'suggestion'
    | 'clear'
    | 'finish'
    | 'kind'
    | 'data-responseId'
    | 'data-responses'
    | 'data-textDelta'
    | 'data-codeDelta'
    | 'data-sheetDelta'
    | 'data-imageDelta';
  content?: string | Suggestion;
  delta?: string;
  data?: any;
  id?: string;
};

type StreamPart = any;

function normalizeStreamPart(
  delta: StreamPart,
  setMetadata: (updater: (current: any) => any) => void,
) {
  // Map AI SDK v5 custom text delta to artifact-friendly event
  if (delta?.type === 'text-delta' && typeof delta?.delta === 'string') {
    return { type: 'data-textDelta', data: delta.delta } as const;
  }
  // Capture responseId emitted as custom data event
  if (delta?.type === 'data-responseId') {
    const responseId =
      (delta as any)?.data?.responseId ??
      (delta as any)?.data ??
      (delta as any)?.id;
    if (responseId) {
      setMetadata((current: any) => ({ ...(current ?? {}), responseId }));
    }
    return delta;
  }
  // Some servers also emit an annotation-like wrapper
  if (delta?.type === 'data-responses' && (delta as any)?.data?.responseId) {
    const responseId = (delta as any).data.responseId as string;
    setMetadata((current: any) => ({ ...(current ?? {}), responseId }));
    return delta;
  }
  return delta;
}

export function DataStreamHandler({ id: _id }: { id: string }) {
  const { dataStream } = useDataStream();
  const { artifact, setArtifact, setMetadata } = useArtifact();
  const lastProcessedIndex = useRef(-1);
  const { data: session } = useSession();
  const saveDocumentMutation = useSaveDocument(
    artifact.documentId,
    artifact.messageId,
  );
  const isAuthenticated = Boolean(session);

  useEffect(() => {
    if (!dataStream?.length) {
      return;
    }

    const newDeltas = dataStream.slice(lastProcessedIndex.current + 1);
    lastProcessedIndex.current = dataStream.length - 1;

    newDeltas.forEach((delta) => {
      const artifactDefinition = artifactDefinitions.find(
        (def) => def.kind === artifact.kind,
      );

      const normalizedPart = normalizeStreamPart(delta, setMetadata);

      if (artifactDefinition?.onStreamPart) {
        artifactDefinition.onStreamPart({
          streamPart: normalizedPart,
          setArtifact,
          setMetadata,
        });
      }

      // Handle artifact update based on delta type
      setArtifact((draftArtifact) => {
        const dataHandlers = {
          'data-id': { documentId: normalizedPart.data },
          'data-messageId': { messageId: normalizedPart.data },
          'data-title': { title: normalizedPart.data },
          'data-kind': { kind: normalizedPart.data },
          'data-clear': { content: '' },
          'data-finish': { status: 'idle' },
        } as const;

        const updates = (dataHandlers as any)[normalizedPart.type];
        if (!updates) {
          return draftArtifact;
        }

        const baseUpdate =
          normalizedPart.type === 'data-finish' ? {} : { status: 'streaming' };
        return {
          ...draftArtifact,
          ...updates,
          ...baseUpdate,
        };
      });

      // Artifacts need to be saved locally for anonymous users
      if (normalizedPart.type === 'data-finish' && !isAuthenticated) {
        saveDocumentMutation.mutate({
          id: artifact.documentId,
          title: artifact.title,
          content: artifact.content,
          kind: artifact.kind,
        });
      }
    });
  }, [
    dataStream,
    setArtifact,
    setMetadata,
    artifact,
    saveDocumentMutation,
    isAuthenticated,
  ]);

  return null;
}
