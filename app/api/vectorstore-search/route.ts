import { NextResponse, type NextRequest } from 'next/server';
import OpenAI from 'openai';

// Server-only API route to query an OpenAI Vector Store by ID.
// - Accepts POST with { vectorstoreId: string, query: string, topK?: number }
// - Uses server-side OpenAI SDK (API key from env) and NEVER exposes it to clients
// - Returns normalized results in the required schema and graceful error messages

type SearchBody = {
  vectorstoreId?: string;
  query?: string;
  topK?: number;
};

// Helper: attempt to normalize one result item from any of the potential OpenAI responses.
// Exported for unit tests.
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

  return { document_id: String(documentId), score: Number(score) || 0, content };
}

// Helper: sort results by descending score
// Exported for unit tests.
export function sortByScoreDesc(a: { score: number }, b: { score: number }) {
  return b.score - a.score;
}

// Helper: derive a friendly error message from various error shapes without leaking details.
// Exported for unit tests.
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

export async function POST(req: NextRequest) {
  try {
    const { vectorstoreId, query, topK }: SearchBody = await req.json();

    // Basic validation with clear error messages
    if (!vectorstoreId || typeof vectorstoreId !== 'string' || !vectorstoreId.trim()) {
      return NextResponse.json(
        { results: [], error: 'Vector store ID is required.', status: 'error' },
        { status: 400 },
      );
    }
    if (!query || typeof query !== 'string' || !query.trim()) {
      return NextResponse.json(
        { results: [], error: 'Query is required.', status: 'error' },
        { status: 400 },
      );
    }

    const k = Number.isFinite(topK) && topK! > 0 && topK! <= 50 ? Math.floor(topK!) : 5;

    // Initialize SDK using server env var only
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // The OpenAI Node SDK v5+ supports vector store query APIs. Since
    // SDK surface may change, we implement a robust flow:
    // 1) Attempt official SDK call (if present)
    // 2) Fallback to direct HTTP call to the REST endpoint
    let results: Array<{ document_id: string; score: number; content: string }> = [];

    // Attempt 1: Tentative SDK method (if available in this version)
    try {
      // @ts-expect-error - some versions expose beta or stable namespaces
      const rsp = client?.vectorStores?.query
        ? // @ts-ignore
          await client.vectorStores.query(vectorstoreId, { query, top_k: k })
        : // @ts-ignore
          client?.beta?.vectorStores?.query
            ? // @ts-ignore
              await client.beta.vectorStores.query(vectorstoreId, { query, top_k: k })
            : null;

      if (rsp && Array.isArray(rsp.data)) {
        results = rsp.data.map(normalizeItem).sort(sortByScoreDesc);
      }
    } catch (e) {
      // Swallow and try HTTP fallback below
    }

    // Attempt 2: Direct REST call fallback if SDK path above not available/successful
    if (results.length === 0) {
      const endpointOptions = [
        // Newer API path
        `https://api.openai.com/v1/vector_stores/${encodeURIComponent(vectorstoreId)}/query`,
        // Alternate naming in older/beta builds (kept for compatibility)
        `https://api.openai.com/v1/vector_stores/${encodeURIComponent(vectorstoreId)}/search`,
      ];

      let lastErr: any = null;
      for (const url of endpointOptions) {
        try {
          const httpRsp = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            },
            body: JSON.stringify({ query, top_k: k }),
          });

          if (!httpRsp.ok) {
            lastErr = new Error(`OpenAI HTTP error ${httpRsp.status}`);
            continue;
          }

          const data = await httpRsp.json();
          if (data && Array.isArray(data.data)) {
            results = data.data.map(normalizeItem).sort(sortByScoreDesc);
            break; // success
          }
        } catch (err) {
          lastErr = err;
        }
      }

      if (results.length === 0 && lastErr) throw lastErr;
    }

    return NextResponse.json({ results, status: 'success' });
  } catch (error: any) {
    // Map different error shapes to a single, friendly message without leaking secrets
    const friendly = deriveFriendlyError(error);

    return NextResponse.json(
      { results: [], error: friendly, status: 'error' },
      { status: 500 },
    );
  }
}
