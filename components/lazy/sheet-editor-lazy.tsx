'use client';

import { lazy, Suspense } from 'react';
import { SheetEditorSkeleton } from '../loading-fallbacks';

// Lazy load the SheetEditor component with its heavy react-data-grid dependency
const SheetEditorComponent = lazy(() =>
  import('../sheet-editor').then((module) => ({
    default: module.SpreadsheetEditor,
  })),
);

type SheetEditorLazyProps = {
  content: string;
  saveContent: (content: string, isCurrentVersion: boolean) => void;
  status: string;
  isCurrentVersion: boolean;
  currentVersionIndex: number;
  isReadonly?: boolean;
};

export function SheetEditorLazy(props: SheetEditorLazyProps) {
  return (
    <Suspense fallback={<SheetEditorSkeleton />}>
      <SheetEditorComponent {...props} />
    </Suspense>
  );
}
