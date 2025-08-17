'use client';
import type { UseChatHelpers } from '@ai-sdk/react';
import { useSession } from 'next-auth/react';
import { memo, useCallback, useRef } from 'react';
import { useWindowSize } from 'usehooks-ts';
import type { Attachment, ChatMessage } from '@/lib/ai/types';
import { useMessageIds } from '@/lib/stores/chat-store';
import { useChatInput } from '@/providers/chat-input-provider';
import { ChatInputArea } from './multimodal-input/chat-input-area';
import { useImageModalManager } from './multimodal-input/image-modal-manager';
import { useFileHandlers } from './multimodal-input/use-file-handlers';
import { useFileProcessing } from './multimodal-input/use-file-processing';
import { useFileUpload } from './multimodal-input/use-file-upload';
import { useMessageSubmission } from './multimodal-input/use-message-submission';
import { SuggestedActions } from './suggested-actions';

function PureMultimodalInput({
  chatId,
  status,
  stop,
  sendMessage,
  className,
  isEditMode = false,
  parentMessageId,
}: {
  chatId: string;
  status: UseChatHelpers<ChatMessage>['status'];
  stop: () => void;
  sendMessage: UseChatHelpers<ChatMessage>['sendMessage'];
  className?: string;
  isEditMode?: boolean;
  parentMessageId: string | null;
}) {
  const { width } = useWindowSize();
  const { data: session } = useSession();
  const messageIds = useMessageIds();

  const {
    editorRef,
    selectedTool,
    setSelectedTool,
    attachments,
    setAttachments,
    selectedModelId,
    handleModelChange,
    getInputValue,
    handleInputChange,
    getInitialInput,
    isEmpty,
    handleSubmit,
  } = useChatInput();

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Custom hooks for complex logic
  const { processFiles } = useFileProcessing(
    selectedModelId,
    handleModelChange,
  );
  const { uploadQueue, uploadFiles } = useFileUpload(setAttachments);
  const { handleFileChange, handlePaste, dropzoneProps } = useFileHandlers({
    processFiles,
    uploadFiles,
    status,
    session,
  });

  const { submitMessage } = useMessageSubmission({
    chatId,
    attachments,
    selectedModelId,
    selectedTool,
    isEditMode,
    parentMessageId,
    getInputValue,
    sendMessage,
    editorRef,
    width,
  });

  const { handleImageClick, ImageModalComponent } = useImageModalManager();

  const submitForm = useCallback(() => {
    handleSubmit(submitMessage, isEditMode);
  }, [handleSubmit, submitMessage, isEditMode]);

  const removeAttachment = useCallback(
    (attachmentToRemove: Attachment) => {
      setAttachments((currentAttachments) =>
        currentAttachments.filter(
          (attachment) => attachment.url !== attachmentToRemove.url,
        ),
      );
    },
    [setAttachments],
  );

  return (
    <div className="relative mx-auto flex w-full flex-col gap-4 bg-background p-2 @[400px]:px-4 @[400px]:pb-4 md:max-w-3xl @[400px]:md:pb-6">
      {messageIds.length === 0 &&
        attachments.length === 0 &&
        uploadQueue.length === 0 &&
        !isEditMode && (
          <SuggestedActions
            chatId={chatId}
            selectedModelId={selectedModelId}
            sendMessage={sendMessage}
          />
        )}

      <input
        accept="image/*,.pdf"
        className="-top-4 -left-4 pointer-events-none fixed size-0.5 opacity-0"
        multiple
        onChange={handleFileChange}
        ref={fileInputRef}
        tabIndex={-1}
        type="file"
      />

      <ChatInputArea
        attachments={attachments}
        className={className}
        dropzoneProps={dropzoneProps}
        editorRef={editorRef}
        fileInputRef={fileInputRef as React.RefObject<HTMLInputElement>}
        getInitialInput={getInitialInput}
        handleInputChange={handleInputChange}
        handleModelChange={handleModelChange}
        isDragActive={dropzoneProps.isDragActive}
        isEmpty={isEmpty}
        onImageClick={handleImageClick}
        onPaste={handlePaste}
        onRemoveAttachment={removeAttachment}
        onStop={stop}
        onSubmit={submitForm}
        selectedModelId={selectedModelId}
        selectedTool={selectedTool}
        setSelectedTool={setSelectedTool as any}
        status={status}
        uploadQueue={uploadQueue}
      />

      <ImageModalComponent />
    </div>
  );
}

export const MultimodalInput = memo(
  PureMultimodalInput,
  (prevProps, nextProps) => {
    // More specific equality checks to prevent unnecessary re-renders
    if (prevProps.status !== nextProps.status) {
      return false;
    }
    if (prevProps.isEditMode !== nextProps.isEditMode) {
      return false;
    }
    if (prevProps.chatId !== nextProps.chatId) {
      return false;
    }
    if (prevProps.className !== nextProps.className) {
      return false;
    }

    return true;
  },
);
