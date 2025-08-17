// TDD London School: Global test setup for fast, reliable tests
// Focus: Mock external dependencies for behavior verification

import { afterEach, beforeEach, vi } from 'vitest';
import { mockAIProvider } from '../__mocks__/ai-providers.mock';
import { mockDatabase } from '../__mocks__/database.mock';

// Mock time for deterministic behavior
vi.useFakeTimers();

// Mock global fetch for API calls
global.fetch = vi.fn();

// Mock environment variables for consistent behavior
vi.stubEnv('NODE_ENV', 'test');
process.env.OPENAI_API_KEY = 'test-key';
process.env.ANTHROPIC_API_KEY = 'test-key';
process.env.DATABASE_URL = 'mock://test-db';

// London School: Mock external dependencies globally
beforeEach(() => {
  // Reset all mocks for clean test state
  vi.clearAllMocks();
  mockAIProvider.reset();
  mockDatabase.reset();

  // Setup default fetch responses for fast execution
  (fetch as any).mockImplementation((url: string) => {
    // Mock AI API responses
    if (url.includes('/api/chat')) {
      return Promise.resolve({
        ok: true,
        status: 200,
        headers: new Headers({
          'x-ratelimit-limit-minute': '60',
          'x-ratelimit-remaining-minute': '59',
          'x-ratelimit-reset-minute': '60',
        }),
        json: () =>
          Promise.resolve({
            id: 'mock_response',
            content: 'Mock AI response',
            tokens: 50,
          }),
        text: () => Promise.resolve('Mock AI response'),
        body: new ReadableStream({
          start(controller) {
            // Mock streaming response
            controller.enqueue(
              new TextEncoder().encode(
                'data: {"type":"text","data":"Mock"}\n\n',
              ),
            );
            controller.enqueue(
              new TextEncoder().encode(
                'data: {"type":"text","data":" response"}\n\n',
              ),
            );
            controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
            controller.close();
          },
        }),
      });
    }

    // Mock tRPC responses
    if (url.includes('/api/trpc')) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ result: { data: 'mock_result' } }),
      });
    }

    // Default mock response
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ success: true }),
      text: () => Promise.resolve('Mock response'),
    });
  });
});

afterEach(() => {
  // Clean up after each test
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.useFakeTimers();
});

// Mock localStorage for browser-like behavior (works in node and dom envs)
const __storagePolyfill = {
  store: new Map<string, string>(),
  getItem(key: string) {
    return this.store.get(key) || null;
  },
  setItem(key: string, value: string) {
    this.store.set(key, value);
  },
  removeItem(key: string) {
    this.store.delete(key);
  },
  clear() {
    this.store.clear();
  },
};

if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'localStorage', {
    value: __storagePolyfill,
    writable: true,
  });
} else {
  Object.defineProperty(globalThis as any, 'localStorage', {
    value: __storagePolyfill,
    writable: true,
  });
}

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
};

// Mock crypto for UUID generation
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => `mock-uuid-${Date.now()}`,
  },
});

// Mock Math.random() for deterministic behavior
Object.defineProperty(global.Math, 'random', {
  value: vi.fn(() => 0.5),
  writable: true,
  configurable: true,
});

// Ensure Math.random is available on Math object
if (!global.Math.random) {
  global.Math.random = () => 0.5;
}

// Mock file operations for faster tests
vi.mock('node:fs', () => ({
  readFileSync: vi.fn(() => 'mock file content'),
  writeFileSync: vi.fn(),
  existsSync: vi.fn(() => true),
  mkdirSync: vi.fn(),
}));

// Mock next/navigation for Next.js components
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/mock-path',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock next-auth for authentication
vi.mock('next-auth/react', () => ({
  useSession: () => ({
    data: {
      user: {
        id: 'mock-user-id',
        email: 'test@example.com',
        name: 'Test User',
      },
    },
    status: 'authenticated',
  }),
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

// Mock Zustand stores for state management
vi.mock('zustand', () => ({
  create: () => vi.fn(),
}));

// TEST SEAM: Mock js-tiktoken encoder for deterministic testing
vi.mock('js-tiktoken', () => ({
  getEncoding: vi.fn(() => ({
    encode: vi.fn((text: string) => new Array(Math.ceil(text.length / 4))), // ~4 chars per token
  })),
}));

// Mock 'postgres' to avoid real network connections during tests
vi.mock('postgres', () => {
  const mockPostgres = (..._args: any[]) => {
    const sql: any = (..._templateArgs: any[]) =>
      Promise.resolve([{ health_check: 1 }]);

    // Provide methods/properties used by client code
    sql.options = {
      parsers: {},
      serializers: {},
    };
    sql.end = () => Promise.resolve();
    sql.unsafe = () => Promise.resolve([]);
    sql.begin = () => Promise.resolve(null);
    sql.file = () => Promise.resolve([]);
    sql.parameters = {};
    sql.types = {};
    sql.typed = () => ({});
    sql.array = () => ({});
    sql.json = () => ({});
    sql.listen = () => ({});
    sql.notify = () => Promise.resolve();
    sql.subscribe = () => Promise.resolve({});
    sql.largeObject = () => Promise.resolve({});
    sql.reserve = () => Promise.resolve({});

    return sql;
  };
  (mockPostgres as any).BigInt = (v: any) => v;
  (mockPostgres as any).camel = {};
  return { default: mockPostgres };
});

// Export helper functions for test setup
export const setupMockUser = () => ({
  id: 'mock-user-id',
  email: 'test@example.com',
  name: 'Test User',
});

export const setupMockChat = () => ({
  id: 'mock-chat-id',
  title: 'Test Chat',
  userId: 'mock-user-id',
  createdAt: new Date(),
  updatedAt: new Date(),
});

export const setupMockMessage = (role: 'user' | 'assistant' = 'user') => ({
  id: 'mock-message-id',
  chatId: 'mock-chat-id',
  role,
  content: role === 'user' ? 'Test user message' : 'Test assistant response',
  createdAt: new Date(),
});

// Fast mock timing helpers
export const fastTimeout = (ms = 1) =>
  new Promise((resolve) => setTimeout(resolve, ms));
export const mockTimestamp = () => Date.now();
