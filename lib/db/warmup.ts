import { checkDatabaseHealth, getDatabaseConnectionState } from './client';

// Database connection warmup utility
export async function warmupDatabaseConnection(): Promise<void> {
  try {
    const startTime = Date.now();

    // Perform health check to warm up connection
    const health = await checkDatabaseHealth();
    const _state = getDatabaseConnectionState();

    const _warmupTime = Date.now() - startTime;

    if (health.status === 'healthy') {
    } else {
    }
  } catch (_error) {}
}

// Auto-warmup on module load for development
if (process.env.NODE_ENV === 'development') {
  // Delay warmup to prevent blocking startup
  setTimeout(() => {
    warmupDatabaseConnection().catch(console.error);
  }, 100);
}
