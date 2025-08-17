import { Download, ExternalLink, FileText } from 'lucide-react';
import type { Attachment } from '@/lib/ai/types';
import { CrossIcon, LoaderIcon } from './icons';
import { Button } from './ui/button';

export const PreviewAttachment = ({
  attachment,
  isUploading = false,
  onRemove,
  onImageClick,
}: {
  attachment: Attachment;
  isUploading?: boolean;
  onRemove?: () => void;
  onImageClick?: (imageUrl: string, imageName?: string) => void;
}) => {
  const { name, url, contentType } = attachment;

  const isPdf = contentType === 'application/pdf';

  return (
    <div
      className="group relative flex flex-col gap-2"
      data-testid="input-attachment-preview"
    >
      {onRemove && !isUploading && (
        <Button
          className="-top-2 -right-2 absolute z-10 size-5 rounded-full border border-border bg-muted/90 p-0 text-muted-foreground shadow-xs hover:bg-muted"
          onClick={onRemove}
          size="sm"
          variant="ghost"
        >
          <CrossIcon size={10} />
        </Button>
      )}
      <div className="relative flex aspect-video h-16 w-20 flex-col items-center justify-center rounded-md bg-muted">
        {contentType ? (
          contentType.startsWith('image') ? (
            // NOTE: it is recommended to use next/image for images
            // eslint-disable-next-line @next/next/no-img-element
            <img
              alt={name ?? 'An image attachment'}
              className="size-full cursor-pointer rounded-md object-cover"
              key={url}
              onClick={() => onImageClick?.(url, name)}
              src={url}
            />
          ) : isPdf ? (
            <div className="flex h-full flex-col items-center justify-center">
              <FileText className="size-8 text-red-500" />
              {/* Show action buttons for PDFs in message view (when not uploading and no remove button) */}
              {!(isUploading || onRemove) && url && (
                <div className="absolute inset-0 flex items-center justify-center rounded-md bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
                  <div className="flex gap-1">
                    <Button
                      className="h-auto p-1 text-white hover:bg-white/20"
                      onClick={() => window.open(url, '_blank')}
                      size="sm"
                      title="Open PDF"
                      variant="ghost"
                    >
                      <ExternalLink className="size-3" />
                    </Button>
                    <Button
                      className="h-auto p-1 text-white hover:bg-white/20"
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = name || 'document.pdf';
                        link.click();
                      }}
                      size="sm"
                      title="Download PDF"
                      variant="ghost"
                    >
                      <Download className="size-3" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="" />
          )
        ) : (
          <div className="" />
        )}

        {isUploading && (
          <div
            className="absolute animate-spin text-zinc-500"
            data-testid="input-attachment-loader"
          >
            <LoaderIcon />
          </div>
        )}
      </div>
      <div className="max-w-16 truncate text-xs text-zinc-500">{name}</div>
    </div>
  );
};
