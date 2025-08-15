'use client';
import { BookText, LogIn, Share } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { User } from 'next-auth';
import { useSession } from 'next-auth/react';
import { memo } from 'react';
import { SidebarToggle } from '@/components/sidebar-toggle';
import { Button } from '@/components/ui/button';
import { GitIcon } from './icons';
import { ShareButton } from './share-button';
import { SidebarUserNav } from './sidebar-user-nav';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';

function PureChatHeader({
  chatId,
  isReadonly,
  hasMessages,
  user,
}: {
  chatId: string;
  isReadonly: boolean;
  hasMessages: boolean;
  user: User | undefined;
}) {
  const router = useRouter();
  const { data: session } = useSession();
  const isAuthenticated = Boolean(session?.user);

  return (
    <header className="sticky top-0 flex items-center gap-2 bg-background px-2 py-1.5 md:px-2">
      <SidebarToggle />

      {!isReadonly && hasMessages && <ShareButton chatId={chatId} />}
      {isReadonly && (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5 rounded-md bg-muted/50 px-2 py-1 text-muted-foreground text-sm">
              <Share className="opacity-70" size={14} />
              <span>Shared</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-center">
              <div className="font-medium">Shared Chat</div>
              <div className="mt-1 text-muted-foreground text-xs">
                This is a shared chat
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      )}

      <div className="ml-auto flex items-center gap-2">
        {/* Quick link to Vector Store search UI */}
        <Button asChild className="h-8 p-2" size="sm" variant="ghost">
          <Link className="flex items-center gap-1" href="/vectorstore">
            <BookText className="h-4 w-4" />
            <span className="hidden sm:inline">Vector Store</span>
          </Link>
        </Button>
        <Button asChild className="h-8 w-8 p-2" size="sm" variant="ghost">
          <a
            className="flex items-center justify-center"
            href="https://github.com/franciscomoretti/sparka"
            rel="noopener noreferrer"
            target="_blank"
          >
            <GitIcon />
          </a>
        </Button>

        {isAuthenticated && user ? (
          <SidebarUserNav user={user} />
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                className="h-8 px-3"
                onClick={() => {
                  router.push('/login');
                  router.refresh();
                }}
                size="sm"
                variant="outline"
              >
                <LogIn className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Sign in</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Sign in to your account</TooltipContent>
          </Tooltip>
        )}
      </div>
    </header>
  );
}

export const ChatHeader = memo(PureChatHeader, (prevProps, nextProps) => {
  return prevProps.hasMessages === nextProps.hasMessages;
});
