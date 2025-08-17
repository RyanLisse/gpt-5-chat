'use client';

import { lazy, Suspense } from 'react';
import type { Suggestion } from '@/lib/db/schema';
import { CodeEditorSkeleton } from '../loading-fallbacks';

// Lazy load the CodeEditor component with its heavy CodeMirror dependencies
const CodeEditorComponent = lazy(() =>
  import('../code-editor').then((module) => ({
    default: module.CodeEditor,
  })),
);

type CodeEditorLazyProps = {
  content: string;
  onSaveContent: (updatedContent: string, debounce: boolean) => void;
  status: 'streaming' | 'idle';
  isCurrentVersion: boolean;
  currentVersionIndex: number;
  suggestions: Suggestion[];
  isReadonly?: boolean;
  language?: string;
};

export function CodeEditorLazy(props: CodeEditorLazyProps) {
  return (
    <Suspense fallback={<CodeEditorSkeleton />}>
      <CodeEditorComponent {...props} />
    </Suspense>
  );
}
