import { CheckCircle } from '@phosphor-icons/react/CheckCircle';
import { ChevronDown, Loader2, type LucideIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type CollapsibleSectionHeaderProps = {
  title?: string;
  IconComponent: LucideIcon | null;
  status?: 'running' | 'completed';
  isExpanded: boolean;
  onClick: () => void;
};

function StatusBadge({ status }: { status: 'running' | 'completed' }) {
  return (
    <Badge
      className={cn(
        'flex w-fit items-center gap-1.5 px-1.5 py-0.5 text-xs',
        status === 'running'
          ? 'bg-blue-50/50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
          : 'bg-green-50/50 text-green-600 dark:bg-green-900/20 dark:text-green-400',
      )}
      variant="secondary"
    >
      {status === 'running' ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <CheckCircle className="h-3 w-3" />
      )}
      {status === 'running' ? 'Running' : 'Done'}
    </Badge>
  );
}

function HeaderIcon({ IconComponent }: { IconComponent: LucideIcon | null }) {
  if (!IconComponent) {
    return null;
  }

  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-100 dark:bg-neutral-800">
      <IconComponent className="h-4 w-4 text-primary" />
    </div>
  );
}

export function CollapsibleSectionHeader({
  title,
  IconComponent,
  status,
  isExpanded,
  onClick,
}: CollapsibleSectionHeaderProps) {
  const contentId = title
    ? `collapsible-content-${title.replace(/\s+/g, '-').toLowerCase()}`
    : undefined;

  return (
    <button
      aria-controls={contentId}
      aria-expanded={isExpanded}
      className="flex w-full cursor-pointer items-center justify-between bg-white px-4 py-3 text-left transition-colors hover:bg-neutral-50 dark:bg-neutral-900 dark:hover:bg-neutral-800/50"
      onClick={onClick}
      type="button"
    >
      <div className="flex items-center gap-3">
        <HeaderIcon IconComponent={IconComponent} />
        <h3 className="font-medium text-neutral-900 text-sm dark:text-neutral-100">
          {title}
        </h3>
      </div>
      <div className="flex items-center gap-2">
        {status && <StatusBadge status={status} />}
        <ChevronDown
          className={cn(
            'h-4 w-4 transition-transform duration-200',
            !isExpanded && 'rotate-180',
          )}
        />
      </div>
    </button>
  );
}
