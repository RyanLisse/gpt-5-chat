/* eslint-disable @next/next/no-img-element */
'use client';

import {
  Calculator,
  Calendar,
  Code,
  FileText,
  type LucideIcon,
  TrendingUp,
} from 'lucide-react';
import React from 'react';
import { COLLAPSIBLE_CONSTANTS } from './collapsible-section-constants';
import { CollapsibleSectionHeader } from './collapsible-section-header';
import { CollapsibleSectionTabs } from './collapsible-section-tabs';
import { SyntaxHighlighterContent } from './syntax-highlighter-content';

const IconMapping: Record<string, LucideIcon> = {
  stock: TrendingUp,
  default: Code,
  date: Calendar,
  calculation: Calculator,
  output: FileText,
};

type CollapsibleSectionProps = {
  code: string;
  output?: string;
  language?: string;
  title?: string;
  icon?: string;
  status?: 'running' | 'completed';
};

function useCopyHandler(
  code: string,
  output: string | undefined,
  activeTab: 'code' | 'output',
) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = React.useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      const textToCopy = activeTab === 'code' ? code : output;
      await navigator.clipboard.writeText(textToCopy || '');
      setCopied(true);
      setTimeout(
        () => setCopied(false),
        COLLAPSIBLE_CONSTANTS.COPY_FEEDBACK_DELAY,
      );
    },
    [code, output, activeTab],
  );

  return { copied, handleCopy };
}

export function CollapsibleSection({
  code,
  output,
  language = 'plaintext',
  title,
  icon,
  status,
}: CollapsibleSectionProps) {
  const [isExpanded, setIsExpanded] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState<'code' | 'output'>('code');
  const IconComponent = icon ? IconMapping[icon] : null;

  const { copied, handleCopy } = useCopyHandler(code, output, activeTab);

  const toggleExpanded = React.useCallback(() => {
    setIsExpanded(!isExpanded);
  }, [isExpanded]);

  const handleTabChange = React.useCallback((tab: 'code' | 'output') => {
    setActiveTab(tab);
  }, []);

  const contentToDisplay = activeTab === 'code' ? code : output || '';
  const contentId = title
    ? `collapsible-content-${title.replace(/\s+/g, '-').toLowerCase()}`
    : undefined;

  return (
    <div className="group overflow-hidden rounded-lg border border-neutral-200 transition-all duration-200 hover:shadow-sm dark:border-neutral-800">
      <CollapsibleSectionHeader
        IconComponent={IconComponent}
        isExpanded={isExpanded}
        onClick={toggleExpanded}
        status={status}
        title={title}
      />

      {isExpanded && (
        <div id={contentId}>
          <CollapsibleSectionTabs
            activeTab={activeTab}
            copied={copied}
            hasOutput={Boolean(output)}
            onCopy={handleCopy}
            onTabChange={handleTabChange}
          />
          <SyntaxHighlighterContent
            activeTab={activeTab}
            content={contentToDisplay}
            language={language}
          />
        </div>
      )}
    </div>
  );
}
