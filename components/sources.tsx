import { ArrowRight, FileText } from 'lucide-react';
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { useMediaQuery } from '@/hooks/use-media-query';
import { cn } from '@/lib/utils';
import { FaviconGroup } from './favicon-group';

// Minimal local type for a web search result (legacy UI)
type SearchResultItem = {
  url: string;
  title: string;
  content?: string;
  source?: 'web' | 'academic' | 'x';
};

import { getFaviconUrl } from '@/lib/url-utils';
import { Favicon } from './favicon';

const SourcesList = ({
  sources,
}: {
  sources: SearchResultItem[] | undefined;
}) => {
  return (
    <div className="space-y-3">
      {sources?.map((source: SearchResultItem, i: number) => (
        <a
          className="block rounded-lg bg-neutral-50 p-4 transition-colors hover:bg-neutral-100 dark:bg-neutral-800/50 dark:hover:bg-neutral-800"
          href={source.url}
          key={i}
          rel="noopener noreferrer"
          target="_blank"
        >
          <div className="flex items-start gap-3">
            <div className="mt-1 flex-shrink-0">
              <Favicon url={getFaviconUrl(source as any)} />
            </div>
            <div className="flex flex-col gap-1">
              <h4 className="font-medium text-sm leading-tight">
                {source.title}
              </h4>
            </div>
          </div>
        </a>
      ))}
    </div>
  );
};

const AllSourcesView = ({
  sources,
  id,
}: {
  sources: SearchResultItem[] | undefined;
  id?: string;
}) => {
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const title = 'All Sources';

  if (isDesktop) {
    return (
      <Dialog>
        <DialogTrigger asChild>
          <button className="hidden" id={id} type="button">
            Show All
          </button>
        </DialogTrigger>
        <DialogContent
          className={cn('max-h-[80vh] overflow-y-auto', 'max-w-4xl')}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              {title}
            </DialogTitle>
          </DialogHeader>
          <SourcesList sources={sources} />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer>
      <DrawerTrigger asChild>
        <button className="hidden" id={id} type="button">
          Show All
        </button>
      </DrawerTrigger>
      <DrawerContent className="h-[85vh]">
        <DrawerHeader>
          <DrawerTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            {title}
          </DrawerTitle>
        </DrawerHeader>
        <div className="overflow-y-auto p-4">
          <SourcesList sources={sources} />
        </div>
      </DrawerContent>
    </Drawer>
  );
};

function ShowSourcesButton({
  sources,
  dialogId,
}: {
  sources: SearchResultItem[];
  dialogId: string;
}) {
  return (
    <button
      className="group flex items-center justify-center gap-2 rounded-lg border border-neutral-200 p-2.5 transition-colors hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-800/50"
      onClick={() => document.getElementById(dialogId)?.click()}
      type="button"
    >
      <FaviconGroup
        className="mr-1.5"
        maxVisible={3}
        sources={sources.map((s) => ({
          url: s.url,
          title: s.title,
        }))}
      />
      <span className="text-neutral-600 text-xs group-hover:text-neutral-700 dark:text-neutral-400 dark:group-hover:text-neutral-300">
        {sources.length} Sources
      </span>
      <ArrowRight className="h-3.5 w-3.5 text-neutral-400 transition-colors group-hover:text-neutral-500" />
    </button>
  );
}

export const Sources = ({ sources }: { sources: SearchResultItem[] }) => {
  if (sources.length === 0) {
    return null;
  }

  const sourcesDialogId = 'show-all-sources-dialog';

  return (
    <div className="space-y-3">
      <ShowSourcesButton dialogId={sourcesDialogId} sources={sources} />
      <div className="hidden">
        <AllSourcesView id={sourcesDialogId} sources={sources} />
      </div>
    </div>
  );
};
