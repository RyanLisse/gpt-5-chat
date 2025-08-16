'use client';

import { useState } from 'react';
import { SearchForm } from './search-form';
import { SearchResults } from './search-results';

// This page provides a basic UI for querying an OpenAI Vector Store by ID.
// - Users enter a Vector Store ID and a search query.
// - Client-side validation ensures non-empty inputs.
// - On submit, we call our server API route which talks to OpenAI securely.
// - Results are displayed ordered by descending score (server also enforces this).

export type SearchResult = {
  document_id: string;
  score: number;
  content: string;
};

export type ApiResponse = {
  results: SearchResult[];
  error?: string;
  status: 'success' | 'error';
};

export default function VectorStoreSearchPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<SearchResult[]>([]);

  const handleSearch = async (searchParams: {
    vectorstoreId: string;
    query: string;
    topK: number;
  }) => {
    setError(null);
    setResults([]);
    setLoading(true);

    try {
      const response = await fetch('/api/vectorstore-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(searchParams),
      });

      const data: ApiResponse = await response.json();

      if (data.status === 'error') {
        setError(data.error || 'Search failed.');
        return;
      }

      setResults(Array.isArray(data.results) ? data.results : []);
    } catch {
      setError('Unable to fetch results. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 font-semibold text-2xl">Vector Store Search</h1>

      <SearchForm error={error} loading={loading} onSearch={handleSearch} />

      <SearchResults loading={loading} results={results} />
    </div>
  );
}
