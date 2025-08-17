import { isToday, isYesterday, subMonths, subWeeks } from 'date-fns';
import type { UIChat } from '@/lib/types/uiChat';

export type GroupedChats = {
  pinned: UIChat[];
  today: UIChat[];
  yesterday: UIChat[];
  lastWeek: UIChat[];
  lastMonth: UIChat[];
  older: UIChat[];
};

/**
 * Groups chats by date periods (today, yesterday, last week, last month, older).
 * Can optionally use different date fields and handle pinned chats.
 */
export function groupChatsByDate(
  chats: UIChat[],
  options: {
    dateField?: 'createdAt' | 'updatedAt';
    includePinned?: boolean;
  } = {},
): GroupedChats {
  const { dateField = 'updatedAt', includePinned = false } = options;

  const now = new Date();
  const oneWeekAgo = subWeeks(now, 1);
  const oneMonthAgo = subMonths(now, 1);

  // Initialize groups
  const groups: GroupedChats = {
    pinned: [],
    today: [],
    yesterday: [],
    lastWeek: [],
    lastMonth: [],
    older: [],
  };

  // Separate pinned and non-pinned chats if includePinned is true
  let chatsToGroup = chats;
  if (includePinned) {
    groups.pinned = chats.filter((chat) => chat.isPinned);
    chatsToGroup = chats.filter((chat) => !chat.isPinned);
  }

  // Group chats by date
  return chatsToGroup.reduce((acc, chat) => {
    const chatDate = new Date(chat[dateField]);

    if (isToday(chatDate)) {
      acc.today.push(chat);
    } else if (isYesterday(chatDate)) {
      acc.yesterday.push(chat);
    } else if (chatDate > oneWeekAgo) {
      acc.lastWeek.push(chat);
    } else if (chatDate > oneMonthAgo) {
      acc.lastMonth.push(chat);
    } else {
      acc.older.push(chat);
    }

    return acc;
  }, groups);
}
