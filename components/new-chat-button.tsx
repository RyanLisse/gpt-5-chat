'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { PlusIcon } from '@/components/icons';
import { getNewChatShortcutText } from '@/components/keyboard-shortcuts';
import { SidebarMenuButton, useSidebar } from '@/components/ui/sidebar';
import { useChatId } from '@/providers/chat-id-provider';

export function NewChatButton() {
  const { setOpenMobile } = useSidebar();
  const { refreshChatID } = useChatId();
  const [shortcutText, setShortcutText] = useState('Ctrl+Shift+O');

  useEffect(() => {
    setShortcutText(getNewChatShortcutText());
  }, []);

  return (
    <SidebarMenuButton asChild className="mt-4">
      <Link
        className="flex w-full items-center justify-start gap-2 rounded-md px-2 py-2 font-medium text-sm hover:bg-accent hover:text-accent-foreground"
        href="/"
        onClick={() => {
          setOpenMobile(false);
          refreshChatID();
        }}
      >
        <PlusIcon />
        <span>New Chat</span>
        <span className="ml-auto text-muted-foreground text-xs">
          {shortcutText}
        </span>
      </Link>
    </SidebarMenuButton>
  );
}
