'use client';

import { useCallback, useState } from 'react';

export type UseCopyOptions = {
  /**
   * Duration in milliseconds to show the "copied" state
   * @default 2000
   */
  timeout?: number;
  /**
   * Callback fired when copy operation succeeds
   */
  onSuccess?: (text: string) => void;
  /**
   * Callback fired when copy operation fails
   */
  onError?: (error: Error) => void;
};

export type UseCopyReturn = {
  /**
   * Whether the text was recently copied (shows success state)
   */
  isCopied: boolean;
  /**
   * Copy text to clipboard
   */
  copy: (text: string) => Promise<void>;
  /**
   * Reset the copied state manually
   */
  reset: () => void;
};

/**
 * A consolidated copy-to-clipboard hook that merges functionality from
 * multiple existing copy implementations across the codebase.
 *
 * Features:
 * - Automatic clipboard API detection
 * - Configurable success state timeout
 * - Success/error callbacks
 * - Manual state reset
 */
export function useCopy(options: UseCopyOptions = {}): UseCopyReturn {
  const { timeout = 2000, onSuccess, onError } = options;
  const [isCopied, setIsCopied] = useState(false);

  const copy = useCallback(
    async (text: string) => {
      // Check if clipboard API is available
      if (typeof window === 'undefined' || !navigator.clipboard?.writeText) {
        const error = new Error('Clipboard API not available');
        onError?.(error);
        return;
      }

      try {
        await navigator.clipboard.writeText(text);
        setIsCopied(true);
        onSuccess?.(text);

        // Auto-reset after timeout
        setTimeout(() => setIsCopied(false), timeout);
      } catch (error) {
        onError?.(error as Error);
      }
    },
    [timeout, onSuccess, onError],
  );

  const reset = useCallback(() => {
    setIsCopied(false);
  }, []);

  return {
    isCopied,
    copy,
    reset,
  };
}
