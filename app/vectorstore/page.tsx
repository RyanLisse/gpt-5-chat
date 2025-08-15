'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader } from '@/components/ui/loader';

// This page provides a basic UI for querying an OpenAI Vector Store by ID.
// - Users enter a Vector Store ID and a search query.
// - Client-side validation ensures non-empty inputs.
// - On submit, we call our server API route which talks to OpenAI securely.
// - Results are displayed ordered by descending score (server also enforces this).

type SearchResult = {
  document_id: string;
  score: number;
  content: string;
};

type ApiResponse = {
  results: SearchResult[];
  error?: string;
  status: 'success' | 'error';
};

export default function VectorStoreSearchPage() {
  // Local UI state for inputs
  const [vectorstoreId, setVectorstoreId] = useState('');
  const [query, setQuery] = useState('');
  const DEFAULT_TOP_K = 5;
  const [topK, setTopK] = useState(String(DEFAULT_TOP_K));

  // Request / UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<SearchResult[]>([]);

  // Form submission handler
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResults([]);

    // Client-side validation: ensure non-empty Vector Store ID and query
    if (!vectorstoreId.trim()) {
      setError('Please enter a vector store ID.');
      return;
    }
    if (!query.trim()) {
      setError('Please enter a search query.');
      return;
    }

    // Parse topK into a number with safe defaults
    const k =
      Number.isFinite(Number(topK)) && Number(topK) > 0
        ? Math.floor(Number(topK))
        : DEFAULT_TOP_K;

    try {
      setLoading(true);
      // Call our API route (server performs the secure OpenAI request)
      const rsp = await fetch('/api/vectorstore-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vectorstoreId, query, topK: k }),
      });

      const data: ApiResponse = await rsp.json();

      // Show error message if the server reported an error
      if (data.status === 'error') {
        setError(data.error || 'Search failed.');
        setResults([]);
        return;
      }

      // Otherwise render results (already sorted by server; we keep it as-is)
      setResults(Array.isArray(data.results) ? data.results : []);
    } catch (_err: any) {
      // Graceful error handling with friendly message
      setError('Unable to fetch results. Please try again.');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 font-semibold text-2xl">Vector Store Search</h1>

      <form className="space-y-4 rounded-lg border p-4" onSubmit={onSubmit}>
        {/* Vector Store ID input (required) */}
        <div className="space-y-2">
          <Label htmlFor="vectorstoreId">Vector Store ID</Label>
          <Input
            id="vectorstoreId"
            onChange={(e) => setVectorstoreId(e.target.value)}
            placeholder="vs_..."
            required
            value={vectorstoreId}
          />
        </div>

        {/* Query input (required) */}
        <div className="space-y-2">
          <Label htmlFor="query">Search Query</Label>
          <Input
            id="query"
            onChange={(e) => setQuery(e.target.value)}
            placeholder="What do you want to find?"
            required
            value={query}
          />
        </div>

        {/* Optional: topK */}
        <div className="space-y-2">
          <Label htmlFor="topK">Top K (optional)</Label>
          <Input
            id="topK"
            max={50}
            min={1}
            onChange={(e) => setTopK(e.target.value)}
            type="number"
            value={topK}
          />
        </div>

        <div className="flex items-center gap-3">
          <Button disabled={loading} type="submit">
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <Loader variant="dots" /> Searching
              </span>
            ) : (
              'Search'
            )}
          </Button>

          {/* Inline error text when present */}
          {error ? (
            <span className="text-destructive text-sm">{error}</span>
          ) : null}
        </div>
      </form>

      {/* Results list */}
      <div className="mt-6 space-y-3">
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader variant="typing" /> Fetching results...
          </div>
        ) : results.length > 0 ? (
          <div className="space-y-3">
            <h2 className="font-medium text-lg">Results</h2>
            <ul className="space-y-3">
              {results.map((r, idx) => (
                <li
                  className="rounded-md border p-3"
                  key={`${r.document_id}-${idx}`}
                >
                  <div className="mb-1 flex items-center justify-between">
                    <span className="font-semibold text-sm">
                      {r.document_id}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      Score: {r.score.toFixed(4)}
                    </span>
                  </div>
                  <pre className="whitespace-pre-wrap break-words text-sm">
                    {r.content || '(no preview)'}
                  </pre>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">
            No results yet. Submit a query.
          </p>
        )}
      </div>
    </div>
  );
}
