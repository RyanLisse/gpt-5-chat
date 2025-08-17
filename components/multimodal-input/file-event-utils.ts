import type React from 'react';
import type { ChangeEvent } from 'react';
import { toast } from 'sonner';

export function extractFilesFromChangeEvent(
  event: ChangeEvent<HTMLInputElement>,
): File[] {
  return Array.from(event.target.files || []);
}

export function extractFilesFromClipboard(
  event: React.ClipboardEvent,
): File[] | null {
  const clipboardData = event.clipboardData;
  if (!clipboardData) {
    return null;
  }

  const files = Array.from(clipboardData.files);
  return files.length > 0 ? files : null;
}

export function showUploadSuccessMessage(
  fileCount: number,
  source: string,
): void {
  if (source === 'clipboard') {
    toast.success(`${fileCount} file(s) pasted from clipboard`);
  }
}
