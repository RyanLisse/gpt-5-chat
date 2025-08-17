'use client';

import { CopyButton } from '@/components/ui/copy-button';
import { cn } from '@/lib/utils';

type ButtonCopyProps = {
  code: string;
  className?: string;
};

export function ButtonCopy({ code, className }: ButtonCopyProps) {
  return (
    <CopyButton
      className={cn(
        'h-8 w-8 p-0 text-muted-foreground hover:text-foreground',
        className,
      )}
      copyLabel="Copy code"
      iconSize={16}
      size="sm"
      text={code}
      timeout={2000}
      variant="ghost"
    />
  );
}
