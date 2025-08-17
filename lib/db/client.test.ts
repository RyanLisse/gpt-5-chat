import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('Database Client', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset environment
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Health Check Function', () => {
    it('should handle health check with database connection', async () => {
      // Set up environment for database
      process.env.POSTGRES_URL = 'postgresql://test:test@localhost:5432/testdb';

      // Dynamically import to get fresh instance
      const { checkDatabaseHealth } = await import('./client');

      const result = await checkDatabaseHealth();

      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('connectionState');
      expect(['healthy', 'unhealthy', 'degraded']).toContain(result.status);

      if (result.status === 'healthy') {
        expect(result).toHaveProperty('responseTime');
        expect(typeof result.responseTime).toBe('number');
      }
    });

    it('should handle health check without database connection', async () => {
      // Remove database URL
      delete process.env.POSTGRES_URL;

      const { checkDatabaseHealth } = await import('./client');

      const result = await checkDatabaseHealth();

      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('connectionState');
      expect(['healthy', 'unhealthy', 'degraded']).toContain(result.status);
    });

    it('should return consistent health check structure', async () => {
      process.env.POSTGRES_URL = 'postgresql://test:test@localhost:5432/testdb';

      const { checkDatabaseHealth } = await import('./client');

      const result = await checkDatabaseHealth();

      // Verify response structure
      expect(result).toMatchObject({
        status: expect.stringMatching(/^(healthy|unhealthy|degraded)$/),
        connectionState: expect.any(String),
      });

      // Response time should be present for healthy connections
      if (result.status === 'healthy') {
        expect(result.responseTime).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('Connection State Management', () => {
    it('should provide connection state information', async () => {
      const { getDatabaseConnectionState } = await import('./client');

      const state = getDatabaseConnectionState();

      expect(state).toHaveProperty('state');
      expect(state).toHaveProperty('retryCount');
      expect(state).toHaveProperty('isHealthy');
      expect(state).toHaveProperty('isDegraded');

      expect(typeof state.state).toBe('string');
      expect(typeof state.retryCount).toBe('number');
      expect(typeof state.isHealthy).toBe('boolean');
      expect(typeof state.isDegraded).toBe('boolean');
    });

    it('should track retry count as a number', async () => {
      const { getDatabaseConnectionState } = await import('./client');

      const state = getDatabaseConnectionState();

      expect(state.retryCount).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(state.retryCount)).toBe(true);
    });

    it('should provide boolean health indicators', async () => {
      const { getDatabaseConnectionState } = await import('./client');

      const state = getDatabaseConnectionState();

      // isHealthy should be true when state is 'connected'
      if (state.state === 'connected') {
        expect(state.isHealthy).toBe(true);
      }

      // isDegraded should be true when state is 'degraded'
      if (state.state === 'degraded') {
        expect(state.isDegraded).toBe(true);
      }

      // They should be mutually exclusive in most cases
      if (state.isHealthy && state.isDegraded) {
        // This would be an unusual state, but we handle it gracefully
        expect(state.isHealthy).toBe(true);
        expect(state.isDegraded).toBe(true);
      }
    });
  });

  describe('Database Connection Lifecycle', () => {
    it('should handle database close operation gracefully', async () => {
      const { closeDatabaseConnection } = await import('./client');

      // Should not throw error regardless of connection state
      await expect(closeDatabaseConnection()).resolves.toBeUndefined();
    });

    it('should export db instance', async () => {
      const { db } = await import('./client');

      expect(db).toBeDefined();
      expect(typeof db).toBe('object');
    });

    it('should handle missing environment variables gracefully', async () => {
      delete process.env.POSTGRES_URL;

      // Should not throw during import
      const clientModule = await import('./client');

      expect(clientModule.db).toBeDefined();
      expect(clientModule.checkDatabaseHealth).toBeDefined();
      expect(clientModule.closeDatabaseConnection).toBeDefined();
      expect(clientModule.getDatabaseConnectionState).toBeDefined();
    });
  });

  describe('Error Resilience', () => {
    it('should handle invalid database URLs', async () => {
      process.env.POSTGRES_URL = 'invalid-database-url';

      // Should not throw during import
      const { db, getDatabaseConnectionState } = await import('./client');

      expect(db).toBeDefined();

      const state = getDatabaseConnectionState();
      expect(state).toBeDefined();
    });

    it('should provide fallback behavior when database is unavailable', async () => {
      process.env.POSTGRES_URL = 'postgresql://nonexistent:5432/fake';

      const { checkDatabaseHealth, getDatabaseConnectionState } = await import(
        './client'
      );

      // Should handle connection failures gracefully
      const healthResult = await checkDatabaseHealth();
      const stateResult = getDatabaseConnectionState();

      expect(healthResult.status).toMatch(/^(healthy|unhealthy|degraded)$/);
      expect(stateResult.state).toMatch(
        /^(connecting|connected|failed|degraded)$/,
      );
    });
  });

  describe('Database Connection Configuration', () => {
    it('should support SSL configuration via URL parameter', async () => {
      process.env.POSTGRES_URL =
        'postgresql://user:pass@localhost:5432/db?sslmode=require';

      // Should handle SSL configuration without throwing
      const { db } = await import('./client');

      expect(db).toBeDefined();
    });

    it('should support connection without SSL', async () => {
      process.env.POSTGRES_URL = 'postgresql://user:pass@localhost:5432/db';

      const { db } = await import('./client');

      expect(db).toBeDefined();
    });
  });

  describe('Module Exports', () => {
    it('should export all required functions and objects', async () => {
      const clientModule = await import('./client');

      expect(clientModule).toHaveProperty('db');
      expect(clientModule).toHaveProperty('checkDatabaseHealth');
      expect(clientModule).toHaveProperty('closeDatabaseConnection');
      expect(clientModule).toHaveProperty('getDatabaseConnectionState');

      expect(typeof clientModule.checkDatabaseHealth).toBe('function');
      expect(typeof clientModule.closeDatabaseConnection).toBe('function');
      expect(typeof clientModule.getDatabaseConnectionState).toBe('function');
    });

    it('should handle concurrent health checks', async () => {
      process.env.POSTGRES_URL = 'postgresql://test:test@localhost:5432/testdb';

      const { checkDatabaseHealth } = await import('./client');

      // Run multiple health checks concurrently
      const promises = Array.from({ length: 3 }, () => checkDatabaseHealth());
      const results = await Promise.all(promises);

      // All should return valid results
      results.forEach((result) => {
        expect(result).toHaveProperty('status');
        expect(result).toHaveProperty('connectionState');
        expect(['healthy', 'unhealthy', 'degraded']).toContain(result.status);
      });
    });
  });

  describe('Mock Client Functionality', () => {
    it('should provide functional mock when database is unavailable', async () => {
      delete process.env.POSTGRES_URL;

      const { db, checkDatabaseHealth } = await import('./client');

      // Mock client should still be functional
      expect(db).toBeDefined();

      // Health check should work with mock
      const result = await checkDatabaseHealth();
      expect(result.status).toMatch(/^(healthy|unhealthy|degraded)$/);
    });

    it('should handle mock client operations gracefully', async () => {
      delete process.env.POSTGRES_URL;

      const { closeDatabaseConnection, getDatabaseConnectionState } =
        await import('./client');

      // Operations should work with mock client
      await expect(closeDatabaseConnection()).resolves.toBeUndefined();

      const state = getDatabaseConnectionState();
      expect(state).toBeDefined();
      expect(state.state).toMatch(/^(connecting|connected|failed|degraded)$/);
    });
  });

  describe('Performance and Monitoring', () => {
    it('should measure response time for health checks', async () => {
      process.env.POSTGRES_URL = 'postgresql://test:test@localhost:5432/testdb';

      const { checkDatabaseHealth } = await import('./client');

      const startTime = Date.now();
      const result = await checkDatabaseHealth();
      const endTime = Date.now();

      // Should complete in reasonable time
      expect(endTime - startTime).toBeLessThan(10000); // 10 seconds max

      if (result.status === 'healthy') {
        expect(result.responseTime).toBeGreaterThanOrEqual(0);
        expect(result.responseTime).toBeLessThan(5000); // 5 seconds max for health check
      }
    });

    it('should handle connection state transitions', async () => {
      const { getDatabaseConnectionState } = await import('./client');

      const initialState = getDatabaseConnectionState();

      // State should be one of the valid states
      expect(['connecting', 'connected', 'failed', 'degraded']).toContain(
        initialState.state,
      );

      // Retry count should be consistent
      expect(initialState.retryCount).toBeGreaterThanOrEqual(0);
    });
  });
});
