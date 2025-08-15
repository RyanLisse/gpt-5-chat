import { WithSkeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <WithSkeleton className="h-full w-full" isLoading={true}>
      <div className="flex h-screen w-full" />
    </WithSkeleton>
  );
}
