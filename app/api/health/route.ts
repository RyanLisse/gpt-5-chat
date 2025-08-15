import { NextResponse } from 'next/server';
import { 
  checkDatabaseHealth, 
  getDatabaseConnectionState 
} from '@/lib/db/client';

export async function GET() {
  try {
    const startTime = Date.now();
    
    // Check database health
    const dbHealth = await checkDatabaseHealth();
    const connectionState = getDatabaseConnectionState();
    
    const totalTime = Date.now() - startTime;
    
    const healthStatus = {
      status: dbHealth.status === 'healthy' ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      checks: {
        database: {
          status: dbHealth.status,
          connectionState: dbHealth.connectionState,
          responseTime: dbHealth.responseTime,
          retryCount: connectionState.retryCount,
          isHealthy: connectionState.isHealthy,
          isDegraded: connectionState.isDegraded,
        },
        server: {
          status: 'ok',
          uptime: process.uptime(),
          memory: {
            used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
            total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          },
        },
      },
      responseTime: totalTime,
    };

    // Return appropriate status code based on health
    const statusCode = healthStatus.status === 'ok' ? 200 : 503;
    
    return NextResponse.json(healthStatus, { status: statusCode });
    
  } catch (error) {
    console.error('[Health Check] Error:', error);
    
    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
        checks: {
          database: { status: 'error' },
          server: { status: 'error' },
        },
      },
      { status: 503 }
    );
  }
}