'use client';

import { BookText } from 'lucide-react';
import Link from 'next/link';
import { NewChatButton } from '@/components/new-chat-button';
import { SearchChatsButton } from '@/components/search-chats';
import { SidebarHistory } from '@/components/sidebar-history';
import { SidebarTopRow } from '@/components/sidebar-top-row';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from '@/components/ui/sidebar';

export function AppSidebar() {
  const { open, openMobile } = useSidebar();

  return (
    <Sidebar
      className="grid max-h-screen grid-rows-[auto_1fr_auto] group-data-[side=left]:border-r-0"
      collapsible="icon"
    >
      <SidebarHeader>
        <SidebarMenu>
          <div className="flex flex-row items-center justify-between">
            <SidebarTopRow />
          </div>

          <NewChatButton />

          <SidebarMenuItem>
            <SearchChatsButton />
          </SidebarMenuItem>

          {/* Static navigation link to Vector Store search UI */}
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Vector Store">
              <Link className="flex items-center gap-2" href="/vectorstore">
                <BookText className="size-4" />
                <span>Vector Store</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarSeparator />
      <ScrollArea className="h-full">
        <SidebarContent className="max-w-[var(--sidebar-width)] pr-2">
          {(open || openMobile) && <SidebarHistory />}
        </SidebarContent>
      </ScrollArea>

      {/* Credits removed */}
    </Sidebar>
  );
}
