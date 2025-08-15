'use client';
import { PinIcon } from 'lucide-react';
import Link from 'next/link';
import { memo, useState } from 'react';
import { toast } from 'sonner';

import {
  MoreHorizontalIcon,
  PencilEditIcon,
  TrashIcon,
} from '@/components/icons';
import { ShareDialog } from '@/components/share-button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { ShareMenuItem } from '@/components/upgrade-cta/share-menu-item';
import type { UIChat } from '@/lib/types/uiChat';

const PureSidebarChatItem = ({
  chat,
  isActive,
  onDelete,
  onRename,
  onPin,
  setOpenMobile,
}: {
  chat: UIChat;
  isActive: boolean;
  onDelete: (chatId: string) => void;
  onRename: (chatId: string, title: string) => void;
  onPin: (chatId: string, isPinned: boolean) => void;
  setOpenMobile: (open: boolean) => void;
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(chat.title);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);

  const handleRename = async () => {
    if (editTitle.trim() === '' || editTitle === chat.title) {
      setIsEditing(false);
      setEditTitle(chat.title);
      return;
    }

    try {
      await onRename(chat.id, editTitle.trim());
      setIsEditing(false);
      toast.success('Chat renamed successfully');
    } catch (_error) {
      setEditTitle(chat.title);
      setIsEditing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRename();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditTitle(chat.title);
    }
  };

  return (
    <SidebarMenuItem>
      {isEditing ? (
        <div className="flex w-full items-center gap-2 overflow-hidden rounded-md bg-background p-2 text-left text-sm">
          <Input
            autoFocus
            className="h-auto border-0 bg-transparent p-0 text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
            maxLength={255}
            onBlur={handleRename}
            onChange={(e) => setEditTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            value={editTitle}
          />
        </div>
      ) : (
        <SidebarMenuButton asChild isActive={isActive}>
          <Link
            href={`/chat/${chat.id}`}
            onClick={(e) => {
              // Allow middle-click and ctrl+click to open in new tab
              if (e.button === 1 || e.ctrlKey || e.metaKey) {
                return;
              }

              // Prevent default Link navigation for normal clicks
              e.preventDefault();

              // Use History API for client-side navigation
              window.history.pushState(null, '', `/chat/${chat.id}`);
              setOpenMobile(false);
            }} // TODO: Restore the prefetching after solving conflict with ppr
            prefetch={false}
          >
            <span>{chat.title}</span>
          </Link>
        </SidebarMenuButton>
      )}

      <DropdownMenu modal={true}>
        <DropdownMenuTrigger asChild>
          <SidebarMenuAction
            className="mr-0.5 data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            showOnHover={!isActive}
          >
            <MoreHorizontalIcon />
            <span className="sr-only">More</span>
          </SidebarMenuAction>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" side="bottom">
          <DropdownMenuItem
            className="cursor-pointer"
            onClick={() => {
              setIsEditing(true);
              setEditTitle(chat.title);
            }}
          >
            <PencilEditIcon />
            <span>Rename</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            className="cursor-pointer"
            onClick={() => onPin(chat.id, !chat.isPinned)}
          >
            <PinIcon
              className={`size-4 ${chat.isPinned ? 'fill-current' : ''}`}
            />
            <span>{chat.isPinned ? 'Unpin' : 'Pin'}</span>
          </DropdownMenuItem>

          <ShareMenuItem onShare={() => setShareDialogOpen(true)} />

          <DropdownMenuItem
            className="cursor-pointer text-destructive focus:bg-destructive/15 focus:text-destructive dark:text-red-500"
            onSelect={() => onDelete(chat.id)}
          >
            <TrashIcon />
            <span>Delete</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {shareDialogOpen && (
        <ShareDialog
          chatId={chat.id}
          onOpenChange={setShareDialogOpen}
          open={shareDialogOpen}
        />
      )}
    </SidebarMenuItem>
  );
};

export const SidebarChatItem = memo(
  PureSidebarChatItem,
  (prevProps, nextProps) => {
    if (prevProps.isActive !== nextProps.isActive) {
      return false;
    }
    if (prevProps.chat.id !== nextProps.chat.id) {
      return false;
    }
    if (prevProps.chat.title !== nextProps.chat.title) {
      return false;
    }
    if (prevProps.chat.isPinned !== nextProps.chat.isPinned) {
      return false;
    }
    return true;
  },
);
