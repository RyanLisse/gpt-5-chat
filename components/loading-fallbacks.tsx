import { Skeleton } from './ui/skeleton';

// Loading fallback for MultimodalInput
export function MultimodalInputSkeleton() {
  return (
    <div className="relative mx-auto flex w-full flex-col gap-4 bg-background p-2 @[400px]:px-4 @[400px]:pb-4 md:max-w-3xl @[400px]:md:pb-6">
      <div className="relative">
        <div className="flex min-h-[120px] w-full flex-col rounded-2xl border bg-background p-3">
          <Skeleton className="h-20 w-full" />
          <div className="flex w-full min-w-0 flex-row justify-between pt-2">
            <div className="flex min-w-0 flex-0 items-center gap-2">
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-8 w-16" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-8 w-8" />
              <Skeleton className="h-8 w-8" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Loading fallback for ModelSelector
export function ModelSelectorSkeleton() {
  return <Skeleton className="h-8 w-32" />;
}

// Loading fallback for CodeEditor
export function CodeEditorSkeleton() {
  return (
    <div className="h-full w-full rounded-lg border">
      <Skeleton className="h-full w-full" />
    </div>
  );
}

// Loading fallback for SheetEditor
export function SheetEditorSkeleton() {
  return (
    <div className="h-full w-full">
      <div className="grid h-full w-full gap-1 p-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div className="flex gap-1" key={i}>
            {Array.from({ length: 6 }).map((_, j) => (
              <Skeleton className="h-8 w-20" key={j} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// Loading fallback for TextEditor
export function TextEditorSkeleton() {
  return (
    <div className="h-full w-full p-4">
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  );
}

// Loading fallback for Artifact
export function ArtifactSkeleton() {
  return (
    <div className="flex h-full w-full">
      <div className="flex h-full w-1/2 flex-col border-r">
        <div className="flex flex-row items-start justify-between bg-background/80 p-2">
          <div className="flex flex-row items-start gap-4">
            <Skeleton className="h-6 w-6" />
            <div className="flex flex-col gap-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-8" />
          </div>
        </div>
        <div className="flex-1">
          <Skeleton className="h-full w-full" />
        </div>
      </div>
      <div className="flex h-full w-1/2 flex-col">
        <Skeleton className="h-full w-full" />
      </div>
    </div>
  );
}
