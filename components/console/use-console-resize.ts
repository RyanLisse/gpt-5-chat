import { useCallback, useEffect, useState } from 'react';

export type UseConsoleResizeOptions = {
  initialHeight?: number;
  minHeight?: number;
  maxHeight?: number;
};

export const useConsoleResize = (options: UseConsoleResizeOptions = {}) => {
  const { initialHeight = 300, minHeight = 100, maxHeight = 800 } = options;

  const [height, setHeight] = useState<number>(initialHeight);
  const [isResizing, setIsResizing] = useState(false);

  const startResizing = useCallback(() => {
    setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback(
    (e: MouseEvent) => {
      if (isResizing) {
        const newHeight = window.innerHeight - e.clientY;
        if (newHeight >= minHeight && newHeight <= maxHeight) {
          setHeight(newHeight);
        }
      }
    },
    [isResizing, minHeight, maxHeight],
  );

  useEffect(() => {
    window.addEventListener('mousemove', resize);
    window.addEventListener('mouseup', stopResizing);
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [resize, stopResizing]);

  return {
    height,
    isResizing,
    startResizing,
    minHeight,
    maxHeight,
  };
};
