import type { UseChatHelpers } from '@ai-sdk/react';
import type { RefObject } from 'react';
import { useCallback } from 'react';
import { useOnClickOutside } from 'usehooks-ts';
import type { ChatMessage } from '@/lib/ai/types';

type ToolbarInteractionsOptions = {
  toolbarRef: RefObject<HTMLDivElement | null>;
  setIsToolbarVisible: (visible: boolean) => void;
  setSelectedTool: (tool: string | null) => void;
  status: UseChatHelpers<ChatMessage>['status'];
  startCloseTimer: () => void;
  cancelCloseTimer: () => void;
};

export function useToolbarInteractions({
  toolbarRef,
  setIsToolbarVisible,
  setSelectedTool,
  status,
  startCloseTimer,
  cancelCloseTimer,
}: ToolbarInteractionsOptions) {
  useOnClickOutside(toolbarRef as React.RefObject<HTMLElement>, () => {
    setIsToolbarVisible(false);
    setSelectedTool(null);
  });

  const handleHoverEnd = useCallback(() => {
    if (status === 'streaming') {
      return;
    }
    startCloseTimer();
  }, [status, startCloseTimer]);

  const handleHoverStart = useCallback(() => {
    if (status === 'streaming') {
      return;
    }
    cancelCloseTimer();
    setIsToolbarVisible(true);
  }, [status, cancelCloseTimer, setIsToolbarVisible]);

  return {
    handleHoverEnd,
    handleHoverStart,
  };
}
