import { diffWords } from 'diff';
import React from 'react';

type DiffEditorProps = {
  oldContent: string;
  newContent: string;
};

export const DiffView = ({ oldContent, newContent }: DiffEditorProps) => {
  const changes = diffWords(oldContent || '', newContent || '');

  return (
    <div className="prose dark:prose-invert w-full whitespace-pre-wrap text-left">
      {changes.map((part, idx) => {
        const cls = part.added
          ? 'bg-green-100 text-green-700 dark:bg-green-500/70 dark:text-green-300'
          : part.removed
            ? 'bg-red-100 line-through text-red-600 dark:bg-red-500/70 dark:text-red-300'
            : '';
        return (
          <span className={cls} key={idx}>
            {part.value}
          </span>
        );
      })}
    </div>
  );
};
