import { useCallback, useEffect, useRef, useState } from 'react';
import { useDebounceCallback } from 'usehooks-ts';
import type { UIArtifact } from '@/components/artifact';
import { ARTIFACT_ANIMATION } from '@/components/artifact-constants';
import { useDocuments, useSaveDocument } from '@/hooks/chat-sync-hooks';
import type { Document } from '@/lib/db/schema';

export function useArtifactDocument(
  artifact: UIArtifact,
  setArtifact: (updater: (prev: UIArtifact) => UIArtifact) => void,
  isReadonly: boolean,
) {
  const { data: documents, isLoading: isDocumentsFetching } = useDocuments(
    artifact.documentId || '',
    artifact.documentId === 'init' || artifact.status === 'streaming',
  );

  const [document, setDocument] = useState<Document | null>(null);
  const [currentVersionIndex, setCurrentVersionIndex] = useState(-1);
  const [isContentDirty, setIsContentDirty] = useState(false);
  const lastSavedContentRef = useRef<string>('');

  const saveDocumentMutation = useSaveDocument(
    artifact.documentId,
    artifact.messageId,
    {
      onSettled: () => {
        setIsContentDirty(false);
      },
    },
  );

  // Initialize document when documents are loaded
  useEffect(() => {
    if (documents && documents.length > 0) {
      const mostRecentDocumentIndex = documents.findLastIndex(
        (doc) => doc.messageId === artifact.messageId,
      );

      if (mostRecentDocumentIndex !== -1) {
        const mostRecentDocument = documents[mostRecentDocumentIndex];
        setDocument(mostRecentDocument);
        setCurrentVersionIndex(mostRecentDocumentIndex);
        setArtifact((currentArtifact) => ({
          ...currentArtifact,
          content: mostRecentDocument.content ?? '',
        }));
      } else {
        // Fallback to the most recent document
        const fallbackDocument = documents.at(-1);
        if (fallbackDocument) {
          setDocument(fallbackDocument);
          setCurrentVersionIndex(documents.length - 1);
          setArtifact((currentArtifact) => ({
            ...currentArtifact,
            content: fallbackDocument.content ?? '',
          }));
        }
      }
    }
  }, [documents, setArtifact, artifact.messageId]);

  const handleContentChange = useCallback(
    (updatedContent: string) => {
      if (!documents) {
        return;
      }

      const lastDocument = documents.at(-1);
      if (!lastDocument) {
        return;
      }

      if (
        lastDocument?.content !== updatedContent &&
        lastSavedContentRef.current === updatedContent
      ) {
        setIsContentDirty(true);
        saveDocumentMutation.mutate({
          id: lastDocument.id,
          title: lastDocument.title,
          content: updatedContent,
          kind: lastDocument.kind,
        });
      }
    },
    [saveDocumentMutation, documents],
  );

  const debouncedHandleContentChange = useDebounceCallback(
    handleContentChange,
    ARTIFACT_ANIMATION.DEBOUNCE_DELAY,
  );

  const saveContent = useCallback(
    (updatedContent: string, debounce: boolean) => {
      if (isReadonly) {
        return;
      }

      lastSavedContentRef.current = updatedContent;

      if (document && updatedContent !== document.content) {
        setIsContentDirty(true);

        if (debounce) {
          debouncedHandleContentChange(updatedContent);
        } else {
          handleContentChange(updatedContent);
        }
      }
    },
    [document, debouncedHandleContentChange, handleContentChange, isReadonly],
  );

  const getDocumentContentById = useCallback(
    (index: number) => {
      return documents?.[index]?.content ?? '';
    },
    [documents],
  );

  const handleVersionChange = useCallback(
    (type: 'next' | 'prev' | 'toggle' | 'latest') => {
      if (!documents) {
        return;
      }

      switch (type) {
        case 'latest':
          setCurrentVersionIndex(documents.length - 1);
          break;
        case 'prev':
          if (currentVersionIndex > 0) {
            setCurrentVersionIndex((index) => index - 1);
          }
          break;
        case 'next':
          if (currentVersionIndex < documents.length - 1) {
            setCurrentVersionIndex((index) => index + 1);
          }
          break;
      }
    },
    [documents, currentVersionIndex],
  );

  const isCurrentVersion =
    documents && documents.length > 0
      ? currentVersionIndex === documents.length - 1
      : true;

  return {
    documents,
    document,
    currentVersionIndex,
    isContentDirty,
    isDocumentsFetching,
    saveContent,
    getDocumentContentById,
    handleVersionChange,
    isCurrentVersion,
  };
}
