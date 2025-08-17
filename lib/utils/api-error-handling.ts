import { NextResponse } from 'next/server';
import { z } from 'zod';

export type ErrorHandlerParams = {
  error: unknown;
  perfTracker: {
    end: (status: number) => void;
  };
  fallbackMessage?: string;
};

/**
 * Standardized error handling for API routes with performance tracking.
 * Handles Zod validation errors and generic errors with consistent response format.
 */
export function handleApiError({
  error,
  perfTracker,
  fallbackMessage = 'Internal server error',
}: ErrorHandlerParams): NextResponse {
  if (error instanceof z.ZodError) {
    const response = NextResponse.json(
      { error: 'Invalid parameters', details: error.issues },
      { status: 400 },
    );
    perfTracker.end(400);
    return response;
  }

  const response = NextResponse.json(
    { error: fallbackMessage },
    { status: 500 },
  );
  perfTracker.end(500);
  return response;
}

/**
 * Creates a success response with performance tracking.
 */
export function createSuccessResponse(
  data: unknown,
  perfTracker: { end: (status: number) => void },
): NextResponse {
  const response = NextResponse.json(data);
  perfTracker.end(200);
  return response;
}
