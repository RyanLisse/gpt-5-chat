import { Check, Copy } from 'lucide-react';
import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type CollapsibleSectionTabsProps = {
  activeTab: 'code' | 'output';
  onTabChange: (tab: 'code' | 'output') => void;
  hasOutput: boolean;
  onCopy: (e: React.MouseEvent) => void;
  copied: boolean;
};

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      className={cn(
        'px-4 py-2 font-medium text-sm transition-colors',
        active
          ? 'border-primary border-b-2 text-primary'
          : 'text-neutral-600 dark:text-neutral-400',
      )}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function CopyButton({
  onCopy,
  copied,
}: {
  onCopy: (e: React.MouseEvent) => void;
  copied: boolean;
}) {
  return (
    <div className="ml-auto flex items-center pr-2">
      <Button
        className="opacity-0 transition-opacity duration-200 group-hover:opacity-100"
        onClick={onCopy}
        size="sm"
        variant="ghost"
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-green-500" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
      </Button>
    </div>
  );
}

export function CollapsibleSectionTabs({
  activeTab,
  onTabChange,
  hasOutput,
  onCopy,
  copied,
}: CollapsibleSectionTabsProps) {
  return (
    <div className="flex border-neutral-200 border-b dark:border-neutral-800">
      <TabButton
        active={activeTab === 'code'}
        onClick={() => onTabChange('code')}
      >
        Code
      </TabButton>
      {hasOutput && (
        <TabButton
          active={activeTab === 'output'}
          onClick={() => onTabChange('output')}
        >
          Output
        </TabButton>
      )}
      <CopyButton copied={copied} onCopy={onCopy} />
    </div>
  );
}
