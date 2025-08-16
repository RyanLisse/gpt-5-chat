'use client';

import { Loader } from '@/components/ui/loader';
import type { SearchResult } from './page';

const SCORE_DECIMAL_PLACES = 4;

type SearchResultsProps = {
  results: SearchResult[];
  loading: boolean;
};

function LoadingState() {
  return (
    <div className="flex items-center gap-2 text-muted-foreground text-sm">
      <Loader variant="typing" /> Fetching results...
    </div>
  );
}

function EmptyState() {
  return (
    <p className="text-muted-foreground text-sm">
      No results yet. Submit a query.
    </p>
  );
}

function ResultsList({ results }: { results: SearchResult[] }) {
  return (
    <div className="space-y-3">
      <h2 className="font-medium text-lg">Results</h2>
      <ul className="space-y-3">
        {results.map((result, idx) => (
          <ResultItem key={`${result.document_id}-${idx}`} result={result} />
        ))}
      </ul>
    </div>
  );
}

function ResultItem({ result }: { result: SearchResult }) {
  return (
    <li className="rounded-md border p-3">
      <div className="mb-1 flex items-center justify-between">
        <span className="font-semibold text-sm">{result.document_id}</span>
        <span className="text-muted-foreground text-xs">
          Score: {result.score.toFixed(SCORE_DECIMAL_PLACES)}
        </span>
      </div>
      <pre className="whitespace-pre-wrap break-words text-sm">
        {result.content || '(no preview)'}
      </pre>
    </li>
  );
}

export function SearchResults({ results, loading }: SearchResultsProps) {
  return (
    <div className="mt-6 space-y-3">
      {loading && <LoadingState />}
      {!loading && results.length > 0 && <ResultsList results={results} />}
      {!loading && results.length === 0 && <EmptyState />}
    </div>
  );
}
