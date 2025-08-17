import type { Document } from '@/lib/db/schema';

export function findMostRecentDocument(
  documents: Document[],
  messageId: string,
): { document: Document; index: number } | null {
  const mostRecentDocumentIndex = documents.findLastIndex(
    (doc) => doc.messageId === messageId,
  );

  if (mostRecentDocumentIndex !== -1) {
    return {
      document: documents[mostRecentDocumentIndex],
      index: mostRecentDocumentIndex,
    };
  }

  return null;
}

export function findFallbackDocument(
  documents: Document[],
): { document: Document; index: number } | null {
  const fallbackDocument = documents.at(-1);

  if (fallbackDocument) {
    return {
      document: fallbackDocument,
      index: documents.length - 1,
    };
  }

  return null;
}

export function initializeDocumentFromData(
  documents: Document[],
  messageId: string,
): {
  document: Document;
  index: number;
  content: string;
} | null {
  // Try to find most recent document for this message
  const mostRecent = findMostRecentDocument(documents, messageId);
  if (mostRecent) {
    return {
      document: mostRecent.document,
      index: mostRecent.index,
      content: mostRecent.document.content ?? '',
    };
  }

  // Fallback to the most recent document
  const fallback = findFallbackDocument(documents);
  if (fallback) {
    return {
      document: fallback.document,
      index: fallback.index,
      content: fallback.document.content ?? '',
    };
  }

  return null;
}
