'use client';

import { CheckIcon, CopyIcon } from 'lucide-react';
import type { ComponentProps, ReactNode } from 'react';
import { type UseCopyOptions, useCopy } from '@/lib/hooks/use-copy';
import { cn } from '@/lib/utils';
import { Button } from './button';

export interface CopyButtonProps
  extends Omit<
      ComponentProps<typeof Button>,
      'onClick' | 'children' | 'onError'
    >,
    UseCopyOptions {
  /**
   * The text to copy to clipboard
   */
  text: string;
  /**
   * Custom children to render instead of default copy/check icons
   */
  children?: ReactNode;
  /**
   * Size of the default icons
   * @default 14
   */
  iconSize?: number;
  /**
   * Whether to include screen reader text
   * @default true
   */
  includeScreenReaderText?: boolean;
  /**
   * Custom screen reader text for copy state
   * @default "Copy"
   */
  copyLabel?: string;
  /**
   * Custom screen reader text for copied state
   * @default "Copied"
   */
  copiedLabel?: string;
}

/**
 * A universal copy button component that provides consistent UX across the app.
 * Consolidates copy functionality from CodeBlock, ButtonCopy, and MessageActions.
 *
 * Features:
 * - Automatic icon switching (copy → check)
 * - Configurable timeout and callbacks
 * - Screen reader accessibility
 * - Customizable appearance
 * - Compatible with all existing Button props
 */
export function CopyButton({
  text,
  children,
  iconSize = 14,
  includeScreenReaderText = true,
  copyLabel = 'Copy',
  copiedLabel = 'Copied',
  className,
  timeout,
  onSuccess,
  onError,
  ...buttonProps
}: CopyButtonProps) {
  const { isCopied, copy } = useCopy({
    timeout,
    onSuccess,
    onError,
  });

  const handleClick = () => {
    copy(text);
  };

  const Icon = isCopied ? CheckIcon : CopyIcon;

  return (
    <Button
      className={cn('shrink-0', className)}
      onClick={handleClick}
      {...buttonProps}
    >
      {children ?? <Icon size={iconSize} />}
      {includeScreenReaderText && (
        <span className="sr-only">{isCopied ? copiedLabel : copyLabel}</span>
      )}
    </Button>
  );
}
