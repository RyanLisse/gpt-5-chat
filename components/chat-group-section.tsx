import type { UIChat } from '@/lib/types/uiChat';
import { SidebarChatItem } from './sidebar-chat-item';

type ChatGroupSectionProps = {
  title: string;
  chats: UIChat[];
  isActive: (chatId: string) => boolean;
  onDelete: (chatId: string) => void;
  onRename: (chatId: string, title: string) => void;
  onPin: (chatId: string, isPinned: boolean) => void;
  setOpenMobile: (open: boolean) => void;
  className?: string;
  showIfEmpty?: boolean;
};

export function ChatGroupSection({
  title,
  chats,
  isActive,
  onDelete,
  onRename,
  onPin,
  setOpenMobile,
  className = 'mt-6',
  showIfEmpty = false,
}: ChatGroupSectionProps) {
  if (!showIfEmpty && chats.length === 0) {
    return null;
  }

  return (
    <>
      <div
        className={`px-2 py-1 text-sidebar-foreground/50 text-xs ${className}`}
      >
        {title}
      </div>
      {chats.map((chat) => (
        <SidebarChatItem
          chat={chat}
          isActive={isActive(chat.id)}
          key={chat.id}
          onDelete={onDelete}
          onPin={onPin}
          onRename={onRename}
          setOpenMobile={setOpenMobile}
        />
      ))}
    </>
  );
}
