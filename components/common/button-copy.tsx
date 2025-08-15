'use client';

import { Check, Copy } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type ButtonCopyProps = {
  code: string;
  className?: string;
};

export function ButtonCopy({ code, className }: ButtonCopyProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (_err) {}
  };

  return (
    <Button
      className={cn(
        'h-8 w-8 p-0 text-muted-foreground hover:text-foreground',
        className,
      )}
      onClick={handleCopy}
      size="sm"
      variant="ghost"
    >
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      <span className="sr-only">{copied ? 'Copied' : 'Copy code'}</span>
    </Button>
  );
}
