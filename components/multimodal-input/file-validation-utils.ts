import { toast } from 'sonner';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export type FileCategories = {
  imageFiles: File[];
  pdfFiles: File[];
  oversizedFiles: File[];
  unsupportedFiles: File[];
};

export function categorizeFiles(files: File[]): FileCategories {
  const imageFiles: File[] = [];
  const pdfFiles: File[] = [];
  const oversizedFiles: File[] = [];
  const unsupportedFiles: File[] = [];

  files.forEach((file) => {
    if (file.size > MAX_FILE_SIZE) {
      oversizedFiles.push(file);
      return;
    }

    if (file.type.startsWith('image/')) {
      imageFiles.push(file);
    } else if (file.type === 'application/pdf') {
      pdfFiles.push(file);
    } else {
      unsupportedFiles.push(file);
    }
  });

  return {
    imageFiles,
    pdfFiles,
    oversizedFiles,
    unsupportedFiles,
  };
}

export function showFileValidationErrors(categories: FileCategories): void {
  const { oversizedFiles, unsupportedFiles } = categories;

  if (oversizedFiles.length > 0) {
    toast.error(`${oversizedFiles.length} file(s) exceed 5MB limit`);
  }

  if (unsupportedFiles.length > 0) {
    toast.error(
      `${unsupportedFiles.length} unsupported file type(s). Only images and PDFs are allowed`,
    );
  }
}

export function getValidFiles(categories: FileCategories): File[] {
  const { imageFiles, pdfFiles } = categories;
  return [...imageFiles, ...pdfFiles];
}
