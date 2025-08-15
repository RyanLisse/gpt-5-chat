import { checkDatabaseHealth, getDatabaseConnectionState } from './client';

// Database connection warmup utility
export async function warmupDatabaseConnection(): Promise<void> {
  try {
    console.log('[DB Warmup] Starting database connection warmup...');
    const startTime = Date.now();
    
    // Perform health check to warm up connection
    const health = await checkDatabaseHealth();
    const state = getDatabaseConnectionState();
    
    const warmupTime = Date.now() - startTime;
    
    if (health.status === 'healthy') {
      console.log(`[DB Warmup] ✅ Connection warmed up successfully in ${warmupTime}ms`);
      console.log(`[DB Warmup] Connection state: ${state.state}, Response time: ${health.responseTime}ms`);
    } else {
      console.warn(`[DB Warmup] ⚠️ Connection in degraded state: ${health.status}`);
      console.warn(`[DB Warmup] State: ${state.state}, Retries: ${state.retryCount}`);
    }
    
  } catch (error) {
    console.error('[DB Warmup] ❌ Failed to warm up database connection:', error);
  }
}

// Auto-warmup on module load for development
if (process.env.NODE_ENV === 'development') {
  // Delay warmup to prevent blocking startup
  setTimeout(() => {
    warmupDatabaseConnection().catch(console.error);
  }, 100);
}