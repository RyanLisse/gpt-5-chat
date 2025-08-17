import type { UseChatHelpers } from '@ai-sdk/react';
import type { Session } from 'next-auth';
import type React from 'react';
import { type ChangeEvent, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { toast } from 'sonner';
import type { ChatMessage } from '@/lib/ai/types';

type FileHandlersHook = {
  handleFileChange: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
  handlePaste: (event: React.ClipboardEvent) => Promise<void>;
  dropzoneProps: ReturnType<typeof useDropzone>;
};

type FileHandlersOptions = {
  processFiles: (files: File[]) => File[];
  uploadFiles: (files: File[]) => Promise<void>;
  status: UseChatHelpers<ChatMessage>['status'];
  session: Session | null;
};

export const useFileHandlers = (
  options: FileHandlersOptions,
): FileHandlersHook => {
  const { processFiles, uploadFiles, status, session } = options;

  const checkAuthentication = useCallback(
    (action: string) => {
      if (!session?.user) {
        toast.error(`Sign in to ${action}`);
        return false;
      }
      return true;
    },
    [session],
  );

  const handleValidatedFiles = useCallback(
    async (files: File[], source: string) => {
      const validFiles = processFiles(files);
      if (validFiles.length === 0) {
        return;
      }

      await uploadFiles(validFiles);

      if (source === 'clipboard') {
        toast.success(`${validFiles.length} file(s) pasted from clipboard`);
      }
    },
    [processFiles, uploadFiles],
  );

  const handleFileChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files || []);
      await handleValidatedFiles(files, 'file-input');
    },
    [handleValidatedFiles],
  );

  const handlePaste = useCallback(
    async (event: React.ClipboardEvent) => {
      // Early returns to simplify logic
      if (status !== 'ready') {
        return;
      }

      const clipboardData = event.clipboardData;
      if (!clipboardData) {
        return;
      }

      const files = Array.from(clipboardData.files);
      if (files.length === 0) {
        return;
      }

      event.preventDefault();

      if (!checkAuthentication('attach files from clipboard')) {
        return;
      }

      await handleValidatedFiles(files, 'clipboard');
    },
    [status, checkAuthentication, handleValidatedFiles],
  );

  const handleDropzoneFiles = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) {
        return;
      }
      if (!checkAuthentication('attach files')) {
        return;
      }
      void handleValidatedFiles(acceptedFiles, 'drag-drop');
    },
    [checkAuthentication, handleValidatedFiles],
  );

  const dropzoneProps = useDropzone({
    onDrop: handleDropzoneFiles,
    noClick: true,
    disabled: status !== 'ready',
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif'],
      'application/pdf': ['.pdf'],
    },
  });

  return {
    handleFileChange,
    handlePaste,
    dropzoneProps,
  };
};
