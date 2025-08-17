import { useEffect, useRef } from 'react';

export function useToolbarTimer(
  setSelectedTool: (tool: string | null) => void,
  setIsToolbarVisible: (visible: boolean) => void,
) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startCloseTimer = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setSelectedTool(null);
      setIsToolbarVisible(false);
    }, 2000);
  };

  const cancelCloseTimer = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    startCloseTimer,
    cancelCloseTimer,
  };
}
