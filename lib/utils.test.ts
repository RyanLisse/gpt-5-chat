import type { FileUIPart, ModelMessage, TextPart } from 'ai';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Document } from '@/lib/db/schema';
import { ChatSDKError } from './ai/errors';
import type { Attachment, ChatMessage } from './ai/types';
import {
  cn,
  fetcher,
  fetchWithErrorHandlers,
  findLastArtifact,
  generateUUID,
  getAttachmentsFromMessage,
  getDocumentTimestampByIndex,
  getLanguageFromFileName,
  getLocalStorage,
  getMostRecentUserMessage,
  getTextContentFromMessage,
  getTextContentFromModelMessage,
  getTrailingMessageId,
} from './utils';

// TDD London School: Mock all external dependencies
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock navigator for offline detection
const mockNavigator = {
  onLine: true,
};
Object.defineProperty(global, 'navigator', {
  value: mockNavigator,
  writable: true,
});

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

// Mock window object for localStorage tests
Object.defineProperty(global, 'window', {
  value: {
    localStorage: mockLocalStorage,
  },
  configurable: true,
  writable: true,
});

// Note: localStorage will be mocked per test to avoid conflicts

// Mock Math.random for deterministic UUID tests
const mockMathRandom = vi.fn();
Math.random = mockMathRandom;

describe('cn', () => {
  it('should merge class names using clsx and tailwind-merge', () => {
    const result = cn('text-red-500', 'text-blue-500', 'font-bold');

    // Should prefer the last conflicting class (text-blue-500 over text-red-500)
    expect(result).toBe('text-blue-500 font-bold');
  });

  it('should handle conditional classes', () => {
    const isActive = true;
    const isHidden = false;
    const result = cn(
      'base-class',
      isActive && 'conditional-class',
      isHidden && 'hidden-class',
    );

    expect(result).toBe('base-class conditional-class');
  });

  it('should handle empty input', () => {
    const result = cn();

    expect(result).toBe('');
  });

  it('should handle object syntax', () => {
    const result = cn({
      'active-class': true,
      'inactive-class': false,
    });

    expect(result).toBe('active-class');
  });
});

describe('fetchWithErrorHandlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigator.onLine = true;
  });

  it('should return response for successful fetch', async () => {
    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue({ data: 'success' }),
    };
    mockFetch.mockResolvedValue(mockResponse);

    const result = await fetchWithErrorHandlers('https://api.example.com');

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.example.com',
      undefined,
    );
    expect(result).toBe(mockResponse);
  });

  it('should throw ChatSDKError for HTTP error responses', async () => {
    const errorResponse = {
      ok: false,
      headers: {
        get: vi.fn().mockReturnValue('application/json'),
      },
      json: vi.fn().mockResolvedValue({
        code: 'validation:invalid-input',
        cause: 'Invalid request parameters',
      }),
    };
    mockFetch.mockResolvedValue(errorResponse);

    await expect(
      fetchWithErrorHandlers('https://api.example.com'),
    ).rejects.toThrow(ChatSDKError);

    expect(errorResponse.json).toHaveBeenCalled();
  });

  it('should throw offline error when navigator is offline', async () => {
    mockNavigator.onLine = false;
    mockFetch.mockRejectedValue(new Error('Network error'));

    try {
      await fetchWithErrorHandlers('https://api.example.com');
      expect.fail('Should have thrown an error');
    } catch (error) {
      expect(error).toBeInstanceOf(ChatSDKError);
      expect((error as ChatSDKError).type).toBe('offline');
      expect((error as ChatSDKError).surface).toBe('chat');
    }
  });

  it('should rethrow non-offline errors when online', async () => {
    const networkError = new Error('Network failure');
    mockFetch.mockRejectedValue(networkError);

    await expect(
      fetchWithErrorHandlers('https://api.example.com'),
    ).rejects.toThrow('Network failure');
  });

  it('should pass through request options', async () => {
    const mockResponse = { ok: true };
    mockFetch.mockResolvedValue(mockResponse);

    const requestOptions = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ test: 'data' }),
    };

    await fetchWithErrorHandlers('https://api.example.com', requestOptions);

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.example.com',
      requestOptions,
    );
  });
});

describe('findLastArtifact', () => {
  it('should find the last artifact in messages', () => {
    const messages: ChatMessage[] = [
      {
        id: 'msg1',
        role: 'user',
        metadata: {
          createdAt: new Date(),
          parentMessageId: null,
          selectedModel: 'openai/gpt-5-mini' as const,
        },
        parts: [{ type: 'text', text: 'Create a document' } as TextPart],
      },
      {
        id: 'msg2',
        role: 'assistant',
        metadata: {
          createdAt: new Date(),
          parentMessageId: 'msg1',
          selectedModel: 'openai/gpt-5-mini' as const,
        },
        parts: [
          {
            type: 'tool-createDocument',
            toolCallId: 'call-1',
            state: 'output-available',
            input: {
              title: 'Test Doc',
              description: 'Test description',
              kind: 'text' as const,
            },
            output: {
              id: 'doc-1',
              title: 'Test Doc',
              kind: 'text' as const,
              content: 'Test document content',
            },
          },
        ],
      },
      {
        id: 'msg3',
        role: 'assistant',

        metadata: {
          createdAt: new Date(),
          parentMessageId: 'msg2',
          selectedModel: 'openai/gpt-5-mini' as const,
        },
        parts: [
          {
            type: 'tool-updateDocument',
            toolCallId: 'call-2',
            state: 'output-available',
            input: { id: 'doc-1', description: 'Updated content' },
            output: {
              success: true,
              id: 'doc-1',
              title: 'Test Doc',
              kind: 'text' as const,
              content: 'The document has been updated successfully.',
            },
          },
        ],
      },
    ];

    const result = findLastArtifact(messages);

    expect(result).toEqual({
      messageIndex: 2,
      toolCallId: 'call-2',
    });
  });

  it('should return null when no artifacts found', () => {
    const messages: ChatMessage[] = [
      {
        id: 'msg1',
        role: 'user',
        metadata: {
          createdAt: new Date(),
          parentMessageId: null,
          selectedModel: 'openai/gpt-5-mini' as const,
        },
        parts: [{ type: 'text', text: 'Hello' } as TextPart],
      },
    ];

    const result = findLastArtifact(messages);

    expect(result).toBeNull();
  });

  it('should ignore artifacts that are not output-available', () => {
    const messages: ChatMessage[] = [
      {
        id: 'msg1',
        role: 'assistant',
        metadata: {
          createdAt: new Date(),
          parentMessageId: null,
          selectedModel: 'openai/gpt-5-mini' as const,
        },
        parts: [
          {
            type: 'tool-createDocument',
            toolCallId: 'call-1',
            state: 'input-available',
            input: {
              title: 'Test Doc',
              description: 'Test description',
              kind: 'text' as const,
            },
          },
        ],
      },
    ];

    const result = findLastArtifact(messages);

    expect(result).toBeNull();
  });

  it('should handle messages without parts', () => {
    const messages: ChatMessage[] = [
      {
        id: 'msg1',
        role: 'user',
        parts: [{ type: 'text', text: 'Test message' }],
        metadata: {
          createdAt: new Date(),
          parentMessageId: null,
          selectedModel: 'openai/gpt-5-mini' as const,
        },
      },
    ];

    const result = findLastArtifact(messages);

    expect(result).toBeNull();
  });
});

describe('fetcher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch and parse JSON successfully', async () => {
    const mockData = { success: true, data: 'test' };
    const mockResponse = {
      ok: true,
      json: vi.fn().mockResolvedValue(mockData),
      status: 200,
    };
    mockFetch.mockResolvedValue(mockResponse);

    const result = await fetcher('https://api.example.com/data');

    expect(mockFetch).toHaveBeenCalledWith('https://api.example.com/data');
    expect(mockResponse.json).toHaveBeenCalled();
    expect(result).toEqual(mockData);
  });

  it('should throw ApplicationError for HTTP errors', async () => {
    const errorInfo = { error: 'Not found' };
    const mockResponse = {
      ok: false,
      json: vi.fn().mockResolvedValue(errorInfo),
      status: 404,
    };
    mockFetch.mockResolvedValue(mockResponse);

    try {
      await fetcher('https://api.example.com/missing');
    } catch (error: any) {
      expect(error.message).toBe('An error occurred while fetching the data.');
      expect(error.info).toEqual(errorInfo);
      expect(error.status).toBe(404);
    }
  });

  it('should handle network errors', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));

    await expect(fetcher('https://api.example.com')).rejects.toThrow(
      'Network error',
    );
  });
});

describe('getLocalStorage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should retrieve and parse localStorage data when window is available', () => {
    const testData = ['item1', 'item2', 'item3'];

    // Mock both window and global localStorage
    const mockLocalStorageObj = {
      getItem: vi.fn().mockReturnValue(JSON.stringify(testData)),
    };

    Object.defineProperty(global, 'window', {
      value: { localStorage: mockLocalStorageObj },
      writable: true,
    });

    Object.defineProperty(global, 'localStorage', {
      value: mockLocalStorageObj,
      writable: true,
    });

    const result = getLocalStorage('testKey');

    expect(result).toEqual(testData);
  });

  it('should return empty array when localStorage item is null', () => {
    const mockLocalStorageObj = {
      getItem: vi.fn().mockReturnValue(null),
    };

    Object.defineProperty(global, 'window', {
      value: { localStorage: mockLocalStorageObj },
      writable: true,
    });

    Object.defineProperty(global, 'localStorage', {
      value: mockLocalStorageObj,
      writable: true,
    });

    const result = getLocalStorage('emptyKey');

    expect(result).toEqual([]);
  });

  it('should return empty array when window is not available', () => {
    // Mock server environment by temporarily removing window
    const originalWindow = global.window;
    delete (global as any).window;

    const result = getLocalStorage('serverKey');

    expect(result).toEqual([]);

    // Restore window for other tests
    global.window = originalWindow;
  });

  it('should handle JSON parsing errors gracefully', () => {
    const mockLocalStorageObj = {
      getItem: vi.fn().mockReturnValue('invalid-json{'),
    };

    Object.defineProperty(global, 'window', {
      value: { localStorage: mockLocalStorageObj },
      writable: true,
    });

    Object.defineProperty(global, 'localStorage', {
      value: mockLocalStorageObj,
      writable: true,
    });

    expect(() => getLocalStorage('invalidKey')).toThrow();
  });
});

describe('generateUUID', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should generate UUID with correct format', () => {
    // Mock Math.random to return predictable values
    mockMathRandom
      .mockReturnValueOnce(0.1) // x
      .mockReturnValueOnce(0.2) // x
      .mockReturnValueOnce(0.3) // x
      .mockReturnValueOnce(0.4) // x
      .mockReturnValueOnce(0.5) // x
      .mockReturnValueOnce(0.6) // x
      .mockReturnValueOnce(0.7) // x
      .mockReturnValueOnce(0.8) // x
      .mockReturnValueOnce(0.1) // x (dash)
      .mockReturnValueOnce(0.2) // x
      .mockReturnValueOnce(0.3) // x
      .mockReturnValueOnce(0.4) // x
      .mockReturnValueOnce(0.1) // x (dash)
      .mockReturnValueOnce(0.2) // 4
      .mockReturnValueOnce(0.3) // x
      .mockReturnValueOnce(0.4) // x
      .mockReturnValueOnce(0.5) // x (dash)
      .mockReturnValueOnce(0.6) // y
      .mockReturnValueOnce(0.7) // x
      .mockReturnValueOnce(0.8) // x
      .mockReturnValueOnce(0.9) // x (dash)
      .mockReturnValueOnce(0.1) // x
      .mockReturnValueOnce(0.2) // x
      .mockReturnValueOnce(0.3) // x
      .mockReturnValueOnce(0.4) // x
      .mockReturnValueOnce(0.5) // x
      .mockReturnValueOnce(0.6) // x
      .mockReturnValueOnce(0.7) // x
      .mockReturnValueOnce(0.8) // x
      .mockReturnValueOnce(0.9) // x
      .mockReturnValueOnce(0.1) // x
      .mockReturnValueOnce(0.2) // x
      .mockReturnValueOnce(0.3); // x

    const uuid = generateUUID();

    // Check UUID format (8-4-4-4-12)
    expect(uuid).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );

    // Version should be 4
    expect(uuid.charAt(14)).toBe('4');

    // Variant should be 8, 9, a, or b
    expect(['8', '9', 'a', 'b']).toContain(uuid.charAt(19));
  });

  it('should generate different UUIDs on subsequent calls', () => {
    // Use vi.spyOn to properly mock Math.random for different values
    let callCount = 0;
    vi.spyOn(Math, 'random').mockImplementation(() => {
      callCount++;
      // Return different values for different calls to ensure unique UUIDs
      return callCount === 1 ? 0.123456789 : 0.987654321;
    });

    const uuid1 = generateUUID();
    const uuid2 = generateUUID();

    expect(uuid1).not.toBe(uuid2);
    expect(uuid1).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(uuid2).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );

    vi.restoreAllMocks();
  });
});

describe('getMostRecentUserMessage', () => {
  it('should return the most recent user message', () => {
    const messages: ChatMessage[] = [
      {
        id: 'msg1',
        role: 'user',
        metadata: {
          createdAt: new Date('2024-01-01T10:00:00Z'),
          parentMessageId: null,
          selectedModel: 'openai/gpt-5-mini' as const,
        },
        parts: [{ type: 'text', text: 'First user message' } as TextPart],
      },
      {
        id: 'msg2',
        role: 'assistant',
        parts: [{ type: 'text', text: 'Assistant response' }],
        metadata: {
          createdAt: new Date('2024-01-01T10:01:00Z'),
          parentMessageId: 'msg1',
          selectedModel: 'openai/gpt-5-mini' as const,
        },
      },
      {
        id: 'msg3',
        role: 'user',
        parts: [{ type: 'text', text: 'Second user message' }],
        metadata: {
          createdAt: new Date('2024-01-01T10:02:00Z'),
          parentMessageId: 'msg2',
          selectedModel: 'openai/gpt-5-mini' as const,
        },
      },
    ];

    const result = getMostRecentUserMessage(messages);

    expect(result).toEqual(messages[2]);
    if (result) {
      expect(getTextContentFromMessage(result)).toBe('Second user message');
    }
  });

  it('should return undefined when no user messages exist', () => {
    const messages: ChatMessage[] = [
      {
        id: 'msg1',
        role: 'assistant',
        parts: [{ type: 'text', text: 'Assistant message' }],
        metadata: {
          createdAt: new Date(),
          parentMessageId: null,
          selectedModel: 'openai/gpt-5-mini' as const,
        },
      },
    ];

    const result = getMostRecentUserMessage(messages);

    expect(result).toBeUndefined();
  });

  it('should handle empty messages array', () => {
    const result = getMostRecentUserMessage([]);

    expect(result).toBeUndefined();
  });
});

describe('getDocumentTimestampByIndex', () => {
  it('should return document timestamp at valid index', () => {
    const testDate = new Date('2024-01-15T10:00:00Z');
    const documents: Document[] = [
      {
        id: 'doc1',
        title: 'First Document',
        content: 'First document content',
        createdAt: new Date('2024-01-01T10:00:00Z'),
        userId: 'user1',
        kind: 'text',
        messageId: 'msg1',
      },
      {
        id: 'doc2',
        title: 'Second Document',
        content: 'Second document content',
        createdAt: testDate,
        userId: 'user1',
        kind: 'text',
        messageId: 'msg2',
      },
    ];

    const result = getDocumentTimestampByIndex(documents, 1);

    expect(result).toEqual(testDate);
  });

  it('should return current date when documents array is null', () => {
    const beforeCall = new Date();
    const result = getDocumentTimestampByIndex(null as any, 0);
    const afterCall = new Date();

    expect(result.getTime()).toBeGreaterThanOrEqual(beforeCall.getTime());
    expect(result.getTime()).toBeLessThanOrEqual(afterCall.getTime());
  });

  it('should return current date when documents array is undefined', () => {
    const beforeCall = new Date();
    const result = getDocumentTimestampByIndex(undefined as any, 0);
    const afterCall = new Date();

    expect(result.getTime()).toBeGreaterThanOrEqual(beforeCall.getTime());
    expect(result.getTime()).toBeLessThanOrEqual(afterCall.getTime());
  });

  it('should return current date when index exceeds array length', () => {
    const documents: Document[] = [
      {
        id: 'doc1',
        title: 'Only Document',
        content: 'Only document content',
        createdAt: new Date('2024-01-01T10:00:00Z'),
        userId: 'user1',
        kind: 'text',
        messageId: 'msg1',
      },
    ];

    const beforeCall = new Date();
    const result = getDocumentTimestampByIndex(documents, 5);
    const afterCall = new Date();

    expect(result.getTime()).toBeGreaterThanOrEqual(beforeCall.getTime());
    expect(result.getTime()).toBeLessThanOrEqual(afterCall.getTime());
  });

  it('should handle empty documents array', () => {
    const beforeCall = new Date();
    const result = getDocumentTimestampByIndex([], 1); // Index greater than length
    const afterCall = new Date();

    expect(result.getTime()).toBeGreaterThanOrEqual(beforeCall.getTime());
    expect(result.getTime()).toBeLessThanOrEqual(afterCall.getTime());
  });
});

describe('getTrailingMessageId', () => {
  it('should return ID of the last message', () => {
    const messages: ChatMessage[] = [
      {
        id: 'msg1',
        role: 'user',
        parts: [{ type: 'text', text: 'First message' }],
        metadata: {
          createdAt: new Date(),
          parentMessageId: null,
          selectedModel: 'openai/gpt-5-mini' as const,
        },
      },
      {
        id: 'msg2',
        role: 'assistant',
        parts: [{ type: 'text', text: 'Second message' }],
        metadata: {
          createdAt: new Date(),
          parentMessageId: 'msg1',
          selectedModel: 'openai/gpt-5-mini' as const,
        },
      },
      {
        id: 'msg3',
        role: 'user',
        parts: [{ type: 'text', text: 'Last message' }],
        metadata: {
          createdAt: new Date(),
          parentMessageId: 'msg2',
          selectedModel: 'openai/gpt-5-mini' as const,
        },
      },
    ];

    const result = getTrailingMessageId({ messages });

    expect(result).toBe('msg3');
  });

  it('should return null for empty messages array', () => {
    const result = getTrailingMessageId({ messages: [] });

    expect(result).toBeNull();
  });

  it('should return ID for single message', () => {
    const messages: ChatMessage[] = [
      {
        id: 'only-msg',
        role: 'user',
        parts: [{ type: 'text', text: 'Only message' }],
        metadata: {
          createdAt: new Date(),
          parentMessageId: null,
          selectedModel: 'openai/gpt-5-mini' as const,
        },
      },
    ];

    const result = getTrailingMessageId({ messages });

    expect(result).toBe('only-msg');
  });
});

describe('getLanguageFromFileName', () => {
  describe('JavaScript/TypeScript files', () => {
    it('should identify JavaScript files', () => {
      expect(getLanguageFromFileName('app.js')).toBe('javascript');
      expect(getLanguageFromFileName('module.mjs')).toBe('javascript');
      expect(getLanguageFromFileName('config.cjs')).toBe('javascript');
    });

    it('should identify JSX files', () => {
      expect(getLanguageFromFileName('Component.jsx')).toBe('jsx');
    });

    it('should identify TypeScript files', () => {
      expect(getLanguageFromFileName('types.ts')).toBe('typescript');
      expect(getLanguageFromFileName('Component.tsx')).toBe('tsx');
    });
  });

  describe('Python files', () => {
    it('should identify Python files', () => {
      expect(getLanguageFromFileName('script.py')).toBe('python');
      expect(getLanguageFromFileName('module.pyw')).toBe('python');
      expect(getLanguageFromFileName('types.pyi')).toBe('python');
    });
  });

  describe('Web files', () => {
    it('should identify HTML files', () => {
      expect(getLanguageFromFileName('index.html')).toBe('html');
      expect(getLanguageFromFileName('page.htm')).toBe('html');
    });

    it('should identify CSS files', () => {
      expect(getLanguageFromFileName('styles.css')).toBe('css');
      expect(getLanguageFromFileName('theme.scss')).toBe('css');
      expect(getLanguageFromFileName('layout.sass')).toBe('css');
      expect(getLanguageFromFileName('variables.less')).toBe('css');
    });
  });

  describe('Data format files', () => {
    it('should identify JSON files', () => {
      expect(getLanguageFromFileName('package.json')).toBe('json');
    });

    it('should identify XML files', () => {
      expect(getLanguageFromFileName('config.xml')).toBe('xml');
    });

    it('should identify YAML files', () => {
      expect(getLanguageFromFileName('docker-compose.yaml')).toBe('yaml');
      expect(getLanguageFromFileName('config.yml')).toBe('yaml');
    });

    it('should identify TOML files', () => {
      expect(getLanguageFromFileName('pyproject.toml')).toBe('toml');
    });
  });

  describe('Shell files', () => {
    it('should identify shell scripts', () => {
      expect(getLanguageFromFileName('script.sh')).toBe('shell');
      expect(getLanguageFromFileName('setup.bash')).toBe('shell');
      expect(getLanguageFromFileName('config.zsh')).toBe('shell');
      expect(getLanguageFromFileName('aliases.fish')).toBe('shell');
    });
  });

  describe('Other languages', () => {
    it('should identify SQL files', () => {
      expect(getLanguageFromFileName('schema.sql')).toBe('sql');
    });

    it('should identify Markdown files', () => {
      expect(getLanguageFromFileName('README.md')).toBe('markdown');
      expect(getLanguageFromFileName('docs.mdx')).toBe('markdown');
    });

    it('should identify Java files', () => {
      expect(getLanguageFromFileName('Main.java')).toBe('java');
    });

    it('should identify C/C++ files', () => {
      expect(getLanguageFromFileName('main.c')).toBe('c');
      expect(getLanguageFromFileName('app.cpp')).toBe('cpp');
      expect(getLanguageFromFileName('utils.cc')).toBe('cpp');
      expect(getLanguageFromFileName('library.cxx')).toBe('cpp');
      expect(getLanguageFromFileName('header.h')).toBe('c');
      expect(getLanguageFromFileName('class.hpp')).toBe('cpp');
    });

    it('should identify other popular languages', () => {
      expect(getLanguageFromFileName('Program.cs')).toBe('csharp');
      expect(getLanguageFromFileName('index.php')).toBe('php');
      expect(getLanguageFromFileName('app.rb')).toBe('ruby');
      expect(getLanguageFromFileName('main.go')).toBe('go');
      expect(getLanguageFromFileName('lib.rs')).toBe('rust');
      expect(getLanguageFromFileName('App.swift')).toBe('swift');
      expect(getLanguageFromFileName('Main.kt')).toBe('kotlin');
      expect(getLanguageFromFileName('analysis.r')).toBe('r');
      expect(getLanguageFromFileName('stats.R')).toBe('r');
    });
  });

  describe('Edge cases', () => {
    it('should default to python for unknown extensions', () => {
      expect(getLanguageFromFileName('file.unknown')).toBe('python');
      expect(getLanguageFromFileName('file.xyz')).toBe('python');
    });

    it('should handle files without extensions', () => {
      expect(getLanguageFromFileName('Dockerfile')).toBe('python');
      expect(getLanguageFromFileName('README')).toBe('python');
    });

    it('should handle files with multiple dots', () => {
      expect(getLanguageFromFileName('config.test.js')).toBe('javascript');
      expect(getLanguageFromFileName('types.d.ts')).toBe('typescript');
    });

    it('should handle case sensitivity', () => {
      expect(getLanguageFromFileName('FILE.JS')).toBe('javascript');
      expect(getLanguageFromFileName('Script.PY')).toBe('python');
    });

    it('should handle empty filename', () => {
      expect(getLanguageFromFileName('')).toBe('python');
    });
  });
});

describe('getAttachmentsFromMessage', () => {
  it('should extract file attachments from message parts', () => {
    const message: ChatMessage = {
      id: 'msg1',
      role: 'user',
      metadata: {
        createdAt: new Date(),
        parentMessageId: null,
        selectedModel: 'openai/gpt-5-mini',
      },
      parts: [
        { type: 'text', text: 'Here are some files' } as TextPart,
        {
          type: 'file',
          filename: 'document.pdf',
          url: 'https://example.com/document.pdf',
          mediaType: 'application/pdf',
        } as FileUIPart,
        {
          type: 'file',
          filename: 'image.png',
          url: 'https://example.com/image.png',
          mediaType: 'image/png',
        } as FileUIPart,
        { type: 'text', text: 'Some more text' } as TextPart,
      ],
    };

    const result = getAttachmentsFromMessage(message);

    expect(result).toEqual([
      {
        name: 'document.pdf',
        url: 'https://example.com/document.pdf',
        contentType: 'application/pdf',
      },
      {
        name: 'image.png',
        url: 'https://example.com/image.png',
        contentType: 'image/png',
      },
    ] as Attachment[]);
  });

  it('should return empty array when no file parts exist', () => {
    const message: ChatMessage = {
      id: 'msg1',
      role: 'user',
      metadata: {
        createdAt: new Date(),
        parentMessageId: null,
        selectedModel: 'openai/gpt-5-mini',
      },
      parts: [{ type: 'text', text: 'Just text' } as TextPart],
    };

    const result = getAttachmentsFromMessage(message);

    expect(result).toEqual([]);
  });

  it('should handle file parts without filename', () => {
    const message: ChatMessage = {
      id: 'msg1',
      role: 'user',
      metadata: {
        createdAt: new Date(),
        parentMessageId: null,
        selectedModel: 'openai/gpt-5-mini',
      },
      parts: [
        {
          type: 'file',
          url: 'https://example.com/file',
          mediaType: 'application/octet-stream',
        } as FileUIPart,
      ],
    };

    const result = getAttachmentsFromMessage(message);

    expect(result).toEqual([
      {
        name: '',
        url: 'https://example.com/file',
        contentType: 'application/octet-stream',
      },
    ]);
  });

  it('should handle message without parts', () => {
    const message: ChatMessage = {
      id: 'msg1',
      role: 'user',
      metadata: {
        createdAt: new Date(),
        parentMessageId: null,
        selectedModel: 'openai/gpt-5-mini',
      },
      parts: [],
    };

    const result = getAttachmentsFromMessage(message);

    expect(result).toEqual([]);
  });
});

describe('getTextContentFromMessage', () => {
  it('should extract and concatenate text content from message parts', () => {
    const message: ChatMessage = {
      id: 'msg1',
      role: 'user',
      metadata: {
        createdAt: new Date(),
        parentMessageId: null,
        selectedModel: 'openai/gpt-5-mini',
      },
      parts: [
        { type: 'text', text: 'First text part. ' } as TextPart,
        {
          type: 'file',
          filename: 'document.pdf',
          url: 'https://example.com/document.pdf',
          mediaType: 'application/pdf',
        } as FileUIPart,
        { type: 'text', text: 'Second text part.' } as TextPart,
      ],
    };

    const result = getTextContentFromMessage(message);

    expect(result).toBe('First text part. Second text part.');
  });

  it('should return empty string when no text parts exist', () => {
    const message: ChatMessage = {
      id: 'msg1',
      role: 'user',
      metadata: {
        createdAt: new Date(),
        parentMessageId: null,
        selectedModel: 'openai/gpt-5-mini',
      },
      parts: [
        {
          type: 'file',
          filename: 'document.pdf',
          url: 'https://example.com/document.pdf',
          mediaType: 'application/pdf',
        } as FileUIPart,
      ],
    };

    const result = getTextContentFromMessage(message);

    expect(result).toBe('');
  });

  it('should handle message with only text parts', () => {
    const message: ChatMessage = {
      id: 'msg1',
      role: 'user',
      metadata: {
        createdAt: new Date(),
        parentMessageId: null,
        selectedModel: 'openai/gpt-5-mini',
      },
      parts: [
        { type: 'text', text: 'Hello ' } as TextPart,
        { type: 'text', text: 'world!' } as TextPart,
      ],
    };

    const result = getTextContentFromMessage(message);

    expect(result).toBe('Hello world!');
  });

  it('should handle message without parts', () => {
    const message: ChatMessage = {
      id: 'msg1',
      role: 'user',
      metadata: {
        createdAt: new Date(),
        parentMessageId: null,
        selectedModel: 'openai/gpt-5-mini',
      },
      parts: [],
    };

    const result = getTextContentFromMessage(message);

    expect(result).toBe('');
  });
});

describe('getTextContentFromModelMessage', () => {
  it('should return string content directly', () => {
    const message: ModelMessage = {
      role: 'assistant',
      content: 'Test content',
    };

    const result = getTextContentFromModelMessage(message);

    expect(result).toBe('Test content');
  });

  it('should extract and join text from content array', () => {
    const message: ModelMessage = {
      role: 'assistant',
      content: [
        { type: 'text', text: 'First paragraph.' },
        { type: 'text', text: 'Second paragraph.' },
      ],
    };

    const result = getTextContentFromModelMessage(message);

    expect(result).toBe('First paragraph.\nSecond paragraph.');
  });

  it('should ignore non-text content parts', () => {
    const message: ModelMessage = {
      role: 'assistant',
      content: [
        { type: 'text', text: 'Text content.' },
        { type: 'file', data: 'data:image/png;base64,...' } as any,
        { type: 'text', text: 'More text.' },
      ],
    };

    const result = getTextContentFromModelMessage(message);

    expect(result).toBe('Text content.\n\nMore text.');
  });

  it('should handle content array with no text parts', () => {
    const message: ModelMessage = {
      role: 'assistant',
      content: [
        { type: 'file', data: 'data:image/png;base64,...' } as any,
        {
          type: 'tool-call',
          toolCallId: 'call-1',
          toolName: 'getWeather',
          args: {},
        } as any,
      ],
    };

    const result = getTextContentFromModelMessage(message);

    expect(result).toBe('\n');
  });

  it('should handle empty content array', () => {
    const message: ModelMessage = {
      role: 'assistant',
      content: [],
    };

    const result = getTextContentFromModelMessage(message);

    expect(result).toBe('');
  });

  it('should handle single text part in array', () => {
    const message: ModelMessage = {
      role: 'assistant',
      content: [{ type: 'text', text: 'Single text part' }],
    };

    const result = getTextContentFromModelMessage(message);

    expect(result).toBe('Single text part');
  });
});
