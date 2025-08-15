import path from 'node:path';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { auth } from '@/app/(auth)/auth';
import { extractFilenameFromUrl, uploadFile } from '@/lib/blob';

// Constants
const FILE_SIZE_LIMIT_MB = 5;
const BYTES_PER_KB = 1024;
const BYTES_PER_MB = BYTES_PER_KB * BYTES_PER_KB;
const MAX_FILE_BYTES = FILE_SIZE_LIMIT_MB * BYTES_PER_MB; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'application/pdf'] as const;
const MAX_FILENAME_LEN = 128;
const FILENAME_SAFE_REGEX = /[^a-zA-Z0-9._-]+/g; // keep alnum, dot, underscore, dash
const LEADING_DOTS_REGEX = /^\.+/;

// Use Blob instead of File since File is not available in Node.js environment
const FileSchema = z.object({
  file: z
    .instanceof(Blob)
    .refine((file) => file.size <= MAX_FILE_BYTES, {
      message: 'File size should be less than 5MB',
    })
    // Update the file type based on the kind of files you want to accept
    .refine(
      (file) =>
        ALLOWED_TYPES.includes(file.type as (typeof ALLOWED_TYPES)[number]),
      {
        message: 'File type should be JPEG, PNG, or PDF',
      },
    ),
});

// Helper function to validate and extract file from form data
async function processFormData(request: Request) {
  const formData = await request.formData();
  const file = formData.get('file') as Blob;

  if (!file) {
    return { error: 'No file uploaded', status: 400 };
  }

  const validatedFile = FileSchema.safeParse({ file });
  if (!validatedFile.success) {
    const errorMessage = validatedFile.error.errors
      .map((error) => error.message)
      .join(', ');
    return { error: errorMessage, status: 400 };
  }

  return { file, formData };
}

// Helper function to sanitize filename
function sanitizeFilename(formData: FormData): string {
  const file = formData.get('file') as File | null;
  const rawName = file?.name ?? 'upload.dat';
  const base = path.basename(rawName);
  const candidate = base
    .replace(FILENAME_SAFE_REGEX, '_')
    .replace(LEADING_DOTS_REGEX, '')
    .slice(0, MAX_FILENAME_LEN);
  const sanitized = candidate.length > 0 ? candidate : 'upload.dat';
  return sanitized;
}

// Helper function to handle file upload
async function handleFileUpload(file: Blob, filename: string) {
  const fileBuffer = await file.arrayBuffer();
  const data = await uploadFile(filename, fileBuffer);
  const cleanFilename = extractFilenameFromUrl(data.pathname);

  return {
    ...data,
    pathname: cleanFilename?.length ? cleanFilename : filename,
  };
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (request.body === null) {
      return new Response('Request body is empty', { status: 400 });
    }

    try {
      const formResult = await processFormData(request);
      if ('error' in formResult) {
        return NextResponse.json(
          { error: formResult.error },
          { status: formResult.status },
        );
      }

      const { file, formData } = formResult;
      const filename = sanitizeFilename(formData);

      try {
        const result = await handleFileUpload(file, filename);
        return NextResponse.json(result);
      } catch (_error) {
        return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
      }
    } catch (_error) {
      return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }
  } catch (_error) {
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 },
    );
  }
}
