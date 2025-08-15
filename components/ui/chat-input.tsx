import * as React from 'react';
import { cn } from '@/lib/utils';
import {
  LexicalChatInput,
  type LexicalChatInputRef,
} from './lexical-chat-input';

interface ChatInputTextAreaRef extends LexicalChatInputRef {}

const ChatInputContainer = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    className={cn(
      'group relative flex h-full max-w-full flex-1 cursor-text flex-col rounded-3xl border bg-muted px-3 py-1 shadow-[0_9px_9px_0px_rgba(0,0,0,0.01),_0_2px_5px_0px_rgba(0,0,0,0.06)] transition-colors dark:border-none dark:shadow-none',
      className,
    )}
    ref={ref}
    {...props}
  />
));
ChatInputContainer.displayName = 'ChatInputContainer';

const ChatInputTopRow = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    className={cn('mt-2 mb-1 flex items-center justify-between', className)}
    ref={ref}
    {...props}
  />
));
ChatInputTopRow.displayName = 'ChatInputTopRow';

const ChatInputTextArea = React.forwardRef<
  ChatInputTextAreaRef,
  React.ComponentProps<typeof LexicalChatInput>
>(({ className, ...props }, ref) => {
  return <LexicalChatInput className={className} ref={ref} {...props} />;
});
ChatInputTextArea.displayName = 'ChatInputTextArea';

const ChatInputBottomRow = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    className={cn('mt-1 mb-2 flex items-center justify-end', className)}
    ref={ref}
    {...props}
  />
));
ChatInputBottomRow.displayName = 'ChatInputBottomRow';

export {
  ChatInputContainer,
  ChatInputTopRow,
  ChatInputTextArea,
  ChatInputBottomRow,
  type ChatInputTextAreaRef,
};
