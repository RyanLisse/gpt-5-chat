'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

type LexicalChatInputRef = {
  focus: () => void;
  clear: () => void;
  getValue: () => string;
};

type LexicalChatInputProps = {
  initialValue?: string;
  onInputChange?: (value: string) => void;
  onKeyDown?: (event: React.KeyboardEvent<HTMLDivElement>) => void;
  onPaste?: (event: React.ClipboardEvent<HTMLDivElement>) => void;
  onEnterSubmit?: (event: KeyboardEvent) => boolean;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
  maxRows?: number;
  'data-testid'?: string;
};

export const LexicalChatInput = React.forwardRef<
  LexicalChatInputRef,
  LexicalChatInputProps
>(
  (
    {
      initialValue = '',
      onInputChange,
      onKeyDown,
      onPaste,
      onEnterSubmit,
      placeholder = 'Type a message...',
      autoFocus: _autoFocus = false,
      className,
      'data-testid': testId,
    },
    ref,
  ) => {
    // Simple state management for textarea
    const [value, setValue] = React.useState(initialValue);
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);

    const handleChange = React.useCallback(
      (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newValue = e.target.value;
        setValue(newValue);
        onInputChange?.(newValue);
      },
      [onInputChange],
    );

    const handleKeyDown = React.useCallback(
      (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        onKeyDown?.(e as any);
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          onEnterSubmit?.(e.nativeEvent);
        }
      },
      [onKeyDown, onEnterSubmit],
    );

    // Expose imperative methods via ref
    React.useImperativeHandle(
      ref,
      () => ({
        focus: () => {
          textareaRef.current?.focus();
        },
        clear: () => {
          setValue('');
          onInputChange?.('');
        },
        getValue: () => {
          return value;
        },
      }),
      [value, onInputChange],
    );

    // Update value when initialValue changes
    React.useEffect(() => {
      setValue(initialValue);
    }, [initialValue]);

    return (
      <div className="lexical-editor-container">
        <textarea
          ref={textareaRef}
          className={cn(
            'focus:outline-hidden focus-visible:outline-hidden',
            'min-h-[20px] outline-hidden resize-none',
            'editor-input w-full bg-transparent',
            className,
          )}
          data-testid={testId}
          onKeyDown={handleKeyDown}
          onPaste={onPaste as any}
          onChange={handleChange}
          value={value}
          spellCheck={true}
          placeholder={placeholder}
          style={{
            WebkitBoxShadow: 'none',
            MozBoxShadow: 'none',
            boxShadow: 'none',
          }}
          rows={1}
        />
      </div>
    );
  },
);

LexicalChatInput.displayName = 'LexicalChatInput';

export type { LexicalChatInputRef };
