import { usePathname } from 'next/navigation';
import { memo, useMemo } from 'react';
import type { UIChat } from '@/lib/types/uiChat';
import { groupChatsByDate } from '@/lib/utils/chat-grouping';
import { ChatGroupSection } from './chat-group-section';

type GroupedChatsListProps = {
  chats: UIChat[];
  onDelete: (chatId: string) => void;
  onRename: (chatId: string, title: string) => void;
  onPin: (chatId: string, isPinned: boolean) => void;
  setOpenMobile: (open: boolean) => void;
};

function PureGroupedChatsList({
  chats,
  onDelete,
  onRename,
  onPin,
  setOpenMobile,
}: GroupedChatsListProps) {
  const pathname = usePathname();

  // Extract chatId from URL for /chat routes
  const chatId = useMemo(() => {
    if (pathname?.startsWith('/chat/')) {
      return pathname.replace('/chat/', '') || null;
    }
    return null;
  }, [pathname]);

  const groupedChats = useMemo(() => {
    const groups = groupChatsByDate(chats, {
      dateField: 'updatedAt',
      includePinned: true,
    });

    // Sort pinned chats by most recently updated first
    groups.pinned.sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );

    return groups;
  }, [chats]);

  const isActive = (id: string) => id === chatId;

  return (
    <>
      <ChatGroupSection
        chats={groupedChats.pinned}
        className=""
        isActive={isActive}
        onDelete={onDelete}
        onPin={onPin}
        onRename={onRename}
        setOpenMobile={setOpenMobile}
        title="Pinned"
      />

      <ChatGroupSection
        chats={groupedChats.today}
        className={groupedChats.pinned.length > 0 ? 'mt-6' : ''}
        isActive={isActive}
        onDelete={onDelete}
        onPin={onPin}
        onRename={onRename}
        setOpenMobile={setOpenMobile}
        title="Today"
      />

      <ChatGroupSection
        chats={groupedChats.yesterday}
        isActive={isActive}
        onDelete={onDelete}
        onPin={onPin}
        onRename={onRename}
        setOpenMobile={setOpenMobile}
        title="Yesterday"
      />

      <ChatGroupSection
        chats={groupedChats.lastWeek}
        isActive={isActive}
        onDelete={onDelete}
        onPin={onPin}
        onRename={onRename}
        setOpenMobile={setOpenMobile}
        title="Last 7 days"
      />

      <ChatGroupSection
        chats={groupedChats.lastMonth}
        isActive={isActive}
        onDelete={onDelete}
        onPin={onPin}
        onRename={onRename}
        setOpenMobile={setOpenMobile}
        title="Last 30 days"
      />

      <ChatGroupSection
        chats={groupedChats.older}
        isActive={isActive}
        onDelete={onDelete}
        onPin={onPin}
        onRename={onRename}
        setOpenMobile={setOpenMobile}
        title="Older"
      />
    </>
  );
}

export const GroupedChatsList = memo(
  PureGroupedChatsList,
  (prevProps, nextProps) => {
    // Compare chats array
    if (prevProps.chats !== nextProps.chats) {
      return false;
    }
    // Compare callback functions
    if (prevProps.onDelete !== nextProps.onDelete) {
      return false;
    }
    if (prevProps.onRename !== nextProps.onRename) {
      return false;
    }
    if (prevProps.onPin !== nextProps.onPin) {
      return false;
    }
    if (prevProps.setOpenMobile !== nextProps.setOpenMobile) {
      return false;
    }
    return true;
  },
);
