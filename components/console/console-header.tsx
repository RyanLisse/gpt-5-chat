import { CrossSmallIcon, TerminalWindowIcon } from '../icons';
import { Button } from '../ui/button';

type ConsoleHeaderProps = {
  onClear: () => void;
};

export function ConsoleHeader({ onClear }: ConsoleHeaderProps) {
  return (
    <div className="sticky top-0 z-50 flex h-fit w-full flex-row items-center justify-between border-zinc-200 border-b bg-muted px-2 py-1 dark:border-zinc-700">
      <div className="flex flex-row items-center gap-3 pl-2 text-sm text-zinc-800 dark:text-zinc-50">
        <div className="text-muted-foreground">
          <TerminalWindowIcon />
        </div>
        <div>Console</div>
      </div>
      <Button
        className="size-fit p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700"
        onClick={onClear}
        size="icon"
        variant="ghost"
      >
        <CrossSmallIcon />
      </Button>
    </div>
  );
}
