'use client';

import { SidebarHistory } from '@/components/sidebar-history';
import { SearchChatsButton } from '@/components/search-chats';
import { SidebarCredits } from '@/components/sidebar-credits';
import { NewChatButton } from '@/components/new-chat-button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarSeparator,
  useSidebar,
} from '@/components/ui/sidebar';
import { SidebarTopRow } from '@/components/sidebar-top-row';
import Link from 'next/link';
import { BookText } from 'lucide-react';

export function AppSidebar() {
  const { open, openMobile } = useSidebar();

  return (
    <Sidebar
      collapsible="icon"
      className="group-data-[side=left]:border-r-0 grid grid-rows-[auto_1fr_auto] max-h-screen"
    >
      <SidebarHeader>
        <SidebarMenu>
          <div className="flex flex-row justify-between items-center">
            <SidebarTopRow />
          </div>

          <NewChatButton />

          <SidebarMenuItem>
            <SearchChatsButton />
          </SidebarMenuItem>

          {/* Static navigation link to Vector Store search UI */}
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Vector Store">
              <Link href="/vectorstore" className="flex items-center gap-2">
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

      {(open || openMobile) && (
        <>
          <SidebarSeparator />
          <SidebarFooter>
            <SidebarCredits />
          </SidebarFooter>
        </>
      )}
    </Sidebar>
  );
}
