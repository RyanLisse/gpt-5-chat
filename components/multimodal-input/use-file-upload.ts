import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import type { Attachment } from '@/lib/ai/types';

type FileUploadResult =
  | {
      url: string;
      name: string;
      contentType: string;
    }
  | undefined;

type FileUploadHook = {
  uploadQueue: string[];
  uploadFile: (file: File) => Promise<FileUploadResult>;
  uploadFiles: (files: File[]) => Promise<void>;
  setUploadQueue: (queue: string[]) => void;
};

export const useFileUpload = (
  setAttachments: React.Dispatch<React.SetStateAction<Attachment[]>>,
): FileUploadHook => {
  const [uploadQueue, setUploadQueue] = useState<string[]>([]);

  const uploadFile = useCallback(
    async (file: File): Promise<FileUploadResult> => {
      const formData = new FormData();
      formData.append('file', file);

      try {
        const response = await fetch('/api/files/upload', {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          const data = await response.json();
          const { url, pathname, contentType } = data;

          return {
            url,
            name: pathname,
            contentType,
          };
        }
        const { error } = await response.json();
        toast.error(error);
      } catch (_error) {
        toast.error('Failed to upload file, please try again!');
      }
    },
    [],
  );

  const uploadFiles = useCallback(
    async (files: File[]) => {
      if (files.length === 0) {
        return;
      }

      setUploadQueue(files.map((file) => file.name));

      try {
        const uploadPromises = files.map((file) => uploadFile(file));
        const uploadedAttachments = await Promise.all(uploadPromises);
        const successfullyUploadedAttachments = uploadedAttachments.filter(
          (attachment): attachment is NonNullable<typeof attachment> =>
            attachment !== undefined,
        );

        setAttachments((currentAttachments) => [
          ...currentAttachments,
          ...successfullyUploadedAttachments,
        ]);

        if (successfullyUploadedAttachments.length > 0) {
          toast.success(
            `${successfullyUploadedAttachments.length} file(s) uploaded successfully`,
          );
        }
      } catch (_error) {
        toast.error('Upload failed');
      } finally {
        setUploadQueue([]);
      }
    },
    [uploadFile, setAttachments],
  );

  return {
    uploadQueue,
    uploadFile,
    uploadFiles,
    setUploadQueue,
  };
};
