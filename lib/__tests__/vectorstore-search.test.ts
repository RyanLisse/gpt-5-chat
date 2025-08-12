import { describe, it, expect } from 'vitest';
import {
  normalizeItem,
  sortByScoreDesc,
  deriveFriendlyError,
} from '@/app/api/vectorstore-search/route';

describe('vectorstore-search helpers', () => {
  it('normalizeItem extracts common fields', () => {
    expect(
      normalizeItem({ document_id: 'doc-1', score: 0.9, content: 'alpha' }),
    ).toEqual({ document_id: 'doc-1', score: 0.9, content: 'alpha' });

    expect(
      normalizeItem({ id: 'doc-2', relevance: 0.5, text: 'beta' }),
    ).toEqual({ document_id: 'doc-2', score: 0.5, content: 'beta' });

    expect(
      normalizeItem({ file_id: 'doc-3', rank: 3, snippet: 'gamma' }),
    ).toEqual({ document_id: 'doc-3', score: 3, content: 'gamma' });

    // Unknown fields should fallback safely
    expect(normalizeItem({})).toEqual({ document_id: '', score: 0, content: '' });
  });

  it('sortByScoreDesc orders by descending score', () => {
    const arr = [
      { document_id: 'a', score: 0.1, content: '' },
      { document_id: 'b', score: 0.9, content: '' },
      { document_id: 'c', score: 0.5, content: '' },
    ];
    const sorted = [...arr].sort(sortByScoreDesc);
    expect(sorted.map((x) => x.document_id)).toEqual(['b', 'c', 'a']);
  });

  it('deriveFriendlyError maps known errors', () => {
    expect(deriveFriendlyError(new Error('401 Unauthorized'))).toBe(
      'Authentication failed. Check server OpenAI API key.',
    );
    expect(deriveFriendlyError(new Error('404 not found'))).toBe(
      'Vector store not found. Verify the ID.',
    );
    expect(deriveFriendlyError(new Error('Something else'))).toBe(
      'Unable to retrieve results. Please try again.',
    );
  });
});

