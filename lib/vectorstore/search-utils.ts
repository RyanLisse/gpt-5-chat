// Utility functions for vectorstore search functionality
// Separated from API route to avoid Next.js export restrictions

// Helper: attempt to normalize one result item from any of the potential OpenAI responses.
export function normalizeItem(item: any) {
  // We try several likely shapes to extract fields safely.
  const documentId =
    item?.document_id || item?.documentId || item?.id || item?.file_id || '';
  const score =
    typeof item?.score === 'number'
      ? item.score
      : typeof item?.relevance === 'number'
        ? item.relevance
        : typeof item?.rank === 'number'
          ? item.rank
          : 0;

  // Content may appear under different keys depending on the API variant
  const content =
    typeof item?.content === 'string'
      ? item.content
      : typeof item?.text === 'string'
        ? item.text
        : typeof item?.chunk === 'string'
          ? item.chunk
          : typeof item?.data === 'string'
            ? item.data
            : typeof item?.snippet === 'string'
              ? item.snippet
              : '';

  return {
    document_id: String(documentId),
    score: Number(score) || 0,
    content,
  };
}

// Helper: sort results by descending score
export function sortByScoreDesc(a: { score: number }, b: { score: number }) {
  return b.score - a.score;
}

// Helper: derive a friendly error message from various error shapes without leaking details.
export function deriveFriendlyError(error: any) {
  const message =
    typeof error?.message === 'string'
      ? error.message
      : 'Failed to query the vector store.';
  const isAuthError = /401|unauthorized|invalid api key/i.test(String(message));
  const isNotFound = /404|not found|no such vector/i.test(String(message));

  const friendly = isAuthError
    ? 'Authentication failed. Check server OpenAI API key.'
    : isNotFound
      ? 'Vector store not found. Verify the ID.'
      : 'Unable to retrieve results. Please try again.';

  return friendly;
}
