import { NextResponse } from 'next/server';
import {
  checkDatabaseHealth,
  getDatabaseConnectionState,
} from '@/lib/db/client';

const BYTES_TO_KB = 1024;
const KB_TO_MB = 1024;
const BYTES_TO_MB = BYTES_TO_KB * KB_TO_MB;
const HTTP_OK = 200;
const HTTP_SERVICE_UNAVAILABLE = 503;

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
            used: Math.round(process.memoryUsage().heapUsed / BYTES_TO_MB),
            total: Math.round(process.memoryUsage().heapTotal / BYTES_TO_MB),
          },
        },
      },
      responseTime: totalTime,
    };

    // Return appropriate status code based on health
    const statusCode =
      healthStatus.status === 'ok' ? HTTP_OK : HTTP_SERVICE_UNAVAILABLE;

    return NextResponse.json(healthStatus, { status: statusCode });
  } catch (error) {
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
      { status: HTTP_SERVICE_UNAVAILABLE },
    );
  }
}
