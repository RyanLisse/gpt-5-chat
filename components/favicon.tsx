import Image from 'next/image';
import type React from 'react';
import { cn } from '@/lib/utils';

export function Favicon({
  url,
  className,
  alt,
  ...props
}: {
  url: string;
  className?: string;
  alt?: string;
} & Omit<
  React.ImgHTMLAttributes<HTMLImageElement>,
  'src' | 'width' | 'height'
>) {
  return (
    <Image
      className={cn('h-4 w-4', className)}
      src={url}
      width={16}
      height={16}
      alt={alt || `Favicon for ${url}`}
      onError={(e) => {
        const target = e.target as HTMLImageElement;
        target.style.display = 'none';
        target.nextElementSibling?.classList.remove('hidden');
      }}
      {...props}
    />
  );
}
