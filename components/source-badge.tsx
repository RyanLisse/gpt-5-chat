import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Favicon } from './favicon';
import { getDomainFromUrl, getFaviconUrl } from '@/lib/url-utils';

// Minimal local type for a web search result (legacy UI)
type SearchResultItem = {
  url: string;
  title: string;
  content?: string;
};

export function WebSourceBadge({ result }: { result: SearchResultItem }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link href={result.url} target="_blank" rel="noopener noreferrer">
          <Badge
            variant="secondary"
            className="gap-1 max-w-[200px] truncate text-xs"
          >
            <Favicon url={getFaviconUrl(result as any)} className="size-3" />
            <span className="italic">{getDomainFromUrl(result.url)}</span>
            <span className="text-xs text-muted-foreground">
              {result.title}
            </span>
          </Badge>
        </Link>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs p-3 space-y-1">
        <div className="flex items-center gap-2">
          <Favicon url={getFaviconUrl(result as any)} className="size-4" />
          <p className="font-semibold ">{result.title}</p>
        </div>
        <p className="text-xs text-muted-foreground ">{result.url}</p>
        <p className="text-xs text-muted-foreground line-clamp-5 ">
          {result.content}
        </p>
      </TooltipContent>
    </Tooltip>
  );
}
