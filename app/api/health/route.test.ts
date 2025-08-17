import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock functions for database operations
const mockCheckDatabaseHealth = vi.fn();
const mockGetDatabaseConnectionState = vi.fn();

// Testable wrapper class for health API
class TestableHealthAPI {
  constructor(
    private readonly checkDbHealth: any,
    private readonly getDbConnectionState: any,
  ) {}

  async getHealthStatus(): Promise<{
    data: any;
    status: number;
  }> {
    try {
      const startTime = Date.now();

      // Check database health
      const dbHealth = await this.checkDbHealth();
      const connectionState = this.getDbConnectionState();

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
              used: Math.round(process.memoryUsage().heapUsed / (1024 * 1024)),
              total: Math.round(
                process.memoryUsage().heapTotal / (1024 * 1024),
              ),
            },
          },
        },
        responseTime: totalTime,
      };

      // Return appropriate status code based on health
      const statusCode = healthStatus.status === 'ok' ? 200 : 503;

      return { data: healthStatus, status: statusCode };
    } catch (error) {
      return {
        data: {
          status: 'error',
          timestamp: new Date().toISOString(),
          error: error instanceof Error ? error.message : 'Unknown error',
          checks: {
            database: { status: 'error' },
            server: { status: 'error' },
          },
        },
        status: 503,
      };
    }
  }
}

describe('Health API Route', () => {
  let testableHealthAPI: TestableHealthAPI;

  beforeEach(() => {
    vi.clearAllMocks();
    testableHealthAPI = new TestableHealthAPI(
      mockCheckDatabaseHealth,
      mockGetDatabaseConnectionState,
    );
    vi.spyOn(Date, 'now')
      .mockReturnValueOnce(1000) // startTime
      .mockReturnValueOnce(1050); // endTime
    vi.spyOn(process, 'uptime').mockReturnValue(3600);
    vi.spyOn(process, 'memoryUsage').mockReturnValue({
      rss: 50 * 1024 * 1024,
      heapTotal: 40 * 1024 * 1024,
      heapUsed: 30 * 1024 * 1024,
      external: 5 * 1024 * 1024,
      arrayBuffers: 2 * 1024 * 1024,
    });
  });

  describe('Healthy System Response', () => {
    it('should return healthy status when database is healthy', async () => {
      mockCheckDatabaseHealth.mockResolvedValue({
        status: 'healthy',
        connectionState: 'connected',
        responseTime: 25,
      });

      mockGetDatabaseConnectionState.mockReturnValue({
        retryCount: 0,
        isHealthy: true,
        isDegraded: false,
      });

      const result = await testableHealthAPI.getHealthStatus();

      expect(result.status).toBe(200);
      expect(result.data.status).toBe('ok');
      expect(result.data.checks.database.status).toBe('healthy');
      expect(result.data.checks.server.status).toBe('ok');
      expect(result.data.responseTime).toBe(50);
    });

    it('should return valid ISO timestamp', async () => {
      mockCheckDatabaseHealth.mockResolvedValue({
        status: 'healthy',
        connectionState: 'connected',
        responseTime: 25,
      });

      mockGetDatabaseConnectionState.mockReturnValue({
        retryCount: 0,
        isHealthy: true,
        isDegraded: false,
      });

      const result = await testableHealthAPI.getHealthStatus();

      expect(result.data.timestamp).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
      );
      expect(() => new Date(result.data.timestamp)).not.toThrow();
    });
  });

  describe('Degraded System Response', () => {
    it('should return degraded status when database is unhealthy', async () => {
      mockCheckDatabaseHealth.mockResolvedValue({
        status: 'unhealthy',
        connectionState: 'disconnected',
        responseTime: 5000,
      });

      mockGetDatabaseConnectionState.mockReturnValue({
        retryCount: 3,
        isHealthy: false,
        isDegraded: true,
      });

      const result = await testableHealthAPI.getHealthStatus();

      expect(result.status).toBe(503);
      expect(result.data.status).toBe('degraded');
      expect(result.data.checks.database.status).toBe('unhealthy');
      expect(result.data.checks.database.retryCount).toBe(3);
    });

    it('should return degraded status for partially healthy database', async () => {
      mockCheckDatabaseHealth.mockResolvedValue({
        status: 'degraded',
        connectionState: 'connected',
        responseTime: 2000,
      });

      mockGetDatabaseConnectionState.mockReturnValue({
        retryCount: 1,
        isHealthy: true,
        isDegraded: true,
      });

      const result = await testableHealthAPI.getHealthStatus();

      expect(result.status).toBe(503);
      expect(result.data.status).toBe('degraded');
      expect(result.data.checks.database.responseTime).toBe(2000);
    });
  });

  describe('Error Handling', () => {
    it('should handle database check errors gracefully', async () => {
      mockCheckDatabaseHealth.mockRejectedValue(
        new Error('Database connection failed'),
      );

      const result = await testableHealthAPI.getHealthStatus();

      expect(result.status).toBe(503);
      expect(result.data.status).toBe('error');
      expect(result.data.error).toBe('Database connection failed');
    });

    it('should handle unknown errors gracefully', async () => {
      mockCheckDatabaseHealth.mockRejectedValue('Unknown error type');

      const result = await testableHealthAPI.getHealthStatus();

      expect(result.status).toBe(503);
      expect(result.data.error).toBe('Unknown error');
    });
  });

  describe('Memory Calculation', () => {
    it('should correctly calculate memory usage in MB', async () => {
      vi.spyOn(process, 'memoryUsage').mockReturnValue({
        rss: 100 * 1024 * 1024,
        heapTotal: 80 * 1024 * 1024,
        heapUsed: 60 * 1024 * 1024,
        external: 10 * 1024 * 1024,
        arrayBuffers: 5 * 1024 * 1024,
      });

      mockCheckDatabaseHealth.mockResolvedValue({
        status: 'healthy',
        connectionState: 'connected',
        responseTime: 25,
      });

      mockGetDatabaseConnectionState.mockReturnValue({
        retryCount: 0,
        isHealthy: true,
        isDegraded: false,
      });

      const result = await testableHealthAPI.getHealthStatus();

      expect(result.data.checks.server.memory.used).toBe(60); // 60MB rounded
      expect(result.data.checks.server.memory.total).toBe(80); // 80MB rounded
    });
  });

  describe('Response Time Measurement', () => {
    it('should measure response time accurately', async () => {
      // Clear the beforeEach mocks and set specific ones for this test
      vi.restoreAllMocks();
      vi.spyOn(Date, 'now')
        .mockReturnValueOnce(1000) // startTime
        .mockReturnValueOnce(1250); // endTime (250ms later)
      vi.spyOn(process, 'uptime').mockReturnValue(3600);
      vi.spyOn(process, 'memoryUsage').mockReturnValue({
        rss: 50 * 1024 * 1024,
        heapTotal: 40 * 1024 * 1024,
        heapUsed: 30 * 1024 * 1024,
        external: 5 * 1024 * 1024,
        arrayBuffers: 2 * 1024 * 1024,
      });

      mockCheckDatabaseHealth.mockResolvedValue({
        status: 'healthy',
        connectionState: 'connected',
        responseTime: 50,
      });

      mockGetDatabaseConnectionState.mockReturnValue({
        retryCount: 0,
        isHealthy: true,
        isDegraded: false,
      });

      const result = await testableHealthAPI.getHealthStatus();

      expect(result.data.responseTime).toBe(250);
    });
  });

  describe('Server Uptime', () => {
    it('should include server uptime in response', async () => {
      vi.spyOn(process, 'uptime').mockReturnValue(7200); // 2 hours

      mockCheckDatabaseHealth.mockResolvedValue({
        status: 'healthy',
        connectionState: 'connected',
        responseTime: 25,
      });

      mockGetDatabaseConnectionState.mockReturnValue({
        retryCount: 0,
        isHealthy: true,
        isDegraded: false,
      });

      const result = await testableHealthAPI.getHealthStatus();

      expect(result.data.checks.server.uptime).toBe(7200);
    });
  });

  describe('Database Health Integration', () => {
    it('should correctly integrate database health and connection state', async () => {
      mockCheckDatabaseHealth.mockResolvedValue({
        status: 'healthy',
        connectionState: 'connected',
        responseTime: 15,
      });

      mockGetDatabaseConnectionState.mockReturnValue({
        retryCount: 0,
        isHealthy: true,
        isDegraded: false,
      });

      const result = await testableHealthAPI.getHealthStatus();

      expect(mockCheckDatabaseHealth).toHaveBeenCalledOnce();
      expect(mockGetDatabaseConnectionState).toHaveBeenCalledOnce();

      expect(result.data.checks.database).toEqual({
        status: 'healthy',
        connectionState: 'connected',
        responseTime: 15,
        retryCount: 0,
        isHealthy: true,
        isDegraded: false,
      });
    });

    it('should handle mixed health signals correctly', async () => {
      mockCheckDatabaseHealth.mockResolvedValue({
        status: 'healthy',
        connectionState: 'connected',
        responseTime: 100,
      });

      mockGetDatabaseConnectionState.mockReturnValue({
        retryCount: 2,
        isHealthy: false,
        isDegraded: true,
      });

      const result = await testableHealthAPI.getHealthStatus();

      expect(result.data.status).toBe('ok'); // Based on checkDatabaseHealth status
      expect(result.data.checks.database.isHealthy).toBe(false); // From connection state
      expect(result.data.checks.database.isDegraded).toBe(true); // From connection state
    });
  });
});
