'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader } from '@/components/ui/loader';

const DEFAULT_TOP_K = 5;

type SearchFormProps = {
  onSearch: (params: {
    vectorstoreId: string;
    query: string;
    topK: number;
  }) => void;
  loading: boolean;
  error: string | null;
};

export function SearchForm({ onSearch, loading, error }: SearchFormProps) {
  const [vectorstoreId, setVectorstoreId] = useState('');
  const [query, setQuery] = useState('');
  const [topK, setTopK] = useState(String(DEFAULT_TOP_K));

  const validateInputs = () => {
    if (!vectorstoreId.trim()) {
      throw new Error('Please enter a vector store ID.');
    }
    if (!query.trim()) {
      throw new Error('Please enter a search query.');
    }
  };

  const parseTopK = () => {
    return Number.isFinite(Number(topK)) && Number(topK) > 0
      ? Math.floor(Number(topK))
      : DEFAULT_TOP_K;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    try {
      validateInputs();
      const k = parseTopK();
      onSearch({ vectorstoreId, query, topK: k });
    } catch (_validationError) {
      // Validation errors are handled by parent component through error prop
    }
  };

  return (
    <form className="space-y-4 rounded-lg border p-4" onSubmit={handleSubmit}>
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

        {error && <span className="text-destructive text-sm">{error}</span>}
      </div>
    </form>
  );
}
