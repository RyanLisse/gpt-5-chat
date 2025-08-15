import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { getDomainFromUrl, getFaviconUrl } from '@/lib/url-utils';
import { Favicon } from './favicon';

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
        <Link href={result.url} rel="noopener noreferrer" target="_blank">
          <Badge
            className="max-w-[200px] gap-1 truncate text-xs"
            variant="secondary"
          >
            <Favicon className="size-3" url={getFaviconUrl(result as any)} />
            <span className="italic">{getDomainFromUrl(result.url)}</span>
            <span className="text-muted-foreground text-xs">
              {result.title}
            </span>
          </Badge>
        </Link>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs space-y-1 p-3">
        <div className="flex items-center gap-2">
          <Favicon className="size-4" url={getFaviconUrl(result as any)} />
          <p className="font-semibold">{result.title}</p>
        </div>
        <p className="text-muted-foreground text-xs">{result.url}</p>
        <p className="line-clamp-5 text-muted-foreground text-xs">
          {result.content}
        </p>
      </TooltipContent>
    </Tooltip>
  );
}
