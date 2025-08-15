'use client';

import { ChevronDown, ExternalLink, Globe, TextIcon } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

type RetrieveResult = {
  error?: string;
  results: {
    title: string;
    content: string;
    url: string;
    description: string;
    language: string;
    error?: string;
  }[];
};

export function Retrieve({ result }: { result?: RetrieveResult }) {
  if (!result) {
    return (
      <div className="my-4 rounded-xl border border-neutral-200 bg-gradient-to-b from-white to-neutral-50 p-4 dark:border-neutral-800 dark:from-neutral-900 dark:to-neutral-900/90">
        <div className="flex items-center gap-4">
          <div className="relative h-10 w-10">
            <div className="absolute inset-0 animate-pulse rounded-full bg-primary/10" />
            <Globe className="absolute inset-0 m-auto h-5 w-5 text-primary/70" />
          </div>
          <div className="flex-1 space-y-2">
            <div className="h-4 w-36 animate-pulse rounded-md bg-neutral-200 dark:bg-neutral-800" />
            <div className="space-y-1.5">
              <div className="h-3 w-full animate-pulse rounded-md bg-neutral-100 dark:bg-neutral-800/50" />
              <div className="h-3 w-2/3 animate-pulse rounded-md bg-neutral-100 dark:bg-neutral-800/50" />
            </div>
          </div>
        </div>
      </div>
    );
  }
  // Update the error message UI with better dark mode border visibility
  if (result.error || result.results?.[0]?.error) {
    const errorMessage = result.error || result.results?.[0]?.error;
    return (
      <div className="my-4 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-500 dark:bg-red-950/50">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/50">
            <Globe className="h-4 w-4 text-red-600 dark:text-red-300" />
          </div>
          <div>
            <div className="font-medium text-red-700 text-sm dark:text-red-300">
              Error retrieving content
            </div>
            <div className="mt-1 text-red-600/80 text-xs dark:text-red-400/80">
              {errorMessage}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Update the "no content" message UI with better dark mode border visibility
  if (!result.results || result.results.length === 0) {
    return (
      <div className="my-4 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500 dark:bg-amber-950/50">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/50">
            <Globe className="h-4 w-4 text-amber-600 dark:text-amber-300" />
          </div>
          <div className="font-medium text-amber-700 text-sm dark:text-amber-300">
            No content available
          </div>
        </div>
      </div>
    );
  }

  // Existing rendering for successful retrieval:
  return (
    <div className="my-4 overflow-hidden rounded-xl border border-neutral-200 bg-gradient-to-b from-white to-neutral-50 dark:border-neutral-800 dark:from-neutral-900 dark:to-neutral-900/90">
      <div className="p-4">
        <div className="flex items-start gap-4">
          <div className="relative h-10 w-10 flex-shrink-0">
            <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-primary/10 to-transparent" />
            <img
              alt=""
              className="absolute inset-0 m-auto h-5 w-5"
              onError={(e) => {
                e.currentTarget.src =
                  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' width='24' height='24'%3E%3Cpath fill='none' d='M0 0h24v24H0z'/%3E%3Cpath d='M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm-2.29-2.333A17.9 17.9 0 0 1 8.027 13H4.062a8.008 8.008 0 0 0 5.648 6.667zM10.03 13c.151 2.439.848 4.73 1.97 6.752A15.905 15.905 0 0 0 13.97 13h-3.94zm9.908 0h-3.965a17.9 17.9 0 0 1-1.683 6.667A8.008 8.008 0 0 0 19.938 13zM4.062 11h3.965A17.9 17.9 0 0 1 9.71 4.333 8.008 8.008 0 0 0 4.062 11zm5.969 0h3.938A15.905 15.905 0 0 0 12 4.248 15.905 15.905 0 0 0 10.03 11zm4.259-6.667A17.9 17.9 0 0 1 15.938 11h3.965a8.008 8.008 0 0 0-5.648-6.667z' fill='rgba(128,128,128,0.5)'/%3E%3C/svg%3E";
              }}
              src={`https://www.google.com/s2/favicons?sz=64&domain_url=${encodeURIComponent(result.results[0].url)}`}
            />
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <h2 className="truncate font-semibold text-lg text-neutral-900 tracking-tight dark:text-neutral-100">
              {result.results[0].title || 'Retrieved Content'}
            </h2>
            <p className="line-clamp-2 text-neutral-600 text-sm dark:text-neutral-400">
              {result.results[0].description || 'No description available'}
            </p>
            <div className="flex items-center gap-3">
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 font-medium text-primary text-xs">
                {result.results[0].language || 'Unknown'}
              </span>
              <a
                className="inline-flex items-center gap-1.5 text-neutral-500 text-xs transition-colors hover:text-primary"
                href={result.results[0].url}
                rel="noopener noreferrer"
                target="_blank"
              >
                <ExternalLink className="h-3 w-3" />
                View source
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="border-neutral-200 border-t dark:border-neutral-800">
        <details className="group">
          <summary className="flex w-full cursor-pointer items-center justify-between px-4 py-2 text-neutral-700 text-sm transition-colors hover:bg-neutral-50 dark:text-neutral-300 dark:hover:bg-neutral-800/50">
            <div className="flex items-center gap-2">
              <TextIcon className="h-4 w-4 text-neutral-400" />
              <span>View content</span>
            </div>
            <ChevronDown className="h-4 w-4 transition-transform duration-200 group-open:rotate-180" />
          </summary>
          <div className="max-h-[50vh] overflow-y-auto bg-neutral-50/50 p-4 dark:bg-neutral-800/30">
            <div className="prose prose-neutral dark:prose-invert prose-sm max-w-none">
              <ReactMarkdown>
                {result.results[0].content || 'No content available'}
              </ReactMarkdown>
            </div>
          </div>
        </details>
      </div>
    </div>
  );
}
