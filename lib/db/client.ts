import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

// Optionally, if not using email/pass login, you can
// use the Drizzle adapter for Auth.js / NextAuth
// https://authjs.dev/reference/adapter/drizzle

// Database connection state for graceful degradation
let connectionState: 'connected' | 'connecting' | 'failed' | 'degraded' = 'connecting';
let retryCount = 0;
const MAX_RETRIES = 3;
const RETRY_DELAY_BASE = 1000; // 1 second base delay

// Create postgres client with aggressive optimization for fast startup
let client: postgres.Sql;

async function createOptimizedConnection(url: string): Promise<postgres.Sql> {
  const connectionConfig = {
    // Aggressive connection pooling for fast startup
    max: 30, // Increased from 10 to 30 for better concurrency
    idle_timeout: 10, // Reduced from 20 to 10 seconds
    connect_timeout: 3, // Reduced from 10 to 3 seconds (fail fast)
    
    // Connection optimization
    connection: {
      application_name: 'gpt-5-chat',
      statement_timeout: 5000, // 5 second query timeout
      idle_in_transaction_session_timeout: 5000,
    },
    
    // Prepared statements for performance
    prepare: true,
    
    // SSL and connection settings
    ssl: url.includes('sslmode=require') ? 'require' : false,
    
    // Type mapping
    types: {
      bigint: postgres.BigInt,
    },
    
    // Connection lifecycle hooks for health monitoring
    onnotice: () => {}, // Suppress notices for performance
    onparameter: () => {}, // Suppress parameter notices
    
    // Transform for better performance
    transform: postgres.camel,
  };

  return postgres(url, connectionConfig);
}

async function connectWithRetry(): Promise<postgres.Sql> {
  if (!process.env.POSTGRES_URL) {
    console.warn('POSTGRES_URL not set - database unavailable');
    connectionState = 'failed';
    throw new Error('Database configuration required - please set POSTGRES_URL in .env.local');
  }

  try {
    connectionState = 'connecting';
    console.log(`[DB] Attempting connection (attempt ${retryCount + 1}/${MAX_RETRIES})...`);
    
    const startTime = Date.now();
    const testClient = await createOptimizedConnection(process.env.POSTGRES_URL);
    
    // Quick connection health check
    await testClient`SELECT 1 as health_check`.catch(() => {
      throw new Error('Health check failed');
    });
    
    const connectionTime = Date.now() - startTime;
    console.log(`[DB] Connected successfully in ${connectionTime}ms`);
    
    connectionState = 'connected';
    retryCount = 0;
    return testClient;
    
  } catch (error) {
    retryCount++;
    console.warn(`[DB] Connection attempt ${retryCount} failed:`, error.message);
    
    if (retryCount >= MAX_RETRIES) {
      console.error('[DB] Max connection retries exceeded. Running in degraded mode.');
      connectionState = 'degraded';
      
      // Return a mock client for graceful degradation
      return createMockClient();
    }
    
    // Exponential backoff retry
    const delay = RETRY_DELAY_BASE * Math.pow(2, retryCount - 1);
    console.log(`[DB] Retrying connection in ${delay}ms...`);
    
    await new Promise(resolve => setTimeout(resolve, delay));
    return connectWithRetry();
  }
}

function createMockClient(): postgres.Sql {
  console.warn('[DB] Creating mock client for graceful degradation');
  
  // Create a proper mock structure that matches postgres.Sql interface
  const mockClient = {
    // Required options structure for Drizzle compatibility
    options: {
      parsers: {} as Record<number, (value: any) => unknown>,
      serializers: {} as Record<number, (value: any) => unknown>,
    },
    
    // Mock method implementations
    unsafe: () => Promise.resolve([]),
    begin: () => Promise.resolve(null),
    file: () => Promise.resolve([]),
    end: () => Promise.resolve(),
    
    // Additional properties that may be accessed
    parameters: {},
    types: {},
    typed: () => ({}),
    PostgresError: Error,
    CLOSE: {},
    END: {},
    
    // Array method for postgres arrays
    array: () => ({}),
    json: () => ({}),
    
    // Listen/notify methods
    listen: () => ({}),
    notify: () => Promise.resolve(),
    
    // Subscribe method
    subscribe: () => Promise.resolve({}),
    
    // Large object support
    largeObject: () => Promise.resolve({}),
    
    // Reserve method
    reserve: () => Promise.resolve({}),
  };
  
  const mockHandler = {
    get: (target: any, prop: string) => {
      // Return existing properties from the mock structure
      if (prop in target) {
        return target[prop];
      }
      
      // Handle template literal calls (the main postgres query interface)
      if (typeof prop === 'string' && !prop.startsWith('_')) {
        return (...args: any[]) => {
          console.warn(`[DB MOCK] Operation '${prop}' called but database unavailable`);
          
          // Return mock responses for common operations
          if (prop === 'select' || prop === 'insert' || prop === 'update' || prop === 'delete') {
            return Promise.resolve([]);
          }
          
          return Promise.resolve(null);
        };
      }
      
      return target[prop];
    },
    
    // Handle template literal calls (when used as tagged template)
    apply: (target: any, thisArg: any, argumentsList: any[]) => {
      console.warn('[DB MOCK] Template literal query called but database unavailable');
      return Promise.resolve([]);
    }
  };
  
  return new Proxy(mockClient as postgres.Sql, mockHandler);
}

// Initialize connection promise for lazy loading
let clientPromise: Promise<postgres.Sql> | null = null;

function initializeClient(): Promise<postgres.Sql> {
  if (clientPromise) {
    return clientPromise;
  }

  if (process.env.POSTGRES_URL) {
    clientPromise = connectWithRetry();
  } else {
    console.warn('POSTGRES_URL not set - using mock client');
    connectionState = 'failed';
    clientPromise = Promise.resolve(createMockClient());
  }

  return clientPromise;
}

// Initialize client synchronously for immediate use
client = process.env.POSTGRES_URL 
  ? postgres(process.env.POSTGRES_URL, {
      max: 30,
      idle_timeout: 10,
      connect_timeout: 3,
      connection: {
        application_name: 'gpt-5-chat',
        statement_timeout: 5000,
        idle_in_transaction_session_timeout: 5000,
      },
      prepare: true,
      ssl: process.env.POSTGRES_URL.includes('sslmode=require') ? 'require' : false,
      types: { bigint: postgres.BigInt },
      onnotice: () => {},
      onparameter: () => {},
      transform: postgres.camel,
    })
  : createMockClient();

// Health check function for monitoring
export async function checkDatabaseHealth(): Promise<{
  status: string;
  connectionState: string;
  responseTime?: number;
}> {
  if (connectionState === 'degraded') {
    return { status: 'degraded', connectionState };
  }
  
  try {
    const startTime = Date.now();
    await client`SELECT 1 as health_check`;
    const responseTime = Date.now() - startTime;
    
    return {
      status: 'healthy',
      connectionState,
      responseTime,
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      connectionState: 'failed',
    };
  }
}

// Graceful shutdown
export async function closeDatabaseConnection(): Promise<void> {
  try {
    if (client && typeof client.end === 'function') {
      await client.end();
      console.log('[DB] Connection closed gracefully');
    }
  } catch (error) {
    console.warn('[DB] Error during connection cleanup:', error.message);
  }
}

export const db = drizzle(client);

// Connection state getter for monitoring
export function getDatabaseConnectionState() {
  return {
    state: connectionState,
    retryCount,
    isHealthy: connectionState === 'connected',
    isDegraded: connectionState === 'degraded',
  };
}
