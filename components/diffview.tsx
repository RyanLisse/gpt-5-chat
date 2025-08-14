import React from 'react';
import { diffWords } from 'diff';

type DiffEditorProps = {
  oldContent: string;
  newContent: string;
};

export const DiffView = ({ oldContent, newContent }: DiffEditorProps) => {
  const changes = diffWords(oldContent || '', newContent || '');

  return (
    <div className="prose dark:prose-invert w-full text-left whitespace-pre-wrap">
      {changes.map((part, idx) => {
        const cls = part.added
          ? 'bg-green-100 text-green-700 dark:bg-green-500/70 dark:text-green-300'
          : part.removed
            ? 'bg-red-100 line-through text-red-600 dark:bg-red-500/70 dark:text-red-300'
            : '';
        return (
          <span key={idx} className={cls}>
            {part.value}
          </span>
        );
      })}
    </div>
  );
};
