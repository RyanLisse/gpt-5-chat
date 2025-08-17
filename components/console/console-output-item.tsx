import { cn } from '@/lib/utils';
import type { ConsoleOutput } from '../console';
import { LoaderIcon } from '../icons';

type ConsoleOutputItemProps = {
  consoleOutput: ConsoleOutput;
  index: number;
};

export function ConsoleOutputItem({
  consoleOutput,
  index,
}: ConsoleOutputItemProps) {
  return (
    <div
      className="flex flex-row border-zinc-200 border-b bg-zinc-50 px-4 py-2 font-mono text-sm dark:border-zinc-700 dark:bg-zinc-900"
      key={consoleOutput.id}
    >
      <ConsoleLineNumber index={index} status={consoleOutput.status} />
      <ConsoleContent consoleOutput={consoleOutput} />
    </div>
  );
}

type ConsoleLineNumberProps = {
  status: ConsoleOutput['status'];
  index: number;
};

function ConsoleLineNumber({ status, index }: ConsoleLineNumberProps) {
  return (
    <div
      className={cn('w-12 shrink-0', {
        'text-muted-foreground': ['in_progress', 'loading_packages'].includes(
          status,
        ),
        'text-emerald-500': status === 'completed',
        'text-red-400': status === 'failed',
      })}
    >
      [{index + 1}]
    </div>
  );
}

type ConsoleContentProps = {
  consoleOutput: ConsoleOutput;
};

function ConsoleContent({ consoleOutput }: ConsoleContentProps) {
  const isInProgress = ['in_progress', 'loading_packages'].includes(
    consoleOutput.status,
  );

  if (isInProgress) {
    return <ConsoleProgressContent consoleOutput={consoleOutput} />;
  }

  return <ConsoleCompletedContent consoleOutput={consoleOutput} />;
}

function ConsoleProgressContent({ consoleOutput }: ConsoleContentProps) {
  const getProgressText = () => {
    if (consoleOutput.status === 'in_progress') {
      return 'Initializing...';
    }
    if (consoleOutput.status === 'loading_packages') {
      return consoleOutput.contents
        .filter((content) => content.type === 'text')
        .map((content) => content.value);
    }
    return null;
  };

  return (
    <div className="flex flex-row gap-2">
      <div className="mt-0.5 mb-auto size-fit animate-spin self-center">
        <LoaderIcon />
      </div>
      <div className="text-muted-foreground">{getProgressText()}</div>
    </div>
  );
}

function ConsoleCompletedContent({ consoleOutput }: ConsoleContentProps) {
  return (
    <div className="flex w-full flex-col gap-2 overflow-x-scroll text-zinc-900 dark:text-zinc-50">
      {consoleOutput.contents.map((content, index) =>
        content.type === 'image' ? (
          <ConsoleImageContent
            key={`${consoleOutput.id}-${index}`}
            src={content.value}
          />
        ) : (
          <ConsoleTextContent
            key={`${consoleOutput.id}-${index}`}
            text={content.value}
          />
        ),
      )}
    </div>
  );
}

type ConsoleImageContentProps = {
  src: string;
};

function ConsoleImageContent({ src }: ConsoleImageContentProps) {
  return (
    <picture>
      <img
        alt="output"
        className="w-full max-w-(--breakpoint-toast-mobile) rounded-md"
        height={300}
        src={src}
        width={400}
      />
    </picture>
  );
}

type ConsoleTextContentProps = {
  text: string;
};

function ConsoleTextContent({ text }: ConsoleTextContentProps) {
  return <div className="w-full whitespace-pre-line break-words">{text}</div>;
}
