import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

// Optionally, if not using email/pass login, you can
// use the Drizzle adapter for Auth.js / NextAuth
// https://authjs.dev/reference/adapter/drizzle

// Database connection state for graceful degradation
let connectionState: 'connected' | 'connecting' | 'failed' | 'degraded' =
  'connecting';
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
    ssl: url.includes('sslmode=require') ? ('require' as const) : false,

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
    connectionState = 'failed';
    throw new Error(
      'Database configuration required - please set POSTGRES_URL in .env.local',
    );
  }

  try {
    connectionState = 'connecting';

    const startTime = Date.now();
    const testClient = await createOptimizedConnection(
      process.env.POSTGRES_URL,
    );

    // Quick connection health check
    await testClient`SELECT 1 as health_check`.catch(() => {
      throw new Error('Health check failed');
    });

    const _connectionTime = Date.now() - startTime;

    connectionState = 'connected';
    retryCount = 0;
    return testClient;
  } catch (error) {
    retryCount++;

    if (retryCount >= MAX_RETRIES) {
      connectionState = 'failed';
      throw new Error(
        `Failed to connect to database after ${MAX_RETRIES} attempts: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }

    // Exponential backoff retry
    const delay = RETRY_DELAY_BASE * Math.pow(2, retryCount - 1);

    await new Promise((resolve) => setTimeout(resolve, delay));
    return connectWithRetry();
  }
}

// Mock client removed - using real database only

// Initialize connection promise for lazy loading
let clientPromise: Promise<postgres.Sql> | null = null;

function _initializeClient(): Promise<postgres.Sql> {
  if (clientPromise) {
    return clientPromise;
  }

  if (!process.env.POSTGRES_URL) {
    throw new Error(
      'POSTGRES_URL environment variable is required. Please set it in .env.local',
    );
  }

  clientPromise = connectWithRetry();

  return clientPromise;
}

// Initialize client with real database connection - NO MOCKS
function createClient(): postgres.Sql {
  if (!process.env.POSTGRES_URL) {
    throw new Error(
      'POSTGRES_URL environment variable is required. Please set it in .env.local',
    );
  }

  return postgres(process.env.POSTGRES_URL, {
    max: 30,
    idle_timeout: 10,
    connect_timeout: 10, // Increased timeout for reliability
    connection: {
      application_name: 'gpt-5-chat',
      statement_timeout: 10000, // Increased to 10 seconds
      idle_in_transaction_session_timeout: 10000,
    },
    prepare: true,
    ssl: process.env.POSTGRES_URL.includes('sslmode=require')
      ? ('require' as const)
      : false,
    types: { bigint: postgres.BigInt },
    onnotice: () => {},
    onparameter: () => {},
    transform: postgres.camel,
  });
}

// Initialize client - defer error if no POSTGRES_URL for testing
try {
  client = createClient();
} catch (_error) {
  // For testing purposes, create a mock client that throws when used
  client = new Proxy({} as postgres.Sql, {
    get() {
      throw new Error(
        'POSTGRES_URL environment variable is required. Please set it in .env.local',
      );
    },
  });
}

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
  } catch (_error) {
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
    }
  } catch (_error) {}
}

// Export db with fallback for testing
let dbInstance: ReturnType<typeof drizzle>;
try {
  dbInstance = drizzle(client);
} catch (_error) {
  // For testing purposes, create a mock db that throws when used
  dbInstance = new Proxy({} as ReturnType<typeof drizzle>, {
    get() {
      throw new Error(
        'POSTGRES_URL environment variable is required. Please set it in .env.local',
      );
    },
  });
}

export const db = dbInstance;

// Connection state getter for monitoring
export function getDatabaseConnectionState() {
  return {
    state: connectionState,
    retryCount,
    isHealthy: connectionState === 'connected',
    isDegraded: connectionState === 'degraded',
  };
}
