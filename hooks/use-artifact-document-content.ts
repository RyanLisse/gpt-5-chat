import { useCallback, useRef } from 'react';
import { useDebounceCallback } from 'usehooks-ts';
import { ARTIFACT_ANIMATION } from '@/components/artifact-constants';
import type { Document } from '@/lib/db/schema';

type ContentHandlerOptions = {
  document: Document | null;
  documents: Document[] | undefined;
  isReadonly: boolean;
  saveDocumentMutation: {
    mutate: (data: {
      id: string;
      title: string;
      content: string;
      kind: 'text' | 'code' | 'sheet';
    }) => void;
  };
  setIsContentDirty: (dirty: boolean) => void;
};

export function useArtifactDocumentContent({
  document,
  documents,
  isReadonly,
  saveDocumentMutation,
  setIsContentDirty,
}: ContentHandlerOptions) {
  const lastSavedContentRef = useRef<string>('');

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
    [saveDocumentMutation, documents, setIsContentDirty],
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
    [
      document,
      debouncedHandleContentChange,
      handleContentChange,
      isReadonly,
      setIsContentDirty,
    ],
  );

  const getDocumentContentById = useCallback(
    (index: number) => {
      return documents?.[index]?.content ?? '';
    },
    [documents],
  );

  return {
    saveContent,
    getDocumentContentById,
  };
}
