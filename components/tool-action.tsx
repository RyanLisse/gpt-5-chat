import { motion } from 'motion/react';
import React from 'react';
import { cn } from '@/lib/utils';
import { Favicon } from './favicon';

// ToolActionKind component
const ToolActionKind = React.forwardRef<
  HTMLDivElement,
  {
    icon: React.ReactNode;
    name: string;
    className?: string;
  }
>(({ icon, name, className, ...props }, ref) => {
  return (
    <div className={cn('flex shrink-0 gap-1', className)} ref={ref} {...props}>
      {icon}
      <span className="text-foreground/80 text-xs">{name}</span>
    </div>
  );
});
ToolActionKind.displayName = 'ToolActionKind';

// ToolActionContent component
const ToolActionContent = React.forwardRef<
  HTMLDivElement,
  {
    title: string;
    faviconUrl?: string;
    className?: string;
  }
>(({ title, faviconUrl, className, ...props }, ref) => {
  return (
    <div
      className={cn('flex items-center gap-2', className)}
      ref={ref}
      {...props}
    >
      <h4 className="max-w-[200px] truncate text-muted-foreground/80 text-sm leading-tight sm:max-w-[300px]">
        {title}
      </h4>
      {faviconUrl && (
        <Favicon
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
            target.nextElementSibling?.classList.remove('hidden');
          }}
          url={faviconUrl}
        />
      )}
    </div>
  );
});
ToolActionContent.displayName = 'ToolActionContent';

// ToolActionContainer component
const ToolActionContainer = React.forwardRef<
  HTMLAnchorElement,
  {
    href: string;
    children: React.ReactNode;
    className?: string;
  }
>(({ href, children, className, ...props }, ref) => {
  return (
    <motion.a
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'flex w-fit flex-row items-center justify-start gap-3 rounded-full border bg-muted/50 px-2.5 py-1 transition-colors hover:bg-accent/20',
        className,
      )}
      href={href}
      initial={{ opacity: 0, y: 10 }}
      ref={ref}
      rel="noopener noreferrer"
      target="_blank"
      transition={{ delay: 0.05 }}
      {...props}
    >
      {children}
    </motion.a>
  );
});
ToolActionContainer.displayName = 'ToolActionContainer';

// Export all components
export { ToolActionContainer, ToolActionKind, ToolActionContent };
