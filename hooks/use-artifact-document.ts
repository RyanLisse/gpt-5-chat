import { useEffect, useState } from 'react';
import type { UIArtifact } from '@/components/artifact';
import { useDocuments, useSaveDocument } from '@/hooks/chat-sync-hooks';
import type { Document } from '@/lib/db/schema';
import { useArtifactDocumentContent } from './use-artifact-document-content';
import { initializeDocumentFromData } from './use-artifact-document-initialization';
import { useArtifactDocumentVersions } from './use-artifact-document-versions';

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

  const saveDocumentMutation = useSaveDocument(
    artifact.documentId,
    artifact.messageId,
    {
      onSettled: () => {
        setIsContentDirty(false);
      },
    },
  );

  const contentHandlers = useArtifactDocumentContent({
    document,
    documents,
    isReadonly,
    saveDocumentMutation,
    setIsContentDirty,
  });

  const versionHandlers = useArtifactDocumentVersions({
    documents,
    currentVersionIndex,
    setCurrentVersionIndex,
  });

  // Initialize document when documents are loaded
  useEffect(() => {
    if (documents && documents.length > 0) {
      const result = initializeDocumentFromData(documents, artifact.messageId);

      if (result) {
        setDocument(result.document);
        setCurrentVersionIndex(result.index);
        setArtifact((currentArtifact) => ({
          ...currentArtifact,
          content: result.content,
        }));
      }
    }
  }, [documents, setArtifact, artifact.messageId]);

  return {
    documents,
    document,
    currentVersionIndex,
    isContentDirty,
    isDocumentsFetching,
    saveContent: contentHandlers.saveContent,
    getDocumentContentById: contentHandlers.getDocumentContentById,
    handleVersionChange: versionHandlers.handleVersionChange,
    isCurrentVersion: versionHandlers.isCurrentVersion,
  };
}
