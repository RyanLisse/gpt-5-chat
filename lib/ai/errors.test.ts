import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ChatSDKError,
  type ErrorCode,
  type ErrorVisibility,
  getMessageByErrorCode,
  type Surface,
  visibilityBySurface,
} from './errors';

// Mock Response object for testing
global.Response = {
  json: vi.fn((data, options) => ({
    data,
    status: options?.status || 200,
  })),
} as any;

describe('ChatSDKError', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create error with valid error code', () => {
      const error = new ChatSDKError('not_found:chat', 'Chat does not exist');

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ChatSDKError);
      expect(error.type).toBe('not_found');
      expect(error.surface).toBe('chat');
      expect(error.cause).toBe('Chat does not exist');
      expect(error.statusCode).toBe(404);
      expect(error.message).toBe(
        'The requested chat was not found. Please check the chat ID and try again.',
      );
    });

    it('should create error without cause', () => {
      const error = new ChatSDKError('unauthorized:auth');

      expect(error.type).toBe('unauthorized');
      expect(error.surface).toBe('auth');
      expect(error.cause).toBeUndefined();
      expect(error.statusCode).toBe(401);
      expect(error.message).toBe('You need to sign in before continuing.');
    });

    it('should handle all error types correctly', () => {
      const errorTypes: [ErrorCode, number][] = [
        ['bad_request:api', 400],
        ['unauthorized:auth', 401],
        ['forbidden:chat', 403],
        ['not_found:document', 404],
        ['rate_limit:chat', 429],
        ['offline:chat', 503],
      ];

      errorTypes.forEach(([errorCode, expectedStatus]) => {
        const error = new ChatSDKError(errorCode);
        expect(error.statusCode).toBe(expectedStatus);
      });
    });
  });

  describe('toResponse', () => {
    it('should return log response for database surface', () => {
      const error = new ChatSDKError('not_found:database');
      const response = error.toResponse();

      expect(Response.json).toHaveBeenCalledWith(
        { code: '', message: 'Something went wrong. Please try again later.' },
        { status: 404 },
      );
      expect(response).toEqual({
        data: {
          code: '',
          message: 'Something went wrong. Please try again later.',
        },
        status: 404,
      });
    });

    it('should return full response for non-database surfaces', () => {
      const error = new ChatSDKError('unauthorized:chat', 'User not logged in');
      const _response = error.toResponse();

      expect(Response.json).toHaveBeenCalledWith(
        {
          code: 'unauthorized:chat',
          message:
            'You need to sign in to view this chat. Please sign in and try again.',
          cause: 'User not logged in',
        },
        { status: 401 },
      );
    });

    it('should handle all surfaces with response visibility', () => {
      const responseSurfaces: Surface[] = [
        'chat',
        'auth',
        'api',
        'stream',
        'history',
        'vote',
        'document',
        'suggestions',
      ];

      responseSurfaces.forEach((surface) => {
        const error = new ChatSDKError(`not_found:${surface}` as ErrorCode);
        const _response = error.toResponse();

        expect(Response.json).toHaveBeenCalledWith(
          expect.objectContaining({
            code: `not_found:${surface}`,
          }),
          { status: 404 },
        );
      });
    });
  });
});

describe('visibilityBySurface', () => {
  it('should have correct visibility mapping', () => {
    expect(visibilityBySurface.database).toBe('log');
    expect(visibilityBySurface.chat).toBe('response');
    expect(visibilityBySurface.auth).toBe('response');
    expect(visibilityBySurface.stream).toBe('response');
    expect(visibilityBySurface.api).toBe('response');
    expect(visibilityBySurface.history).toBe('response');
    expect(visibilityBySurface.vote).toBe('response');
    expect(visibilityBySurface.document).toBe('response');
    expect(visibilityBySurface.suggestions).toBe('response');
  });

  it('should cover all surfaces', () => {
    const expectedSurfaces: Surface[] = [
      'chat',
      'auth',
      'api',
      'stream',
      'database',
      'history',
      'vote',
      'document',
      'suggestions',
    ];

    expectedSurfaces.forEach((surface) => {
      expect(visibilityBySurface).toHaveProperty(surface);
      expect(visibilityBySurface[surface]).toMatch(/^(response|log|none)$/);
    });
  });
});

describe('getMessageByErrorCode', () => {
  describe('database errors', () => {
    it('should return database error message for any database error', () => {
      const databaseErrorCodes = [
        'not_found:database',
        'unauthorized:database',
        'bad_request:database',
      ] as ErrorCode[];

      databaseErrorCodes.forEach((errorCode) => {
        expect(getMessageByErrorCode(errorCode)).toBe(
          'An error occurred while executing a database query.',
        );
      });
    });
  });

  describe('API errors', () => {
    it('should return API error message for bad_request:api', () => {
      expect(getMessageByErrorCode('bad_request:api')).toBe(
        "The request couldn't be processed. Please check your input and try again.",
      );
    });
  });

  describe('auth errors', () => {
    it('should return correct auth error messages', () => {
      expect(getMessageByErrorCode('unauthorized:auth')).toBe(
        'You need to sign in before continuing.',
      );
      expect(getMessageByErrorCode('forbidden:auth')).toBe(
        'Your account does not have access to this feature.',
      );
    });

    it('should return fallback message for unknown auth errors', () => {
      expect(getMessageByErrorCode('rate_limit:auth' as ErrorCode)).toBe(
        'Something went wrong. Please try again later.',
      );
    });
  });

  describe('chat errors', () => {
    it('should return correct chat error messages', () => {
      const chatErrors: [ErrorCode, string][] = [
        [
          'rate_limit:chat',
          'You have exceeded your maximum number of messages for the day. Please try again later.',
        ],
        [
          'input_too_long:chat',
          'Your message input is too long. Please shorten your message and try again.',
        ],
        [
          'not_found:chat',
          'The requested chat was not found. Please check the chat ID and try again.',
        ],
        [
          'forbidden:chat',
          'This chat belongs to another user. Please check the chat ID and try again.',
        ],
        [
          'unauthorized:chat',
          'You need to sign in to view this chat. Please sign in and try again.',
        ],
        [
          'offline:chat',
          "We're having trouble sending your message. Please check your internet connection and try again.",
        ],
      ];

      chatErrors.forEach(([errorCode, expectedMessage]) => {
        expect(getMessageByErrorCode(errorCode)).toBe(expectedMessage);
      });
    });

    it('should return fallback message for unknown chat errors', () => {
      expect(getMessageByErrorCode('bad_request:chat' as ErrorCode)).toBe(
        'Something went wrong. Please try again later.',
      );
    });
  });

  describe('document errors', () => {
    it('should return correct document error messages', () => {
      const documentErrors: [ErrorCode, string][] = [
        [
          'not_found:document',
          'The requested document was not found. Please check the document ID and try again.',
        ],
        [
          'forbidden:document',
          'This document belongs to another user. Please check the document ID and try again.',
        ],
        [
          'unauthorized:document',
          'You need to sign in to view this document. Please sign in and try again.',
        ],
        [
          'bad_request:document',
          'The request to create or update the document was invalid. Please check your input and try again.',
        ],
      ];

      documentErrors.forEach(([errorCode, expectedMessage]) => {
        expect(getMessageByErrorCode(errorCode)).toBe(expectedMessage);
      });
    });

    it('should return fallback message for unknown document errors', () => {
      expect(getMessageByErrorCode('rate_limit:document' as ErrorCode)).toBe(
        'Something went wrong. Please try again later.',
      );
    });
  });

  describe('other errors', () => {
    it('should return fallback message for unknown error codes', () => {
      expect(getMessageByErrorCode('unknown:surface' as ErrorCode)).toBe(
        'Something went wrong. Please try again later.',
      );
      expect(getMessageByErrorCode('not_found:unknown' as ErrorCode)).toBe(
        'Something went wrong. Please try again later.',
      );
    });
  });

  describe('edge cases', () => {
    it('should handle error codes with unusual formatting', () => {
      // Test behavior with malformed error codes that still match patterns
      expect(getMessageByErrorCode('rate_limit:auth:extra' as ErrorCode)).toBe(
        'Something went wrong. Please try again later.',
      );
    });
  });
});

describe('integration tests', () => {
  it('should create error and convert to response for all error types', () => {
    const testCases: [ErrorCode, ErrorVisibility][] = [
      ['not_found:database', 'log'],
      ['unauthorized:chat', 'response'],
      ['bad_request:api', 'response'],
      ['forbidden:auth', 'response'],
    ];

    testCases.forEach(([errorCode, expectedVisibility]) => {
      const error = new ChatSDKError(errorCode, 'Test cause');
      const response = error.toResponse() as any;

      if (expectedVisibility === 'log') {
        expect(response.data.code).toBe('');
        expect(response.data.message).toBe(
          'Something went wrong. Please try again later.',
        );
      } else {
        expect(response.data.code).toBe(errorCode);
        expect(response.data.cause).toBe('Test cause');
      }
    });
  });

  it('should handle error creation and response generation workflow', () => {
    // Simulate real-world error handling workflow
    const errorCode: ErrorCode = 'rate_limit:chat';
    const cause = 'Daily limit exceeded for user 123';

    // Create error
    const error = new ChatSDKError(errorCode, cause);

    // Verify error properties
    expect(error.type).toBe('rate_limit');
    expect(error.surface).toBe('chat');
    expect(error.statusCode).toBe(429);
    expect(error.cause).toBe(cause);

    // Generate response
    const response = error.toResponse() as any;

    // Verify response structure
    expect(response.status).toBe(429);
    expect(response.data.code).toBe(errorCode);
    expect(response.data.cause).toBe(cause);
    expect(response.data.message).toContain('exceeded your maximum number');
  });
});
