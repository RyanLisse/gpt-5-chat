import { performance } from 'node:perf_hooks';

export type ServerPerformanceMetric = {
  name: string;
  value: number;
  timestamp: number;
  route?: string;
  method?: string;
  statusCode?: number;
  userId?: string;
  sessionId?: string;
  metadata?: Record<string, unknown>;
};

export type DatabaseQueryMetric = {
  query: string;
  duration: number;
  timestamp: number;
  table?: string;
  operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'OTHER';
  rowCount?: number;
};

export type APIPerformanceData = {
  route: string;
  method: string;
  duration: number;
  statusCode: number;
  timestamp: number;
  memoryUsage: NodeJS.MemoryUsage;
  userId?: string;
  sessionId?: string;
};

export class ServerPerformanceTracker {
  private static instance: ServerPerformanceTracker;
  private metrics: ServerPerformanceMetric[] = [];
  private dbMetrics: DatabaseQueryMetric[] = [];
  private readonly maxMetrics = 10_000; // Prevent memory leaks

  static getInstance(): ServerPerformanceTracker {
    if (!ServerPerformanceTracker.instance) {
      ServerPerformanceTracker.instance = new ServerPerformanceTracker();
    }
    return ServerPerformanceTracker.instance;
  }

  recordMetric(metric: Omit<ServerPerformanceMetric, 'timestamp'>): void {
    const fullMetric: ServerPerformanceMetric = {
      ...metric,
      timestamp: Date.now(),
    };

    this.metrics.push(fullMetric);

    // Prevent memory leaks by keeping only recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics / 2);
    }
  }

  recordDatabaseQuery(query: Omit<DatabaseQueryMetric, 'timestamp'>): void {
    const fullQuery: DatabaseQueryMetric = {
      ...query,
      timestamp: Date.now(),
    };

    this.dbMetrics.push(fullQuery);

    if (this.dbMetrics.length > this.maxMetrics) {
      this.dbMetrics = this.dbMetrics.slice(-this.maxMetrics / 2);
    }
  }

  getMetrics(since?: number): ServerPerformanceMetric[] {
    if (since) {
      return this.metrics.filter((m) => m.timestamp >= since);
    }
    return [...this.metrics];
  }

  getDatabaseMetrics(since?: number): DatabaseQueryMetric[] {
    if (since) {
      return this.dbMetrics.filter((m) => m.timestamp >= since);
    }
    return [...this.dbMetrics];
  }

  getAverageResponseTime(route?: string, timeWindow = 300_000): number {
    const since = Date.now() - timeWindow;
    const routeMetrics = this.metrics.filter(
      (m) =>
        m.timestamp >= since &&
        m.name === 'api_response_time' &&
        (!route || m.route === route),
    );

    if (routeMetrics.length === 0) {
      return 0;
    }

    const total = routeMetrics.reduce((sum, metric) => sum + metric.value, 0);
    return total / routeMetrics.length;
  }

  getSlowestQueries(limit = 10, timeWindow = 300_000): DatabaseQueryMetric[] {
    const since = Date.now() - timeWindow;
    return this.dbMetrics
      .filter((m) => m.timestamp >= since)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, limit);
  }

  clearMetrics(): void {
    this.metrics = [];
    this.dbMetrics = [];
  }
}

export function createApiPerformanceMiddleware() {
  const tracker = ServerPerformanceTracker.getInstance();

  return function trackPerformance(
    req: Request,
    route: string,
    userId?: string,
    sessionId?: string,
  ) {
    const startTime = performance.now();
    const startMemory = process.memoryUsage();

    return {
      end: (statusCode: number) => {
        const endTime = performance.now();
        const duration = endTime - startTime;
        const endMemory = process.memoryUsage();

        const memoryDelta: NodeJS.MemoryUsage = {
          rss: endMemory.rss - startMemory.rss,
          heapTotal: endMemory.heapTotal - startMemory.heapTotal,
          heapUsed: endMemory.heapUsed - startMemory.heapUsed,
          external: endMemory.external - startMemory.external,
          arrayBuffers: endMemory.arrayBuffers - startMemory.arrayBuffers,
        };

        const performanceData: APIPerformanceData = {
          route,
          method: req.method,
          duration,
          statusCode,
          timestamp: Date.now(),
          memoryUsage: memoryDelta,
          userId,
          sessionId,
        };

        // Record as general metric
        tracker.recordMetric({
          name: 'api_response_time',
          value: duration,
          route,
          method: req.method,
          statusCode,
          userId,
          sessionId,
          metadata: { memoryDelta },
        });

        // Record memory usage
        tracker.recordMetric({
          name: 'api_memory_usage',
          value: memoryDelta.heapUsed,
          route,
          method: req.method,
          statusCode,
          userId,
          sessionId,
        });

        return performanceData;
      },
    };
  };
}

export function trackDatabaseQuery<_T>(
  operation: DatabaseQueryMetric['operation'],
  queryText: string,
  table?: string,
) {
  return function decorator(
    _target: unknown,
    _propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: unknown[]) {
      const tracker = ServerPerformanceTracker.getInstance();
      const startTime = performance.now();

      try {
        const result = await originalMethod.apply(this, args);
        const duration = performance.now() - startTime;

        tracker.recordDatabaseQuery({
          query: queryText,
          duration,
          operation,
          table,
          rowCount: Array.isArray(result) ? result.length : undefined,
        });

        return result;
      } catch (error) {
        const duration = performance.now() - startTime;

        tracker.recordDatabaseQuery({
          query: queryText,
          duration,
          operation,
          table,
        });

        throw error;
      }
    };

    return descriptor;
  };
}

export type PerformanceReport = {
  timeRange: {
    start: number;
    end: number;
  };
  summary: {
    totalRequests: number;
    averageResponseTime: number;
    slowestRoute: string;
    fastestRoute: string;
    errorRate: number;
  };
  routes: Array<{
    route: string;
    requestCount: number;
    averageResponseTime: number;
    errorRate: number;
    p95ResponseTime: number;
  }>;
  database: {
    totalQueries: number;
    averageQueryTime: number;
    slowestQueries: DatabaseQueryMetric[];
  };
};

export function generatePerformanceReport(
  timeWindow = 3_600_000,
): PerformanceReport {
  const tracker = ServerPerformanceTracker.getInstance();
  const since = Date.now() - timeWindow;
  const metrics = tracker.getMetrics(since);
  const dbMetrics = tracker.getDatabaseMetrics(since);

  const apiMetrics = metrics.filter((m) => m.name === 'api_response_time');

  // Group by route
  const routeStats = new Map<
    string,
    { times: number[]; errors: number; total: number }
  >();

  for (const metric of apiMetrics) {
    if (!metric.route) {
      continue;
    }

    const key = `${metric.method} ${metric.route}`;
    const stats = routeStats.get(key) || { times: [], errors: 0, total: 0 };

    stats.times.push(metric.value);
    stats.total += 1;

    if (metric.statusCode && metric.statusCode >= 400) {
      stats.errors += 1;
    }

    routeStats.set(key, stats);
  }

  const routes = Array.from(routeStats.entries()).map(([route, stats]) => {
    const sortedTimes = stats.times.sort((a, b) => a - b);
    const p95Index = Math.floor(sortedTimes.length * 0.95);

    return {
      route,
      requestCount: stats.total,
      averageResponseTime:
        stats.times.reduce((a, b) => a + b, 0) / stats.times.length,
      errorRate: stats.errors / stats.total,
      p95ResponseTime: sortedTimes[p95Index] || 0,
    };
  });

  const totalRequests = apiMetrics.length;
  const totalErrors = apiMetrics.filter(
    (m) => m.statusCode && m.statusCode >= 400,
  ).length;
  const averageResponseTime =
    apiMetrics.reduce((sum, m) => sum + m.value, 0) / totalRequests || 0;

  const sortedRoutes = routes.sort(
    (a, b) => b.averageResponseTime - a.averageResponseTime,
  );

  return {
    timeRange: {
      start: since,
      end: Date.now(),
    },
    summary: {
      totalRequests,
      averageResponseTime,
      slowestRoute: sortedRoutes[0]?.route || 'N/A',
      fastestRoute: sortedRoutes.at(-1)?.route || 'N/A',
      errorRate: totalErrors / totalRequests || 0,
    },
    routes,
    database: {
      totalQueries: dbMetrics.length,
      averageQueryTime:
        dbMetrics.reduce((sum, m) => sum + m.duration, 0) / dbMetrics.length ||
        0,
      slowestQueries: tracker.getSlowestQueries(10, timeWindow),
    },
  };
}
