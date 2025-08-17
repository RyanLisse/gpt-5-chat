import type { UseChatHelpers } from '@ai-sdk/react';
import { motion } from 'motion/react';
import type React from 'react';
import { toast } from 'sonner';
import { useWindowSize } from 'usehooks-ts';
import type { ModelId } from '@/lib/ai/model-id';
import type { Attachment, ChatMessage } from '@/lib/ai/types';
import { AttachmentList } from '../attachment-list';
import { ArrowUpIcon, PaperclipIcon, StopIcon } from '../icons';
import { ModelSelectorLazy as ModelSelector } from '../lazy/model-selector-lazy';
import { Button } from '../ui/button';
import {
  ChatInputBottomRow,
  ChatInputContainer,
  ChatInputTextArea,
  ChatInputTopRow,
} from '../ui/chat-input';
import { ScrollArea } from '../ui/scroll-area';

type ChatInputAreaProps = {
  className?: string;
  attachments: Attachment[];
  uploadQueue: string[];
  selectedModelId: ModelId;
  status: UseChatHelpers<ChatMessage>['status'];
  isEmpty: boolean;
  fileInputRef: React.RefObject<HTMLInputElement>;
  editorRef: React.RefObject<any>;
  getInitialInput: () => string;
  handleInputChange: (value: string) => void;
  handleModelChange: (modelId: ModelId) => void;
  onImageClick: (imageUrl: string, imageName?: string) => void;
  onRemoveAttachment: (attachment: Attachment) => void;
  onPaste: (event: React.ClipboardEvent) => void;
  onSubmit: () => void;
  onStop: () => void;
  dropzoneProps: any;
  isDragActive: boolean;
};

export function ChatInputArea({
  className,
  attachments,
  uploadQueue,
  selectedModelId,
  status,
  isEmpty,
  fileInputRef,
  editorRef,
  getInitialInput,
  handleInputChange,
  handleModelChange,
  onImageClick,
  onRemoveAttachment,
  onPaste,
  onSubmit,
  onStop,
  dropzoneProps,
  isDragActive,
}: ChatInputAreaProps) {
  const { width } = useWindowSize();
  const isMobile = width ? width <= 768 : false;

  const handleEnterSubmit = (event: any) => {
    const shouldSubmit = isMobile
      ? event.ctrlKey && !event.isComposing
      : !(event.shiftKey || event.isComposing);

    if (shouldSubmit) {
      if (status !== 'ready' && status !== 'error') {
        toast.error('Please wait for the model to finish its response!');
      } else if (uploadQueue.length > 0) {
        toast.error('Please wait for files to finish uploading!');
      } else if (isEmpty) {
        toast.error('Please enter a message before sending!');
      } else {
        onSubmit();
      }
      return true;
    }

    return false;
  };

  return (
    <div className="relative">
      <ChatInputContainer
        className={`${className} @container @[400px]:px-3 px-1.5 transition-colors ${
          isDragActive ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20' : ''
        }`}
        {...dropzoneProps.getRootProps()}
      >
        <input {...dropzoneProps.getInputProps()} />

        {isDragActive && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl border-2 border-blue-500 border-dashed bg-blue-50/80 dark:bg-blue-950/40">
            <div className="font-medium text-blue-600 dark:text-blue-400">
              Drop images or PDFs here to attach
            </div>
          </div>
        )}

        <motion.div
          animate={{
            height:
              attachments.length > 0 || uploadQueue.length > 0 ? 'auto' : 0,
            opacity: attachments.length > 0 || uploadQueue.length > 0 ? 1 : 0,
          }}
          style={{ overflow: 'hidden' }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
        >
          <ChatInputTopRow>
            {(attachments.length > 0 || uploadQueue.length > 0) && (
              <AttachmentList
                attachments={attachments}
                className="px-3 py-2"
                onImageClick={onImageClick}
                onRemove={onRemoveAttachment}
                testId="attachments-preview"
                uploadQueue={uploadQueue}
              />
            )}
          </ChatInputTopRow>
        </motion.div>

        <ScrollArea className="max-h-[50vh]">
          <ChatInputTextArea
            autoFocus
            className="min-h-[80px]"
            data-testid="multimodal-input"
            initialValue={getInitialInput()}
            onEnterSubmit={handleEnterSubmit}
            onInputChange={handleInputChange}
            onPaste={onPaste}
            placeholder={
              isMobile
                ? 'Send a message... (Ctrl+Enter to send)'
                : 'Send a message...'
            }
            ref={editorRef}
          />
        </ScrollArea>

        <ChatInputBottomRow className="flex w-full min-w-0 flex-row justify-between">
          <div className="flex min-w-0 flex-0 items-center @[400px]:gap-2 gap-1">
            <ModelSelector
              className="h-fit min-w-0 max-w-none flex-1 shrink truncate @[400px]:px-3 px-2 @[400px]:py-1.5 py-1 @[400px]:text-sm text-xs"
              onModelChange={handleModelChange}
              selectedModelId={selectedModelId}
            />
          </div>
          <div className="flex gap-2">
            <AttachmentButton fileInputRef={fileInputRef} status={status} />
            {status !== 'ready' ? (
              <StopButton onStop={onStop} />
            ) : (
              <SendButton
                isEmpty={isEmpty}
                onSubmit={onSubmit}
                uploadQueue={uploadQueue}
              />
            )}
          </div>
        </ChatInputBottomRow>
      </ChatInputContainer>
    </div>
  );
}

function AttachmentButton({
  fileInputRef,
  status,
}: {
  fileInputRef: React.RefObject<HTMLInputElement>;
  status: UseChatHelpers<ChatMessage>['status'];
}) {
  return (
    <Button
      className="h-fit p-1.5 hover:bg-zinc-200 dark:border-zinc-700 dark:hover:bg-zinc-900"
      data-testid="attachments-button"
      disabled={status !== 'ready'}
      onClick={(event) => {
        event.preventDefault();
        fileInputRef.current?.click();
      }}
      variant="ghost"
    >
      <PaperclipIcon size={14} />
    </Button>
  );
}

function StopButton({ onStop }: { onStop: () => void }) {
  return (
    <Button
      className="h-fit rounded-full border p-1.5 dark:border-zinc-600"
      data-testid="stop-button"
      onClick={(event) => {
        event.preventDefault();
        onStop();
      }}
    >
      <StopIcon size={14} />
    </Button>
  );
}

function SendButton({
  onSubmit,
  isEmpty,
  uploadQueue,
}: {
  onSubmit: () => void;
  isEmpty: boolean;
  uploadQueue: string[];
}) {
  return (
    <Button
      className="h-fit rounded-full border p-1.5 dark:border-zinc-600"
      data-testid="send-button"
      disabled={isEmpty || uploadQueue.length > 0}
      onClick={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <ArrowUpIcon size={14} />
    </Button>
  );
}
