import { kv } from '@vercel/kv';
import { type NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { auth } from '@/app/(auth)/auth';
import { getClientIP } from '@/lib/utils/rate-limit';
import {
  deriveFriendlyError,
  normalizeItem,
  sortByScoreDesc,
} from '@/lib/vectorstore/search-utils';

// Server-only API route to query an OpenAI Vector Store by ID.
// - Accepts POST with { vectorstoreId: string, query: string, topK?: number }
// - Uses server-side OpenAI SDK (API key from env) and NEVER exposes it to clients
// - Returns normalized results in the required schema and graceful error messages

// Constants
const MAX_VECTORSTORE_ID_LENGTH = 128;
const MAX_QUERY_LENGTH = 512;
const MAX_TOP_K = 50;
const DEFAULT_TOP_K = 5;
const RATE_LIMIT_PRODUCTION = 30;
const RATE_LIMIT_DEVELOPMENT = 120;
const RATE_LIMIT_WINDOW_SECONDS = 60;
const MILLISECONDS_PER_SECOND = 1000;
const HTTP_STATUS_UNAUTHORIZED = 401;
const HTTP_STATUS_TOO_MANY_REQUESTS = 429;
const HTTP_STATUS_INTERNAL_SERVER_ERROR = 500;

type SearchBody = {
  vectorstoreId?: string;
  query?: string;
  topK?: number;
};

// Helper functions moved to @/lib/vectorstore/search-utils to avoid Next.js route export conflicts

// Validation helper functions
function validateVectorstoreId(
  vectorstoreId?: string,
):
  | { isValid: false; error: string }
  | { isValid: true; vectorstoreId: string } {
  if (
    !vectorstoreId ||
    typeof vectorstoreId !== 'string' ||
    !vectorstoreId.trim() ||
    vectorstoreId.length > MAX_VECTORSTORE_ID_LENGTH
  ) {
    return {
      isValid: false,
      error: `Vector store ID is required and must be <= ${MAX_VECTORSTORE_ID_LENGTH} chars.`,
    };
  }
  return { isValid: true, vectorstoreId };
}

function validateQuery(
  query?: string,
): { isValid: false; error: string } | { isValid: true; query: string } {
  if (
    !query ||
    typeof query !== 'string' ||
    !query.trim() ||
    query.trim().length > MAX_QUERY_LENGTH
  ) {
    return {
      isValid: false,
      error: `Query is required and must be <= ${MAX_QUERY_LENGTH} chars.`,
    };
  }
  return { isValid: true, query };
}

function calculateTopK(topK?: number): number {
  if (typeof topK === 'number' && Number.isFinite(topK)) {
    const n = Math.floor(topK);
    if (n > 0 && n <= MAX_TOP_K) {
      return n;
    }
  }
  return DEFAULT_TOP_K;
}

async function checkRateLimit(session: any, req: NextRequest) {
  try {
    const identifier =
      session.user.id ?? getClientIP(req as unknown as Request);
    const key = `sparka-ai:rate-limit:vectorstore:minute:${identifier}`;
    const limit =
      process.env.NODE_ENV === 'production'
        ? RATE_LIMIT_PRODUCTION
        : RATE_LIMIT_DEVELOPMENT;
    const windowSeconds = RATE_LIMIT_WINDOW_SECONDS;

    const current = (await kv.get<number>(key)) ?? 0;
    const next = await kv.incr(key);
    if (current === 0) {
      await kv.expire(key, windowSeconds);
    }

    if (next > limit) {
      const reset = Date.now() + windowSeconds * MILLISECONDS_PER_SECOND;
      return {
        exceeded: true,
        headers: {
          'X-RateLimit-Limit': String(limit),
          'X-RateLimit-Remaining': String(Math.max(0, limit - next)),
          'X-RateLimit-Reset': String(reset),
        },
      };
    }
    return { exceeded: false };
  } catch (_e) {
    // Fail open if KV unavailable
    return { exceeded: false };
  }
}

async function tryOpenAISDK(
  client: OpenAI,
  vectorstoreId: string,
  query: string,
  k: number,
) {
  try {
    let rsp: any = null;

    const vs: any = (client as any)?.vectorStores;
    if (vs?.query) {
      rsp = await vs.query(vectorstoreId, { query, top_k: k });
    } else {
      const betaVs: any = (client as any)?.beta?.vectorStores;
      if (betaVs?.query) {
        rsp = await betaVs.query(vectorstoreId, { query, top_k: k });
      }
    }

    if (rsp && Array.isArray(rsp.data)) {
      return rsp.data.map(normalizeItem).sort(sortByScoreDesc);
    }
    return [];
  } catch (_e) {
    return [];
  }
}

async function tryDirectRestCall(
  vectorstoreId: string,
  query: string,
  k: number,
) {
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
        return data.data.map(normalizeItem).sort(sortByScoreDesc);
      }
    } catch (err) {
      lastErr = err;
    }
  }

  if (lastErr) {
    throw lastErr;
  }
  return [];
}

// Helper function to validate request inputs
function validateInputs(
  vectorstoreId?: string,
  query?: string,
):
  | { isValid: false; error: string; status: number }
  | { isValid: true; vectorstoreId: string; query: string } {
  const vectorstoreValidation = validateVectorstoreId(vectorstoreId);
  if (!vectorstoreValidation.isValid) {
    return {
      isValid: false as const,
      error: vectorstoreValidation.error,
      status: 400,
    };
  }

  const queryValidation = validateQuery(query);
  if (!queryValidation.isValid) {
    return {
      isValid: false as const,
      error: queryValidation.error,
      status: 400,
    };
  }

  return {
    isValid: true,
    vectorstoreId: vectorstoreValidation.vectorstoreId,
    query: queryValidation.query,
  };
}

// Helper function to create error response
function createErrorResponse(
  error: string,
  status: number,
  headers?: Record<string, string>,
) {
  const response = {
    results: [],
    error,
    status: 'error' as const,
  };

  return NextResponse.json(response, { status, headers });
}

// Helper function to perform vector search
async function performVectorSearch(
  vectorstoreId: string,
  query: string,
  k: number,
) {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  // Try SDK approach first
  let results = await tryOpenAISDK(client, vectorstoreId, query, k);

  // Fallback to direct REST call if SDK didn't work
  if (results.length === 0) {
    results = await tryDirectRestCall(vectorstoreId, query, k);
  }

  return results;
}

export async function POST(req: NextRequest) {
  try {
    // Require authenticated session to protect cost-sensitive vector queries
    const session = await auth();
    if (!session?.user?.id) {
      return createErrorResponse('Unauthorized', HTTP_STATUS_UNAUTHORIZED);
    }

    const { vectorstoreId, query, topK }: SearchBody = await req.json();

    // Validate inputs
    const validation = validateInputs(vectorstoreId, query);
    if (!validation.isValid) {
      return createErrorResponse(validation.error, validation.status);
    }

    const k = calculateTopK(topK);

    // Check rate limiting
    const rateLimitResult = await checkRateLimit(session, req);
    if (rateLimitResult.exceeded) {
      return createErrorResponse(
        'Rate limit exceeded. Please try again shortly.',
        HTTP_STATUS_TOO_MANY_REQUESTS,
        rateLimitResult.headers,
      );
    }

    // Perform vector search
    const results = await performVectorSearch(
      validation.vectorstoreId,
      validation.query,
      k,
    );

    return NextResponse.json({ results, status: 'success' });
  } catch (error: any) {
    // Map different error shapes to a single, friendly message without leaking secrets
    const friendly = deriveFriendlyError(error);
    return createErrorResponse(friendly, HTTP_STATUS_INTERNAL_SERVER_ERROR);
  }
}
