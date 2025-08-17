export type ErrorType =
  | 'bad_request'
  | 'unauthorized'
  | 'input_too_long'
  | 'forbidden'
  | 'not_found'
  | 'rate_limit'
  | 'offline';

export type Surface =
  | 'chat'
  | 'auth'
  | 'api'
  | 'stream'
  | 'database'
  | 'history'
  | 'vote'
  | 'document'
  | 'suggestions';

export type ErrorCode = `${ErrorType}:${Surface}`;

export type ErrorVisibility = 'response' | 'log' | 'none';

export const visibilityBySurface: Record<Surface, ErrorVisibility> = {
  database: 'log',
  chat: 'response',
  auth: 'response',
  stream: 'response',
  api: 'response',
  history: 'response',
  vote: 'response',
  document: 'response',
  suggestions: 'response',
};

export class ChatSDKError extends Error {
  public type: ErrorType;
  public surface: Surface;
  public statusCode: number;

  constructor(errorCode: ErrorCode, cause?: string) {
    super();

    const [type, surface] = errorCode.split(':');

    this.type = type as ErrorType;
    this.cause = cause;
    this.surface = surface as Surface;
    this.message = getMessageByErrorCode(errorCode);
    this.statusCode = getStatusCodeByType(this.type);
  }

  public toResponse() {
    const code: ErrorCode = `${this.type}:${this.surface}`;
    const visibility = visibilityBySurface[this.surface];

    const { message, cause, statusCode } = this;

    if (visibility === 'log') {
      return Response.json(
        { code: '', message: 'Something went wrong. Please try again later.' },
        { status: statusCode },
      );
    }

    return Response.json({ code, message, cause }, { status: statusCode });
  }
}

// Helper functions to group related error messages
function getAuthMessage(errorCode: ErrorCode): string {
  const authMessages = {
    'unauthorized:auth': 'You need to sign in before continuing.',
    'forbidden:auth': 'Your account does not have access to this feature.',
  };
  return authMessages[errorCode as keyof typeof authMessages];
}

function getChatMessage(errorCode: ErrorCode): string {
  const chatMessages = {
    'rate_limit:chat':
      'You have exceeded your maximum number of messages for the day. Please try again later.',
    'input_too_long:chat':
      'Your message input is too long. Please shorten your message and try again.',
    'not_found:chat':
      'The requested chat was not found. Please check the chat ID and try again.',
    'forbidden:chat':
      'This chat belongs to another user. Please check the chat ID and try again.',
    'unauthorized:chat':
      'You need to sign in to view this chat. Please sign in and try again.',
    'offline:chat':
      "We're having trouble sending your message. Please check your internet connection and try again.",
  };
  return chatMessages[errorCode as keyof typeof chatMessages];
}

function getDocumentMessage(errorCode: ErrorCode): string {
  const documentMessages = {
    'not_found:document':
      'The requested document was not found. Please check the document ID and try again.',
    'forbidden:document':
      'This document belongs to another user. Please check the document ID and try again.',
    'unauthorized:document':
      'You need to sign in to view this document. Please sign in and try again.',
    'bad_request:document':
      'The request to create or update the document was invalid. Please check your input and try again.',
  };
  return documentMessages[errorCode as keyof typeof documentMessages];
}

export function getMessageByErrorCode(errorCode: ErrorCode): string {
  // Early return for database errors
  if (errorCode.includes('database')) {
    return 'An error occurred while executing a database query.';
  }

  // Handle API errors
  if (errorCode === 'bad_request:api') {
    return "The request couldn't be processed. Please check your input and try again.";
  }

  // Handle grouped error types
  if (errorCode.includes(':auth')) {
    return (
      getAuthMessage(errorCode) ||
      'Something went wrong. Please try again later.'
    );
  }

  if (errorCode.includes(':chat')) {
    return (
      getChatMessage(errorCode) ||
      'Something went wrong. Please try again later.'
    );
  }

  if (errorCode.includes(':document')) {
    return (
      getDocumentMessage(errorCode) ||
      'Something went wrong. Please try again later.'
    );
  }

  return 'Something went wrong. Please try again later.';
}

function getStatusCodeByType(type: ErrorType) {
  switch (type) {
    case 'bad_request':
    case 'input_too_long':
      return 400;
    case 'unauthorized':
      return 401;
    case 'forbidden':
      return 403;
    case 'not_found':
      return 404;
    case 'rate_limit':
      return 429;
    case 'offline':
      return 503;
    default:
      return 500;
  }
}
