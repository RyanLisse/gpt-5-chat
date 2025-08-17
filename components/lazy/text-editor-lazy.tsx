'use client';

import { lazy, Suspense } from 'react';
import type { Suggestion } from '@/lib/db/schema';
import { TextEditorSkeleton } from '../loading-fallbacks';

// Lazy load the TextEditor component with its heavy Lexical dependencies
const TextEditorComponent = lazy(() =>
  import('../text-editor').then((module) => ({
    default: module.Editor,
  })),
);

type TextEditorLazyProps = {
  content: string;
  onSaveContent: (updatedContent: string, debounce: boolean) => void;
  status: 'streaming' | 'idle';
  isCurrentVersion: boolean;
  currentVersionIndex: number;
  suggestions: Suggestion[];
  isReadonly?: boolean;
};

export function TextEditorLazy(props: TextEditorLazyProps) {
  return (
    <Suspense fallback={<TextEditorSkeleton />}>
      <TextEditorComponent {...props} />
    </Suspense>
  );
}
