import { type Dispatch, type SetStateAction, useEffect } from 'react';
import { useArtifactSelector } from '@/hooks/use-artifact';
import { cn } from '@/lib/utils';
import { ConsoleContent } from './console/console-content';
import { ConsoleHeader } from './console/console-header';
import { useConsoleResize } from './console/use-console-resize';

export type ConsoleOutputContent = {
  type: 'text' | 'image';
  value: string;
};

export type ConsoleOutput = {
  id: string;
  status: 'in_progress' | 'loading_packages' | 'completed' | 'failed';
  contents: ConsoleOutputContent[];
};

type ConsoleProps = {
  consoleOutputs: ConsoleOutput[];
  setConsoleOutputs: Dispatch<SetStateAction<ConsoleOutput[]>>;
};

export function Console({ consoleOutputs, setConsoleOutputs }: ConsoleProps) {
  const { height, isResizing, startResizing, minHeight } = useConsoleResize();
  const isArtifactVisible = useArtifactSelector((state) => state.isVisible);

  useEffect(() => {
    if (!isArtifactVisible) {
      setConsoleOutputs([]);
    }
  }, [isArtifactVisible, setConsoleOutputs]);

  if (consoleOutputs.length === 0) {
    return null;
  }

  return (
    <>
      <div
        aria-valuenow={minHeight}
        className="fixed z-50 h-2 w-full cursor-ns-resize"
        onMouseDown={startResizing}
        role="slider"
        style={{ bottom: height - 4 }}
      />

      <div
        className={cn(
          'fixed bottom-0 z-40 flex w-full flex-col overflow-x-hidden overflow-y-scroll border-zinc-200 border-t bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900',
          {
            'select-none': isResizing,
          },
        )}
        style={{ height }}
      >
        <ConsoleHeader onClear={() => setConsoleOutputs([])} />
        <ConsoleContent consoleOutputs={consoleOutputs} />
      </div>
    </>
  );
}
