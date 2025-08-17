import { useCallback } from 'react';
import type { Document } from '@/lib/db/schema';

type VersionHandlerOptions = {
  documents: Document[] | undefined;
  currentVersionIndex: number;
  setCurrentVersionIndex: (index: number | ((prev: number) => number)) => void;
};

export function useArtifactDocumentVersions({
  documents,
  currentVersionIndex,
  setCurrentVersionIndex,
}: VersionHandlerOptions) {
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
    [documents, currentVersionIndex, setCurrentVersionIndex],
  );

  const isCurrentVersion =
    documents && documents.length > 0
      ? currentVersionIndex === documents.length - 1
      : true;

  return {
    handleVersionChange,
    isCurrentVersion,
  };
}
